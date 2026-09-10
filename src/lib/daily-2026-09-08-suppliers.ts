/**
 * Daily expansion 2026-09-08 — mill pack for /suppliers (48).
 *
 * Metadata: data/daily-2026-09-08-suppliers.json
 * Factory stills: public/images/suppliers/<slug>/*.jpg
 *
 * Honesty: on-disk stills only; no ISO badges; RFQ / unpublished MOQ;
 *          never invent FOB. Keep JSON description / honesty_note text.
 *          HOLD remaining: nvent (blocked) + misumi (distributor).
 *          misumi has a HOLD12 product SKU without a mill card.
 * ChelPipe uses chelpipe_02 only. NLMK uses nlmk_02 only.
 * Hitachi CM uses hitachi-cm_04 only. HOLD26 plants use `_01` only.
 * Soft captions already in JSON: harmonic-drive HFUC gear (not Hotaka
 * exterior), mauser IBC lineup (not mill exterior), rittal Haiger line
 * (not mill-exterior caption). Rengo is Japan, not Chile. Borusan
 * Mannesmann is Borusan Boru, not Berg.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import rawDaily from "../../data/daily-2026-09-08-suppliers.json";
import type { Industry, Supplier, SupplierCategory } from "@/data/suppliers";
import { dailySupplierIdForSlug20260908 } from "@/lib/daily-2026-09-08-ids";

export {
  DAILY_20260908_HOLD_SLUGS,
  DAILY_20260908_SLUGS,
  DAILY_20260908_SUPPLIER_IDS,
  dailySupplierIdForSlug,
  dailySupplierIdForSlug20260908,
  isDaily20260908Supplier,
} from "@/lib/daily-2026-09-08-ids";

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
  honesty_note?: string;
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

function millDescription(mill: RawMill): string | undefined {
  const parts = [mill.description, mill.honesty_note]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  if (parts[0].includes(parts[1])) return parts[0];
  return `${parts[0]} ${parts[1]}`;
}

function buildDailySuppliers(): Supplier[] {
  const items = (rawDaily as { suppliers?: RawMill[] }).suppliers ?? [];
  return items.map((mill) => {
    const category =
      CATEGORY_BY_PRIMARY[mill.primary_category] ?? "Steel & Metals";
    const stills = listLocalFactoryStills(mill.slug);
    const city = (mill.city ?? "").split(",")[0]?.trim() || mill.country;
    return {
      id: dailySupplierIdForSlug20260908(mill.slug),
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
      description: millDescription(mill),
      products: mill.product_lines ?? [],
      deliveryRegions: mill.export_markets ?? [],
      moq: mill.moq || "Not published — mill RFQ",
      sourceUrl: mill.source_url || mill.website,
      certificationsDetailed: [],
      certificationImages: [],
      lastUpdated: "2026-09-08",
      score: 90,
      reliabilityScore: 90,
    };
  });
}

export const daily20260908Suppliers: Supplier[] = buildDailySuppliers();
