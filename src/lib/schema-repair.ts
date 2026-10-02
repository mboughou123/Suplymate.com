import type { PrismaClient } from "@prisma/client";
import { SCHEMA_REPAIR_STATEMENTS, SCHEMA_TABLES } from "@/lib/schema-repair.generated";

export type SchemaDrift = { missingTables: string[]; missingColumns: string[] };

/**
 * Preview deployments share the production database but may run an older or
 * newer schema, so only production (or a non-Vercel server) may change it.
 */
export function schemaRepairAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.SCHEMA_SELF_HEAL === "0") return false;
  return !env.VERCEL_ENV || env.VERCEL_ENV === "production";
}

export async function detectSchemaDrift(db: PrismaClient): Promise<SchemaDrift> {
  const rows = await db.$queryRawUnsafe<{ table_name: string; column_name: string }[]>(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()",
  );
  const present = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));
  const presentTables = new Set(rows.map((r) => r.table_name));
  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  for (const [table, columns] of Object.entries(SCHEMA_TABLES)) {
    if (!presentTables.has(table)) {
      missingTables.push(table);
      continue;
    }
    for (const column of columns) {
      if (!present.has(`${table}.${column}`)) missingColumns.push(`${table}.${column}`);
    }
  }
  return { missingTables, missingColumns };
}

/** Additive only: every statement is idempotent and swallows its own errors. */
export async function repairSchema(db: PrismaClient): Promise<SchemaDrift> {
  for (const statement of SCHEMA_REPAIR_STATEMENTS) {
    await db.$executeRawUnsafe(statement);
  }
  return detectSchemaDrift(db);
}

let pending: Promise<SchemaDrift | null> | null = null;
let inFlight = false;
let lastForcedAt = 0;
const FORCED_RETRY_AFTER_MS = 60_000;

/**
 * The unforced check runs once per server instance; a forced repair (after a
 * query hit a missing column) runs at most once per minute. Concurrent callers
 * share the in-flight run. Never throws.
 */
export function ensureSchema(db: PrismaClient, { force = false } = {}): Promise<SchemaDrift | null> {
  if (!schemaRepairAllowed()) return Promise.resolve(null);
  if (pending && (inFlight || !force || Date.now() - lastForcedAt < FORCED_RETRY_AFTER_MS)) return pending;
  if (force) lastForcedAt = Date.now();
  inFlight = true;
  pending = (async () => {
    try {
      const drift = await detectSchemaDrift(db);
      if (!force && drift.missingTables.length === 0 && drift.missingColumns.length === 0) return drift;
      const after = await repairSchema(db);
      const left = after.missingTables.length + after.missingColumns.length;
      if (left > 0) {
        console.error("[schema-repair] still missing after repair:", after);
      } else {
        console.log("[schema-repair] database schema repaired");
      }
      return after;
    } catch (err) {
      console.error("[schema-repair] failed:", err instanceof Error ? err.message : err);
      return null;
    } finally {
      inFlight = false;
    }
  })();
  return pending;
}
