/**
 * Daily expansion 2026-09-09 — mill pack for /suppliers (14).
 *
 * Metadata: data/daily-2026-09-09-suppliers.json
 * Factory stills: public/images/suppliers/<slug>/*.jpg
 * Seal: data/daily-2026-09-09-researcher-seal.json
 *         (QA-DAILY-2026-09-09-RESEARCHER)
 *
 * Honesty: on-disk stills only; no ISO badges; RFQ / unpublished MOQ;
 *          never invent FOB. Keep JSON description / honesty_note text.
 *          HOLD 36 omitted. sew-eurodrive uses sew-eurodrive_02 only.
 *          wittenstein uses wittenstein_02 only. pepperl-fuchs / daido-steel
 *          and the soft 11 use `_01` except those two `_02` cards.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import rawDaily from "../../data/daily-2026-09-09-suppliers.json";
import type { Industry, Supplier, SupplierCategory } from "@/data/suppliers";
import {
  DAILY_20260909_SLUGS,
  dailySupplierIdForSlug20260909,
} from "@/lib/daily-2026-09-09-ids";

export {
  DAILY_20260909_HOLD_SLUGS,
  DAILY_20260909_SLUGS,
  DAILY_20260909_SUPPLIER_IDS,
  dailySupplierIdForSlug,
  dailySupplierIdForSlug20260909,
  isDaily20260909Supplier,
} from "@/lib/daily-2026-09-09-ids";

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

/** Researcher-required sibling stills (gif `_01` skipped / branded `_02`). */
const PREFERRED_STILL: Record<string, string> = {
  "sew-eurodrive": "sew-eurodrive_02.jpg",
  wittenstein: "wittenstein_02.jpg",
};

const WIRED_SLUGS = new Set<string>(DAILY_20260909_SLUGS);

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
  const rasters = files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  const preferred = PREFERRED_STILL[slug];
  if (preferred && rasters.includes(preferred)) {
    return [`/images/suppliers/${slug}/${preferred}`];
  }
  return rasters.sort().map((f) => `/images/suppliers/${slug}/${f}`);
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
  return items
    .filter((mill) => WIRED_SLUGS.has(mill.slug))
    .map((mill) => {
      const category =
        CATEGORY_BY_PRIMARY[mill.primary_category] ?? "Steel & Metals";
      const stills = listLocalFactoryStills(mill.slug);
      const city = (mill.city ?? "").split(",")[0]?.trim() || mill.country;
      return {
        id: dailySupplierIdForSlug20260909(mill.slug),
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
        lastUpdated: "2026-09-09",
        score: 90,
        reliabilityScore: 90,
      };
    });
}

export const daily20260909Suppliers: Supplier[] = buildDailySuppliers();
