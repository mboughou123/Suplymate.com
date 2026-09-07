// HOLD / soft-hold / mill-seal allowlist.
//
// From the Grok bot room: "HOLD / soft-hold identity (e.g. Bossard) stay out of
// mill-seal" — the seal covers a subset of the pack. Three signals keep a
// record out of the import, none of them ever written to the database:
//
//   1. Seal allowlist (`sealed` / `suppliers` / …): when present, only those
//      suppliers — and their products / media — are imported.
//   2. Seal hold list (`hold` / `softHold` / `excluded` / …): supplier keys or
//      `supplier|product` keys (the shape the bot's own code uses for Research
//      QA holds, e.g. "ball|ball-aluminum-aerosol-cans", or a bare supplier
//      slug that holds every SKU of that mill, e.g. "jiuli").
//   3. Per-record flags inside suppliers.json / products.json. The packs
//      committed so far carry none (Bossard's soft-hold is prose in the bot's
//      site code), so the accepted names are the obvious ones:
//        status: "HOLD" | "hold" | "soft-hold" | "held" | "excluded" | "rejected"
//        hold: true | "<reason>"      soft_hold / softHold: true
//        identity: "soft-hold" (any value containing "hold")
//        qa_status / qa / review_status / seal_status: "hold" | "held" | "rejected"
//        mill_seal: false   sealed: false   researcher_ok / research_ok: false
//
// Everything held is reported in the run summary as `held: [...]`.

import { slugifySupplierId } from "@/lib/suppliers-store";
import { normKey } from "@/lib/supplier-normalize";
import type { ImportPack, PackProduct, PackSupplier } from "./pack-formats";
import type { Seal } from "./seal-format";

export type HeldEntry = {
  kind: "supplier" | "product";
  /** Pack external id (supplier slug / product external id). */
  id: string;
  name: string;
  /** For suppliers: the pack slug; for products: `supplier|product`. */
  key: string;
  reason: string;
  source: "record" | "seal" | "allowlist" | "supplier";
  /** Suppliers only: how many of the pack's products went down with it. */
  products?: number;
};

const HOLD_WORD = /(^|[^a-z])(hold|held|soft[-_ ]?hold|excluded?|reject(ed)?)([^a-z]|$)/i;
const STATUS_FIELDS = ["status", "qa_status", "qaStatus", "qa", "review_status", "reviewStatus", "seal_status", "sealStatus", "identity", "identity_status", "identityStatus", "research_status"];

function truthyFlag(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === "string") return v.trim() !== "" && !/^(false|no|0|off)$/i.test(v.trim());
  return false;
}

