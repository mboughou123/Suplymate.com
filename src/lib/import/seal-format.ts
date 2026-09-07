// Seal document: parsing, verification and discovery helpers. Pure — no
// database, so the Grok-machine CLI (push-client.ts) and the GitHub source can
// import it without pulling in Prisma. The per-day ledger lives in seal.ts.
//
// Amine's rule: "Don't import a day until seals exist + Researcher OK." The
// packs committed so far carry NO machine-readable seal (see docs/daily-import.md
// → "What the bot branch actually contains"), so this is the contract the Grok
// machine writes — as `seal.json` / `seals.json` in the day folder or as any
// `*.json` inside a `_…/` directory (`_seals/`, `_qa/`, `_research/`):
//
//   {
//     "day": "2026-09-03",
//     "researcherOk": true,
//     "approvedBy": "Researcher",
//     "approvedAt": "2026-09-03T17:05:00Z",
//     "sha256": { "suppliers.json": "<hex>", "products.json": "<hex>" },
//     "sealed": ["posco", "jiuli", …],                     // optional mill-seal allowlist
//     "hold": ["bossard", { "key": "ball|ball-aluminum-aerosol-cans", "reason": "…" }],
//     "note": "optional free text"
//   }
//
// `sealed` (aliases: suppliers, allowlist, millSeal, …) lists the suppliers the
// seal covers — ids, slugs or names. When present, ONLY those suppliers (and
// their products / media) are imported. `hold` (aliases: softHold, excluded,
// qaHolds, …) lists suppliers or `supplier|product` keys that must stay out —
// the shape the bot's own code uses for Research-QA holds
// (`DAILY_20260903_QA_HELD_KEYS`, `supplier_slug_guess|product_slug`).
// Without either list everything in the pack passes.
//
// Accepted aliases (snake_case, `research_ok`, `ok`, `hashes`) keep the bot's
// prompt-generated JSON tolerant. Hashes are optional but, when present, MUST
// match the uploaded JSON bytes.

import { createHash } from "node:crypto";

export type HoldEntry = {
  /** Supplier id / slug / name, or `supplier|product` for a single SKU. */
  key: string;
  reason: string | null;
};

