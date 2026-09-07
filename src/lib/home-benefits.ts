/**
 * Homepage "outcomes" band data. Every figure is either derived from data we
 * ship (supplier dataset, material catalog) or a product rule that exists in
 * code, so nothing here is a marketing estimate.
 *
 * Framework-free so it can be unit-tested.
 */
import type { Supplier } from "@/data/suppliers";

export type HomeBenefitKey = "heldFunds" | "countries" | "materials" | "guestQuestions" | "alwaysOn";

export type HomeBenefit = {
  key: HomeBenefitKey;
  /** Animated numeric portion; `null` when the figure is a fixed string. */
  value: number | null;
  prefix?: string;
  suffix?: string;
  /** Fixed display used when `value` is null (e.g. "24/7"). */
  display?: string;
};

/**
 * Mirrors `GUEST_QUESTION_LIMIT` in `src/app/api/ai/route.ts` (free questions a
 * signed-out visitor can ask Mate per day). Kept as a literal so the homepage
 * never imports a route handler.
 */
export const GUEST_QUESTION_LIMIT = 3;

/** Same country derivation the supplier directory filters use. */
export function supplierCountry(s: Pick<Supplier, "country" | "location">): string {
  return (s.country ?? s.location.split(",").pop() ?? "").trim();
}

/** Distinct countries with at least one listed or verified supplier. */
export function countSupplierCountries(suppliers: Pick<Supplier, "country" | "location">[]): number {
  const set = new Set<string>();
  for (const s of suppliers) {
    const c = supplierCountry(s);
    if (c) set.add(c);
  }
  return set.size;
}

export type HomeBenefitInputs = {
  countryCount: number;
  materialCount: number;
};

/**
 * Build the band in display order. Data-driven cards are dropped when their
 * count is zero (e.g. an empty dataset) rather than showing "0 countries".
 */
export function buildHomeBenefits({ countryCount, materialCount }: HomeBenefitInputs): HomeBenefit[] {
  const items: (HomeBenefit | null)[] = [
    { key: "heldFunds", value: 0, prefix: "$" },
    countryCount > 0 ? { key: "countries", value: countryCount } : null,
    materialCount > 0 ? { key: "materials", value: materialCount } : null,
    { key: "guestQuestions", value: GUEST_QUESTION_LIMIT },
    { key: "alwaysOn", value: null, display: "24/7" },
  ];
  return items.filter((i): i is HomeBenefit => i !== null);
}
