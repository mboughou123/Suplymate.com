/**
 * Daily 2026-09-09 mill ids — 48 plants (14 prior + 34 HOLD36).
 * HOLD out: bonfiglioli (CGI) + usiminas (rail tank cars primary).
 * Prior 14 stay locked at the front of DAILY_20260909_SLUGS.
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

/** Prior sealed 3 + soft 11, plus HOLD36 OK 24 + soft 10 plant primaries. */
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
  "marcegaglia",
  "arvedi",
  "tubacero",
  "noksel",
  "cayirova",
  "npc",
  "rama",
  "choo-bee",
  "procarsa",
  "zenith",
  "vetropack",
  "elopak",
  "novelis",
  "constellium",
  "orora",
  "coveris",
  "kitz",
  "lincoln-electric",
  "esab",
  "howden",
  "lisi",
  "british-steel",
  "ternium",
  "rockwool",
  "alpla",
  "donaldson",
  "endress-hauser",
  "gates",
  "leoni",
  "nexteel",
  "sfs",
  "swagelok",
  "umran",
  "velan",
] as const;

export const DAILY_20260909_HOLD36_OK_SLUGS = [
  "arvedi",
  "british-steel",
  "cayirova",
  "choo-bee",
  "constellium",
  "coveris",
  "elopak",
  "esab",
  "howden",
  "kitz",
  "lincoln-electric",
  "lisi",
  "marcegaglia",
  "noksel",
  "novelis",
  "npc",
  "orora",
  "procarsa",
  "rama",
  "rockwool",
  "ternium",
  "tubacero",
  "vetropack",
  "zenith",
] as const;

export const DAILY_20260909_HOLD36_SOFT_SLUGS = [
  "alpla",
  "donaldson",
  "endress-hauser",
  "gates",
  "leoni",
  "nexteel",
  "sfs",
  "swagelok",
  "umran",
  "velan",
] as const;

/** HOLD36 researcher omissions — CGI / wrong-entity stills. */
export const DAILY_20260909_HOLD_SLUGS = ["bonfiglioli", "usiminas"] as const;

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

export type Daily20260909Slug = (typeof DAILY_20260909_SLUGS)[number];
