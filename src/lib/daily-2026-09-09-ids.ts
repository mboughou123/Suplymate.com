/**
 * Daily 2026-09-09 mill ids — 14 mills (sealed 3 + soft 11).
 * HOLD 36 remain out (wrong-entity / poisoned stills).
 * Kept free of Node fs so client sort can import it.
 * Prefer the slug when unused by phase-1 / 09-02 / 09-03 / 09-07 / 09-08;
 * otherwise `daily-20260909-<slug>`.
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
import {
  DAILY_20260907_SLUGS,
  DAILY_20260907_SUPPLIER_IDS,
} from "@/lib/daily-2026-09-07-ids";
import {
  DAILY_20260908_SLUGS,
  DAILY_20260908_SUPPLIER_IDS,
} from "@/lib/daily-2026-09-08-ids";

/** Sealed 3 + soft HQ/campus/archive 11. */
export const DAILY_20260909_SLUGS = [
  "pepperl-fuchs",
  "sew-eurodrive",
  "daido-steel",
  "toyo-seikan",
  "billerud",
  "greatview",
  "kaeser",
  "gea",
  "yokogawa",
  "wittenstein",
  "kobe-steel",
  "helukabel",
  "lapp",
  "james-hardie",
] as const;

/** Researcher HOLD — do not wire mill cards. */
export const DAILY_20260909_HOLD_SLUGS = [
  "marcegaglia",
  "arvedi",
  "tubacero",
  "umran",
  "noksel",
  "cayirova",
  "npc",
  "rama",
  "choo-bee",
  "procarsa",
  "zenith",
  "nexteel",
  "vetropack",
  "elopak",
  "alpla",
  "novelis",
  "constellium",
  "orora",
  "coveris",
  "kitz",
  "velan",
  "swagelok",
  "endress-hauser",
  "lincoln-electric",
  "esab",
  "donaldson",
  "howden",
  "bonfiglioli",
  "gates",
  "sfs",
  "lisi",
  "british-steel",
  "ternium",
  "usiminas",
  "leoni",
  "rockwool",
] as const;

const RESERVED_IDS: ReadonlySet<string> = new Set<string>([
  ...PHASE1_SUPPLIER_IDS,
  ...DAILY_20260902_SUPPLIER_IDS,
  ...DAILY_20260902_SLUGS,
  ...DAILY_20260903_SUPPLIER_IDS,
  ...DAILY_20260903_SLUGS,
  ...DAILY_20260907_SUPPLIER_IDS,
  ...DAILY_20260907_SLUGS,
  ...DAILY_20260908_SUPPLIER_IDS,
  ...DAILY_20260908_SLUGS,
]);

export function dailySupplierIdForSlug20260909(slug: string): string {
  return RESERVED_IDS.has(slug) ? `daily-20260909-${slug}` : slug;
}

/** Alias matching the 09-02 helper name, scoped to this pack. */
export const dailySupplierIdForSlug = dailySupplierIdForSlug20260909;

export const DAILY_20260909_SUPPLIER_IDS: ReadonlySet<string> = new Set(
  DAILY_20260909_SLUGS.map(dailySupplierIdForSlug20260909),
);

export function isDaily20260909Supplier(
  supplier: { id: string } | string | null | undefined,
): boolean {
  if (!supplier) return false;
  const id = typeof supplier === "string" ? supplier : supplier.id;
  return DAILY_20260909_SUPPLIER_IDS.has(id);
}
