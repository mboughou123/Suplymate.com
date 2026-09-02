/**
 * Daily expansion 2026-09-02 — 50 new mills for /suppliers.
 *
 * Metadata: data/daily-2026-09-02-suppliers.json
 * Factory stills: public/images/suppliers/<slug>/*.jpg (44 mills).
 *
 * Honesty: no invented factory photos (6 mills stay photo-less);
 *          no ISO badges from research-note certifications;
 *          RFQ / unpublished MOQ — never invent FOB.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import rawDaily from "../../data/daily-2026-09-02-suppliers.json";
import type { Industry, Supplier, SupplierCategory } from "@/data/suppliers";
import {
  DAILY_NO_FACTORY_PHOTO_SLUGS,
  dailySupplierIdForSlug,
} from "@/lib/daily-2026-09-02-ids";

export {
  DAILY_20260902_SUPPLIER_IDS,
  DAILY_NO_FACTORY_PHOTO_SLUGS,
  DUCAB_EXISTING_ID,
  dailySupplierIdForSlug,
  isDaily20260902Supplier,
} from "@/lib/daily-2026-09-02-ids";

const CATEGORY_BY_PRIMARY: Record<string, SupplierCategory> = {
  "Steel & Metals": "Steel & Metals",
  "Tube & Pipes": "Tubes & Pipes",
  "Tubes & Pipes": "Tubes & Pipes",
  "Cables & Electrical": "Cables & Electrical",
  Construction: "Construction",
  "Industrial Parts": "Industrial Parts",
  Packaging: "Packaging",
};

const INDUSTRY_BY_CATEGORY: Record<SupplierCategory, Industry> = {
  "Steel & Metals": "Metal",
  "Tubes & Pipes": "Metal",
  "Cables & Electrical": "Electrotechnical & Cabling",
  Construction: "Construction & BTP",
  "Industrial Parts": "Industrial Equipment",
  Packaging: "Plastics & Packaging",
};

type RawMill = {
  company_name: string;
  primary_category: string;
  country: string;
  city?: string;
  website?: string;
  description?: string;
  product_lines?: string[];
  moq?: string;
  source_url?: string;
  slug: string;
  export_markets?: string[];
};

function suppliersRoot(): string {
  return join(process.cwd(), "public", "images", "suppliers");
}

function listLocalFactoryStills(slug: string): string[] {
  if ((DAILY_NO_FACTORY_PHOTO_SLUGS as readonly string[]).includes(slug)) return [];
  const dir = join(suppliersRoot(), slug);
  if (!existsSync(dir)) return [];
  let files: string[] = [];
  try {
    files = readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .sort()
    .map((f) => `/images/suppliers/${slug}/${f}`);
}

function buildDailySuppliers(): Supplier[] {
  const items = (rawDaily as { suppliers?: RawMill[] }).suppliers ?? [];
  return items.map((mill) => {
    const category =
      CATEGORY_BY_PRIMARY[mill.primary_category] ?? "Steel & Metals";
    const stills = listLocalFactoryStills(mill.slug);
    const city = (mill.city ?? "").split(",")[0]?.trim() || mill.country;
    return {
      id: dailySupplierIdForSlug(mill.slug),
      name: mill.company_name,
      industry: INDUSTRY_BY_CATEGORY[category],
      category,
      location: [city, mill.country].filter(Boolean).join(", "),
      country: mill.country,
      city,
      website: mill.website,
      imageUrl: stills[0],
      supplierImages: stills,
      verified: true,
      description: mill.description,
      products: mill.product_lines ?? [],
      deliveryRegions: mill.export_markets ?? [],
      moq: mill.moq || "Not published — mill RFQ",
      sourceUrl: mill.source_url || mill.website,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: "2026-09-02",
      score: 90,
      reliabilityScore: 90,
    };
  });
}

export const daily20260902Suppliers: Supplier[] = buildDailySuppliers();
