/**
 * Daily 2026-09-07 mill ids — sealed + soft + HOLD19 OK/SOFT (47).
 * Kept free of Node fs so client sort can import it.
 * Prefer the slug when unused by phase-1 / 09-02 / 09-03; otherwise
 * `daily-20260907-<slug>`. Remaining HOLD/blocked (shougang, stupp, interpipe)
 * are not in this list.
 */

import { PHASE1_SUPPLIER_IDS } from "@/lib/phase1";
import {
  DAILY_20260902_SLUGS,
  DAILY_20260902_SUPPLIER_IDS,
} from "@/lib/daily-2026-09-02-ids";
import {
  DAILY_20260903_SLUGS,
  DAILY_20260903_SUPPLIER_IDS,
} from "@/lib/daily-2026-09-03-ids";

export const DAILY_20260907_SLUGS = [
  "tubacex",
  "sappi",
  "ardagh",
  "oi-glass",
  "sandvik",
  "metso",
  "fanuc",
  "andritz",
  "sick",
  "phoenix-contact",
  "furukawa-electric",
  "thyssenkrupp",
  "nachi",
  "jfe-steel",
  "upm",
  "sika",
  "sig-group",
  "oji",
  "nippon-paper",
  "sealed-air",
  "emerson",
  "eaton",
  "alfalaval",
  "minebeamitsumi",
  "omron",
  "nabtesco",
  "us-steel",
  "ingersoll-rand",
  "dongkuk-steel",
  "yaskawa",
  "saint-gobain",
  "berg-pipe",
  "saudi-steel-pipe",
  "alleima",
  "webco",
  "corinth-pipeworks",
  "tpco",
  "encore-wire",
  "nkt",
  "pca",
  "flsmidth",
  "wartsila",
  "abb",
  "severstal",
  "mueller-industries",
  "american-spiralweld",
  "aptar",
] as const;

/** Remaining researcher HOLD / blocked — do not wire. */
export const DAILY_20260907_HOLD_SLUGS = [
  "shougang",
  "stupp",
  "interpipe",
] as const;

const RESERVED_IDS: ReadonlySet<string> = new Set<string>([
  ...PHASE1_SUPPLIER_IDS,
  ...DAILY_20260902_SUPPLIER_IDS,
  ...DAILY_20260902_SLUGS,
  ...DAILY_20260903_SUPPLIER_IDS,
  ...DAILY_20260903_SLUGS,
]);

export function dailySupplierIdForSlug20260907(slug: string): string {
  return RESERVED_IDS.has(slug) ? `daily-20260907-${slug}` : slug;
}

/** Alias matching the 09-02 helper name, scoped to this pack. */
export const dailySupplierIdForSlug = dailySupplierIdForSlug20260907;

export const DAILY_20260907_SUPPLIER_IDS: ReadonlySet<string> = new Set(
  DAILY_20260907_SLUGS.map(dailySupplierIdForSlug20260907),
);

export function isDaily20260907Supplier(
  supplier: { id: string } | string | null | undefined,
): boolean {
  if (!supplier) return false;
  const id = typeof supplier === "string" ? supplier : supplier.id;
  return DAILY_20260907_SUPPLIER_IDS.has(id);
}
