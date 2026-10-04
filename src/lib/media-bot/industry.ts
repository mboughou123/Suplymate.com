// Industry buckets the media bots work through, one run per industry.

import { INDUSTRIES, detectIndustries, industryForLegacyCategory, type IndustryId } from "@/data/industries";
import { LOGISTICS_CATEGORY_ID } from "@/data/logistics-providers";

export type MediaIndustryId = IndustryId | typeof LOGISTICS_CATEGORY_ID;

export const MEDIA_INDUSTRY_IDS: readonly MediaIndustryId[] = [...INDUSTRIES.map((i) => i.id), LOGISTICS_CATEGORY_ID];

export function isMediaIndustry(v: unknown): v is MediaIndustryId {
  return typeof v === "string" && (MEDIA_INDUSTRY_IDS as readonly string[]).includes(v);
}

export function supplierIndustry(s: {
  name: string;
  category?: string | null;
  industry?: string | null;
  products?: string[] | null;
}): IndustryId | null {
  const byCategory = industryForLegacyCategory(s.category) ?? industryForLegacyCategory(s.industry);
  if (byCategory) return byCategory.id;
  return detectIndustries([s.name, s.industry ?? "", ...(s.products ?? [])].join(" "))[0]?.id ?? null;
}

export function productIndustry(p: { name: string; category?: string | null }): IndustryId | null {
  return industryForLegacyCategory(p.category)?.id ?? detectIndustries(p.name)[0]?.id ?? null;
}
