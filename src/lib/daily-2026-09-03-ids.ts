/**
 * Daily 2026-09-03 morning mill ids — kept free of Node fs so client sort can import it.
 * Prefer the slug when it is unused by phase-1 / 2026-09-02; otherwise
 * `daily-20260903-<slug>` so the packs cannot collide.
 */

import { PHASE1_SUPPLIER_IDS } from "@/lib/phase1";
import {
  DAILY_20260902_SLUGS,
  DAILY_20260902_SUPPLIER_IDS,
} from "@/lib/daily-2026-09-02-ids";

export const DAILY_20260903_SLUGS = [
  "tmk",
  "seah-steel",
  "benteler-steel-tube",
  "maruichi-steel-tube",
  "maharashtra-seamless",
  "ismt",
  "zekelman",
  "northwest-pipe",
  "acipco",
  "surya-roshni",
  "goodluck-india",
  "husteel",
  "smurfit-westrock",
  "international-paper",
  "ds-smith",
  "crown-holdings",
  "silgan",
  "berry-global",
  "sonoco",
  "graphic-packaging",
  "cascades",
  "stora-enso",
  "grundfos",
  "sulzer",
  "ebara",
  "weir-group",
  "xylem",
  "danfoss",
  "atlas-copco",
  "parker-hannifin",
  "festo",
  "smc-corporation",
  "bosch-rexroth",
  "schaeffler",
  "ntn",
  "jtekt",
  "thk",
  "hiwin",
  "igus",
  "contitech",
  "habasit",
  "bossard",
  "china-baowu",
  "hbis",
  "ansteel",
  "cleveland-cliffs",
  "steel-dynamics",
  "southwire",
  "elsewedy-electric",
  "kirby-building-systems",
] as const;

const RESERVED_IDS: ReadonlySet<string> = new Set<string>([
  ...PHASE1_SUPPLIER_IDS,
  ...DAILY_20260902_SUPPLIER_IDS,
  ...DAILY_20260902_SLUGS,
]);

export function dailySupplierIdForSlug20260903(slug: string): string {
  return RESERVED_IDS.has(slug) ? `daily-20260903-${slug}` : slug;
}

export const DAILY_20260903_SUPPLIER_IDS: ReadonlySet<string> = new Set(
  DAILY_20260903_SLUGS.map(dailySupplierIdForSlug20260903),
);

export function isDaily20260903Supplier(
  supplier: { id: string } | string | null | undefined,
): boolean {
  if (!supplier) return false;
  const id = typeof supplier === "string" ? supplier : supplier.id;
  return DAILY_20260903_SUPPLIER_IDS.has(id);
}
