// Seal gate for pushed daily packs.
//
// Amine's rule: "Don't import a day until seals exist + Researcher OK." No
// machine-readable seal exists in the packs committed so far (the bot's commit
// messages call the Image-Enhancer output "sealed JPEGs", and there is no
// seals file), so this module defines the minimal contract the Grok machine
// writes as `seal.json` next to suppliers.json / products.json:
//
//   {
//     "day": "2026-09-02",
//     "researcherOk": true,
//     "approvedBy": "Researcher",
//     "approvedAt": "2026-09-02T19:40:00Z",
//     "sha256": { "suppliers.json": "<hex>", "products.json": "<hex>" },
//     "note": "optional free text"
//   }
//
// Accepted aliases (snake_case, `research_ok`, `ok`, `hashes`) keep the bot's
// prompt-generated JSON tolerant. Hashes are optional but, when present, MUST
// match the uploaded JSON bytes. A per-day ledger (MediaAuditLog rows with
// action "import_day", entityType "IMPORT_DAY") makes re-posting a completed
// day a no-op — no schema change needed.

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logMediaAudit } from "@/lib/media-store";

export type Seal = {
  day: string;
  researcherOk: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  sha256: Record<string, string>;
  note: string | null;
  /** SHA-256 of the canonical seal (day + hashes) — identifies a pack revision. */
  digest: string;
};

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sealRequired(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.IMPORT_REQUIRE_SEAL ?? "").trim().toLowerCase();
  if (!v) return true;
  return !["0", "false", "no", "off"].includes(v);
}

export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (/^(true|yes|ok|1|approved)$/i.test(v.trim())) return true;
    if (/^(false|no|0|rejected|pending)$/i.test(v.trim())) return false;
  }
  return null;
}

/** Parse a seal document (object or JSON string). Returns null when unusable. */
export function parseSeal(raw: unknown): Seal | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const o = obj as Record<string, unknown>;
  // Allow { seal: {…} } wrappers and a `seals` array with one entry per day.
  if (o.seal && typeof o.seal === "object") return parseSeal(o.seal);
  if (Array.isArray(o.seals) && o.seals.length === 1) return parseSeal(o.seals[0]);

  const day = str(o.day) ?? str(o.date) ?? str(o.pack_day);
  if (!day || !DAY_RE.test(day)) return null;
  const ok = bool(o.researcherOk) ?? bool(o.researcher_ok) ?? bool(o.research_ok) ?? bool(o.researcher) ?? bool(o.ok) ?? bool(o.approved) ?? false;

  const hashesRaw = (o.sha256 ?? o.hashes ?? o.files ?? {}) as unknown;
  const sha256: Record<string, string> = {};
  if (hashesRaw && typeof hashesRaw === "object" && !Array.isArray(hashesRaw)) {
    for (const [k, v] of Object.entries(hashesRaw as Record<string, unknown>)) {
      const hex = typeof v === "string" ? v : v && typeof v === "object" ? str((v as Record<string, unknown>).sha256) : null;
      if (hex && /^[a-f0-9]{64}$/i.test(hex.trim())) sha256[k.replace(/^\.?\//, "")] = hex.trim().toLowerCase();
    }
  }

  const canonical = JSON.stringify({ day, sha256: Object.fromEntries(Object.entries(sha256).sort()) });
  return {
    day,
    researcherOk: ok,
    approvedBy: str(o.approvedBy) ?? str(o.approved_by) ?? str(o.researcher_name) ?? null,
    approvedAt: str(o.approvedAt) ?? str(o.approved_at) ?? str(o.sealed_at) ?? null,
    sha256,
    note: str(o.note) ?? str(o.notes) ?? str(o.comment) ?? null,
    digest: sha256Hex(canonical),
  };
}

export type SealCheck = { ok: true; seal: Seal } | { ok: false; reason: string; seal: Seal | null };

/**
 * Verify a seal against the pushed day and the uploaded JSON files
 * (`name → bytes`, e.g. { "suppliers.json": Buffer }).
 */
export function verifySeal(
  raw: unknown,
  ctx: { day: string | null; files: Record<string, Buffer | string | undefined> }
): SealCheck {
  const seal = parseSeal(raw);
  if (!seal) return { ok: false, reason: "seal missing or malformed (need { day, researcherOk, sha256? })", seal: null };
  if (!seal.researcherOk) return { ok: false, reason: `seal for ${seal.day} is not Researcher-approved (researcherOk=false)`, seal };
  if (ctx.day && ctx.day !== seal.day) return { ok: false, reason: `seal day ${seal.day} does not match pushed day ${ctx.day}`, seal };
  for (const [name, expected] of Object.entries(seal.sha256)) {
    const data = ctx.files[name];
    if (data == null) continue; // file not part of this chunk — checked when it is
    const actual = sha256Hex(typeof data === "string" ? Buffer.from(data, "utf8") : data);
    if (actual !== expected) return { ok: false, reason: `sha256 mismatch for ${name}`, seal };
  }
  return { ok: true, seal };
}

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
