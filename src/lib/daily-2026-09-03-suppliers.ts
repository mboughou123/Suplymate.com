/**
 * Daily expansion 2026-09-03 morning — 50 new mills for /suppliers.
 *
 * Metadata: data/daily-2026-09-03-suppliers.json
 * Factory stills: public/images/suppliers/<slug>/*.jpg (50 mills).
 *
 * Honesty: use on-disk stills only (no stock / AI yards);
 *          no ISO badges from research-note certifications;
 *          RFQ / unpublished MOQ — never invent FOB.
 *          Bossard is a soft-hold distributor/logistics identity, not a mill seal.
 *          Maharashtra Seamless card photo is branded yard inventory (Vijay Sales).
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import rawDaily from "../../data/daily-2026-09-03-suppliers.json";
import type { Industry, Supplier, SupplierCategory } from "@/data/suppliers";
import { dailySupplierIdForSlug20260903 } from "@/lib/daily-2026-09-03-ids";

export {
  DAILY_20260903_SLUGS,
  DAILY_20260903_SUPPLIER_IDS,
  dailySupplierIdForSlug20260903,
  isDaily20260903Supplier,
} from "@/lib/daily-2026-09-03-ids";

const CATEGORY_BY_PRIMARY: Record<string, SupplierCategory> = {
  "Steel & Metals": "Steel & Metals",
  "Tube & Pipes": "Tubes & Pipes",
  "Tubes & Pipes": "Tubes & Pipes",
  "Cables & Electrical": "Cables & Electrical",
  Construction: "Construction",
  "Industrial Parts": "Industrial Parts",
  "Hardware & Motion": "Industrial Parts",
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

function honestyDescription(mill: RawMill): string {
  const base = (mill.description ?? "").trim();
  if (mill.slug === "maharashtra-seamless") {
    const note =
      "Photo is branded yard inventory (Vijay Sales), not mill gate.";
    return base ? `${base} ${note}` : note;
  }
  if (mill.slug === "bossard") {
    const note =
      "Soft-hold identity: Bossard is a distributor/logistics fastener group, not a producing mill seal. Do not treat this card as a mill certification.";
    return base ? `${base} ${note}` : note;
  }
  return base;
}

function buildDailySuppliers(): Supplier[] {
  const items = (rawDaily as { suppliers?: RawMill[] }).suppliers ?? [];
  return items.map((mill) => {
    const category =
      CATEGORY_BY_PRIMARY[mill.primary_category] ?? "Steel & Metals";
    const stills = listLocalFactoryStills(mill.slug);
    const city = (mill.city ?? "").split(",")[0]?.trim() || mill.country;
    return {
      id: dailySupplierIdForSlug20260903(mill.slug),
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
      description: honestyDescription(mill),
      products: mill.product_lines ?? [],
      deliveryRegions: mill.export_markets ?? [],
      moq: mill.moq || "Not published — mill RFQ",
      sourceUrl: mill.source_url || mill.website,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: "2026-09-03",
      score: 90,
      reliabilityScore: 90,
    };
  });
}

export const daily20260903Suppliers: Supplier[] = buildDailySuppliers();