/** Reason string when a raw pack record flags itself as HOLD, else null. */
export function recordHoldReason(rec: Record<string, unknown> | null | undefined): string | null {
  if (!rec || typeof rec !== "object") return null;
  for (const k of ["hold", "on_hold", "onHold", "held"]) {
    const v = rec[k];
    if (truthyFlag(v)) return typeof v === "string" ? `hold: ${v.trim()}` : "hold";
  }
  for (const k of ["soft_hold", "softHold", "soft-hold"]) {
    const v = rec[k];
    if (truthyFlag(v)) return typeof v === "string" ? `soft-hold: ${v.trim()}` : "soft-hold";
  }
  for (const k of STATUS_FIELDS) {
    const v = rec[k];
    if (typeof v === "string" && HOLD_WORD.test(v)) return `${k}: ${v.trim()}`;
  }
  if (rec.excluded === true || rec.exclude === true) return "excluded";
  for (const k of ["mill_seal", "millSeal", "sealed", "researcher_ok", "researcherOk", "research_ok", "qa_ok", "qaOk"]) {
    if (rec[k] === false) return `${k}: false`;
  }
  const reason = rec.hold_reason ?? rec.holdReason;
  if (typeof reason === "string" && reason.trim()) return `hold: ${reason.trim()}`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Key matching                                                        */
/* ------------------------------------------------------------------ */

function slugKey(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function supplierMatches(entry: string, s: { externalId: string; name: string }): boolean {
  const e = entry.trim();
  if (!e) return false;
  if (e === s.externalId) return true;
  if (slugifySupplierId(e) === s.externalId || slugKey(e) === slugKey(s.externalId)) return true;
  const nk = normKey(e);
  return Boolean(nk && nk === normKey(s.name));
}

function productMatches(entry: string, p: PackProduct): boolean {
  const bar = entry.indexOf("|");
  if (bar < 0) return false;
  const sup = entry.slice(0, bar).trim();
  const prod = entry.slice(bar + 1).trim();
  if (!prod) return false;
  const supOk = sup === "*" || supplierMatches(sup, { externalId: p.supplierExternalId, name: p.supplierName });
  if (!supOk) return false;
  const pk = slugKey(prod);
  return pk === slugKey(p.slug) || pk === slugKey(p.name) || prod === p.externalId || normKey(prod) === normKey(p.name);
}

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

export type HoldResult = { pack: ImportPack; held: HeldEntry[] };

/**
 * Drop held suppliers / products from the pack and report them. Seal lists are
 * only consulted when a seal is given; per-record flags always apply.
 */
export function applyHolds(pack: ImportPack, seal: Seal | null | undefined): HoldResult {
  const held: HeldEntry[] = [];
  const allow = seal?.sealed ?? [];
  const holds = seal?.held ?? [];
  const supplierHolds = holds.filter((h) => !h.key.includes("|"));
  const productHolds = holds.filter((h) => h.key.includes("|"));

  const heldSupplierIds = new Map<string, HeldEntry>();
  const suppliers: PackSupplier[] = [];
  for (const s of pack.suppliers) {
    const who = { externalId: s.externalId, name: s.input.name };
    let entry: HeldEntry | null = null;
    if (s.hold) entry = { kind: "supplier", id: s.externalId, name: s.input.name, key: s.externalId, reason: s.hold, source: "record" };
    else {
      const h = supplierHolds.find((x) => supplierMatches(x.key, who));
      if (h) entry = { kind: "supplier", id: s.externalId, name: s.input.name, key: s.externalId, reason: h.reason ?? "hold", source: "seal" };
      else if (allow.length && !allow.some((a) => !a.includes("|") && supplierMatches(a, who))) {
        entry = { kind: "supplier", id: s.externalId, name: s.input.name, key: s.externalId, reason: "not in mill-seal allowlist", source: "allowlist" };
      }
    }
    if (entry) {
      entry.products = 0;
      heldSupplierIds.set(s.externalId, entry);
      held.push(entry);
    } else suppliers.push(s);
  }

  const products: PackProduct[] = [];
  for (const p of pack.products) {
    const key = `${p.supplierExternalId}|${p.slug}`;
    const base = { kind: "product" as const, id: p.externalId, name: p.name, key };
    const owner = heldSupplierIds.get(p.supplierExternalId) ?? [...heldSupplierIds.values()].find((h) => supplierMatches(h.key, { externalId: p.supplierExternalId, name: p.supplierName }));
    if (owner) {
      owner.products = (owner.products ?? 0) + 1;
      held.push({ ...base, reason: `supplier held (${owner.reason})`, source: "supplier" });
      continue;
    }
    if (p.hold) {
      held.push({ ...base, reason: p.hold, source: "record" });
      continue;
    }
    const h = productHolds.find((x) => productMatches(x.key, p)) ?? supplierHolds.find((x) => supplierMatches(x.key, { externalId: p.supplierExternalId, name: p.supplierName }));
    if (h) {
      held.push({ ...base, reason: h.reason ?? "hold", source: "seal" });
      continue;
    }
    if (allow.length) {
      const inPack = suppliers.some((s) => s.externalId === p.supplierExternalId);
      const allowed = inPack || allow.some((a) => !a.includes("|") && supplierMatches(a, { externalId: p.supplierExternalId, name: p.supplierName }));
      if (!allowed) {
        held.push({ ...base, reason: "supplier not in mill-seal allowlist", source: "allowlist" });
        continue;
      }
    }
    products.push(p);
  }

  if (!held.length) return { pack, held };
  return { pack: { ...pack, suppliers, products }, held };
}
