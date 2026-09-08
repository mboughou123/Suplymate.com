/**
 * Daily 2026-09-08 mill ids — PARTIAL pack (sealed 7 + soft 17 = 24).
 * HOLD 26 stay unwired.
 * Kept free of Node fs so client sort can import it.
 * Prefer the slug when unused by phase-1 / 09-02 / 09-03 / 09-07; otherwise
 * `daily-20260908-<slug>`.
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

/** Sealed 7 + soft HQ/campus 17. */
export const DAILY_20260908_SLUGS = [
  "butting",
  "dura-bond",
  "chelpipe",
  "verallia",
  "oriental-motor",
  "algoma",
  "knauf",
  "schneider-electric",
  "siemens",
  "rockwell-automation",
  "honeywell",
  "spirax-sarco",
  "komatsu",
  "caterpillar",
  "acerinox",
  "putzmeister",
  "liebherr",
  "rotork",
  "hitachi-cm",
  "carpenter",
  "nlmk",
  "sumitomo-electric",
  "owens-corning",
  "aperam",
] as const;

/** Researcher HOLD / blocked — not wired this pack. */
export const DAILY_20260908_HOLD_SLUGS = [
  "eew",
  "eisenbau-kramer",
  "hengyang-valin",
  "changbao",
  "panyu-chu-kong",
  "borusan-mannesmann",
  "erciyas",
  "toscelik",
  "cangzhou-spiral",
  "vidrala",
  "gerresheimer",
  "can-pack",
  "mayr-melnhof",
  "constantia-flexibles",
  "rengo",
  "nine-dragons",
  "schuetz",
  "mauser",
  "volvo-ce",
  "misumi",
  "nvent",
  "legrand",
  "harmonic-drive",
  "fujikura",
  "belden",
  "rittal",
] as const;

const RESERVED_IDS: ReadonlySet<string> = new Set<string>([
  ...PHASE1_SUPPLIER_IDS,
  ...DAILY_20260902_SUPPLIER_IDS,
  ...DAILY_20260902_SLUGS,
  ...DAILY_20260903_SUPPLIER_IDS,
  ...DAILY_20260903_SLUGS,
  ...DAILY_20260907_SUPPLIER_IDS,
  ...DAILY_20260907_SLUGS,
]);

export function dailySupplierIdForSlug20260908(slug: string): string {
  return RESERVED_IDS.has(slug) ? `daily-20260908-${slug}` : slug;
}

/** Alias matching the 09-02 helper name, scoped to this pack. */
export const dailySupplierIdForSlug = dailySupplierIdForSlug20260908;

export const DAILY_20260908_SUPPLIER_IDS: ReadonlySet<string> = new Set(
  DAILY_20260908_SLUGS.map(dailySupplierIdForSlug20260908),
);

export function isDaily20260908Supplier(
  supplier: { id: string } | string | null | undefined,
): boolean {
  if (!supplier) return false;
  const id = typeof supplier === "string" ? supplier : supplier.id;
  return DAILY_20260908_SUPPLIER_IDS.has(id);
}
