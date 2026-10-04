// Filter chips on the material price page.
//
// The chips use the same categories as the product catalogue and supplier
// directory (`supplierCategories`) plus the keyword sectors the directory adds
// as extra chips (Machinery, Hardware Components, Biomedical). A material can
// sit under several categories (copper is both a metal and the cost driver of
// cables). Only materials with a price series belong here; the page hides any
// chip whose materials are all missing, so a chip is never empty.

import { supplierCategories, type SupplierCategory } from "@/data/suppliers";
import { INDUSTRY_BY_ID, type IndustryId } from "@/data/industries";

export type PriceCategory = {
  id: string;
  name: string;
  /** Catalog material ids, most relevant first. */
  materials: string[];
};

const DIRECTORY_MATERIALS: Record<SupplierCategory, string[]> = {
  "Steel & Metals": [
    "steel", "stainless-steel", "iron-ore", "aluminum", "copper", "nickel", "zinc",
    "tin", "lead", "brass", "chromium", "molybdenum", "cobalt",
  ],
  "Cables & Electrical": ["copper", "aluminum", "silicon", "silver", "lead", "energy-transition-metals"],
  "Tubes & Pipes": ["steel", "stainless-steel", "copper", "nickel", "chromium", "molybdenum", "plastics-index"],
  Packaging: ["plastics-index", "aluminum", "tin", "lumber"],
  Construction: ["cement", "steel", "lumber", "hardwood", "zinc", "coal"],
  "Industrial Parts": ["steel", "stainless-steel", "aluminum", "brass", "rubber", "base-metals-index"],
};

const SECTOR_MATERIALS: Partial<Record<IndustryId, string[]>> = {
  machinery: ["steel", "aluminum", "copper", "molybdenum", "base-metals-index"],
  "hardware-components": ["steel", "stainless-steel", "brass", "zinc", "copper", "rubber"],
  biomedical: ["stainless-steel", "cobalt", "platinum", "silver", "rubber", "plastics-index"],
};

function slug(name: string): string {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const PRICE_CATEGORIES: PriceCategory[] = [
  ...supplierCategories.map((name) => ({ id: slug(name), name, materials: DIRECTORY_MATERIALS[name] })),
  ...(Object.keys(SECTOR_MATERIALS) as IndustryId[]).map((id) => ({
    id,
    name: INDUSTRY_BY_ID.get(id)!.name,
    materials: SECTOR_MATERIALS[id]!,
  })),
];

/** Categories with at least one of `available` materials, each trimmed to those. */
export function priceCategoriesFor(available: Iterable<string>): PriceCategory[] {
  const have = new Set(available);
  return PRICE_CATEGORIES.map((c) => ({ ...c, materials: c.materials.filter((id) => have.has(id)) })).filter(
    (c) => c.materials.length > 0,
  );
}
