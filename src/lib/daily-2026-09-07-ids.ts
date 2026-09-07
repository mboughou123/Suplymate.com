/**
 * Daily 2026-09-07 partial mill ids — sealed + soft only (31).
 * Kept free of Node fs so client sort can import it.
 * Prefer the slug when unused by phase-1 / 09-02 / 09-03; otherwise
 * `daily-20260907-<slug>`. HOLD 19 are not in this list.
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
] as const;

/** Researcher HOLD slugs — do not wire. */
export const DAILY_20260907_HOLD_SLUGS = [
  "berg-pipe",
  "mueller-industries",
  "saudi-steel-pipe",
  "stupp",
  "alleima",
  "webco",
  "interpipe",
  "corinth-pipeworks",
  "american-spiralweld",
  "tpco",
  "aptar",
  "encore-wire",
  "flsmidth",
  "wartsila",
  "abb",
  "shougang",
  "severstal",
  "nkt",
  "pca",
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
