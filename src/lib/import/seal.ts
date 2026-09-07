// Seal gate for daily packs — server side.
//
// Parsing / verification / discovery live in seal-format.ts (pure, shared with
// the Grok-machine CLI and the GitHub source); this module adds the per-day
// ledger: MediaAuditLog rows (action "import_day", entityType "IMPORT_DAY")
// make re-posting a completed day a no-op — no schema change needed.

import { prisma } from "@/lib/prisma";
import { logMediaAudit } from "@/lib/media-store";

export {
  DAY_RE,
  isSealCandidatePath,
  parseSeal,
  pickSeal,
  sealRequired,
  sha256Hex,
  verifySeal,
  type HoldEntry,
  type Seal,
  type SealCheck,
} from "./seal-format";

/* ------------------------------------------------------------------ */
/* Per-day ledger                                                      */
/* ------------------------------------------------------------------ */

export const LEDGER_ACTION = "import_day";
export const LEDGER_ENTITY = "IMPORT_DAY";

export type LedgerPart = { digest: string; part: number; of: number; actor: string | null; at: string };

// In-memory mirror so a server without a database (or a DB hiccup) still
// refuses to re-import the same day within the instance's lifetime.
const memory = new Map<string, LedgerPart[]>();

async function loadParts(day: string): Promise<LedgerPart[]> {
  const parts = [...(memory.get(day) ?? [])];
  try {
    const rows = await prisma.mediaAuditLog.findMany({
      where: { action: LEDGER_ACTION, entityType: LEDGER_ENTITY, entityId: day },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    for (const r of rows) {
      try {
        const d = JSON.parse(r.detail ?? "{}") as Partial<LedgerPart>;
        if (typeof d.digest === "string" && typeof d.part === "number" && typeof d.of === "number") {
          parts.push({ digest: d.digest, part: d.part, of: d.of, actor: r.adminUser ?? null, at: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt) });
        }
      } catch {
        // ignore malformed rows
      }
    }
  } catch {
    // no DB — memory only
  }
  return parts;
}

export type DayStatus = {
  day: string;
  digest: string;
  /** Chunks already imported for this pack revision. */
  partsDone: number[];
  of: number | null;
  complete: boolean;
  lastImportedAt: string | null;
};

/** What has already been imported for `day` at this pack revision (`digest`). */
export async function dayStatus(day: string, digest: string): Promise<DayStatus> {
  const parts = (await loadParts(day)).filter((p) => p.digest === digest);
  const done = [...new Set(parts.map((p) => p.part))].sort((a, b) => a - b);
  const of = parts.length ? Math.max(...parts.map((p) => p.of)) : null;
  const complete = of != null && done.length >= of && Array.from({ length: of }, (_, i) => i + 1).every((n) => done.includes(n));
  const lastImportedAt = parts.length ? parts.map((p) => p.at).sort().pop()! : null;
  return { day, digest, partsDone: done, of, complete, lastImportedAt };
}

/** Record that chunk `part/of` of `day` (revision `digest`) was imported. */
export async function recordDayPart(entry: {
  day: string;
  digest: string;
  part: number;
  of: number;
  actor: string | null;
  summary?: Record<string, unknown>;
}): Promise<void> {
  const rec: LedgerPart = { digest: entry.digest, part: entry.part, of: entry.of, actor: entry.actor, at: new Date().toISOString() };
  const list = memory.get(entry.day) ?? [];
  list.push(rec);
  memory.set(entry.day, list);
  await logMediaAudit({
    adminUser: entry.actor,
    action: LEDGER_ACTION,
    entityType: LEDGER_ENTITY,
    entityId: entry.day,
    detail: { digest: entry.digest, part: entry.part, of: entry.of, ...(entry.summary ?? {}) },
  }).catch(() => undefined);
}

/** Test hook. */
export function resetLedgerMemory(): void {
  memory.clear();
}