export type Seal = {
  day: string;
  researcherOk: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  sha256: Record<string, string>;
  /** Mill-seal allowlist (ids / slugs / names). Empty = everything passes. */
  sealed: string[];
  /** HOLD / soft-hold entries — never imported. */
  held: HoldEntry[];
  note: string | null;
  /** SHA-256 of the canonical seal (day + hashes + lists) — identifies a pack revision. */
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

const ALLOWLIST_KEYS = [
  "sealed",
  "suppliers",
  "sealedSuppliers",
  "sealed_suppliers",
  "allowlist",
  "allow",
  "millSeal",
  "mill_seal",
  "mills",
  "approvedSuppliers",
  "approved_suppliers",
  "approved",
];

const HOLD_KEYS = [
  "hold",
  "holds",
  "held",
  "softHold",
  "soft_hold",
  "softHolds",
  "soft_holds",
  "excluded",
  "exclude",
  "exclusions",
  "qaHolds",
  "qa_holds",
  "qa_held_keys",
  "heldSuppliers",
  "held_suppliers",
  "heldProducts",
  "held_products",
  "rejected",
];

/** Canonical key string for an allowlist / hold entry (object or string). */
function entryKey(e: unknown): string | null {
  if (typeof e === "string") return str(e);
  if (!e || typeof e !== "object") return null;
  const o = e as Record<string, unknown>;
  const sup =
    str(o.key) ??
    str(o.id) ??
    str(o.slug) ??
    str(o.supplier) ??
    str(o.supplier_slug) ??
    str(o.supplierSlug) ??
    str(o.supplier_id) ??
    str(o.supplierId) ??
    str(o.name) ??
    str(o.company_name);
  if (!sup) return null;
  const prod = str(o.product) ?? str(o.product_slug) ?? str(o.productSlug) ?? str(o.sku);
  return prod && !sup.includes("|") ? `${sup}|${prod}` : sup;
}

function entryReason(e: unknown, fallback: string | null): string | null {
  if (!e || typeof e !== "object") return fallback;
  const o = e as Record<string, unknown>;
  return str(o.reason) ?? str(o.note) ?? str(o.why) ?? str(o.status) ?? fallback;
}

/** Accept `["a", {…}]`, `{ "a": "reason" | true }` or a `|`/newline/comma-separated string. */
function listOf(raw: unknown, defaultReason: string | null): HoldEntry[] {
  const out: HoldEntry[] = [];
  const push = (key: string | null, reason: string | null) => {
    if (key && !out.some((x) => x.key === key)) out.push({ key, reason });
  };
  if (typeof raw === "string") {
    for (const part of raw.split(/[\n,;]+/)) push(str(part), defaultReason);
  } else if (Array.isArray(raw)) {
    for (const e of raw) push(entryKey(e), entryReason(e, defaultReason));
  } else if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v === false || v === null) continue;
      push(str(k), typeof v === "string" ? str(v) : entryReason(v, defaultReason));
    }
  }
  return out;
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
  const ok =
    bool(o.researcherOk) ??
    bool(o.researcher_ok) ??
    bool(o.research_ok) ??
    bool(o.researcher) ??
    bool(o.ok) ??
    (Array.isArray(o.approved) ? null : bool(o.approved)) ??
    false;

  const hashesRaw = (o.sha256 ?? o.hashes ?? o.files ?? {}) as unknown;
  const sha256: Record<string, string> = {};
  if (hashesRaw && typeof hashesRaw === "object" && !Array.isArray(hashesRaw)) {
    for (const [k, v] of Object.entries(hashesRaw as Record<string, unknown>)) {
      const hex = typeof v === "string" ? v : v && typeof v === "object" ? str((v as Record<string, unknown>).sha256) : null;
      if (hex && /^[a-f0-9]{64}$/i.test(hex.trim())) sha256[k.replace(/^\.?\//, "")] = hex.trim().toLowerCase();
    }
  }

  const sealed: string[] = [];
  for (const k of ALLOWLIST_KEYS) {
    const v = o[k];
    // `approved` doubles as the boolean alias above — only a list counts here.
    if (v == null || typeof v === "boolean") continue;
    for (const e of listOf(v, null)) if (!sealed.includes(e.key)) sealed.push(e.key);
  }
  const held: HoldEntry[] = [];
  for (const k of HOLD_KEYS) {
    const v = o[k];
    if (v == null || typeof v === "boolean") continue;
    const soft = /soft/i.test(k);
    for (const e of listOf(v, soft ? "soft-hold" : "hold")) if (!held.some((h) => h.key === e.key)) held.push(e);
  }

  const canonical = JSON.stringify({
    day,
    sha256: Object.fromEntries(Object.entries(sha256).sort()),
    ...(sealed.length ? { sealed: [...sealed].sort() } : {}),
    ...(held.length ? { held: held.map((h) => h.key).sort() } : {}),
  });
  return {
    day,
    researcherOk: ok,
    approvedBy: str(o.approvedBy) ?? str(o.approved_by) ?? str(o.researcher_name) ?? null,
    approvedAt: str(o.approvedAt) ?? str(o.approved_at) ?? str(o.sealed_at) ?? null,
    sha256,
    sealed,
    held,
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
/* Discovery                                                           */
/* ------------------------------------------------------------------ */

/**
 * Could this pack-relative path hold a seal? `seal.json`, `seals.json`,
 * anything under `seals/` or under a directory whose name starts with `_`
 * (`_seals/`, `_qa/`, `_research/`…), or a JSON whose name mentions
 * seal / research / qa / approv.
 */
export function isSealCandidatePath(path: string): boolean {
  const p = path.replace(/\\/g, "/").replace(/^\.?\//, "");
  if (!/\.json$/i.test(p)) return false;
  const segs = p.split("/");
  const base = segs.pop() ?? "";
  if (/^seals?(\.json)?$/i.test(base) || /seal/i.test(base)) return true;
  if (segs.some((s) => s.startsWith("_") || /^seals$/i.test(s))) return true;
  return /research|qa|approv|hold/i.test(base);
}

/**
 * Choose one seal among several candidate documents (raw JSON text / objects):
 * the one for `day` when known, otherwise the first that parses. Returns the
 * raw candidate so the caller can re-verify it.
 */
export function pickSeal<T>(candidates: T[], day: string | null): T | null {
  let first: T | null = null;
  for (const c of candidates) {
    if (c == null) continue;
    const s = parseSeal(c);
    if (!s) continue;
    if (day && s.day === day) return c;
    if (!day) return c;
    first ??= c;
  }
  return first;
}
