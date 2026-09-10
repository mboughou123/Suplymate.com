/**
 * Lister product-gap fill pass 2 (18 mills, 54 SKUs) → catalogue ScrapedProduct[].
 *
 * Metadata: data/product-gaps-fill-2.json
 * Photos:   data/product-media-gaps-fill-2-enhanced-manifest.json
 *   → public/images/products/{steel|cables|construction|industrial}/{slug}/…
 *
 * Honesty: Polycab Green Wire+ → printed_mrp (MRP);
 *          Luxing priced SKUs → listed_fob;
 *          everything else RFQ (never $0.00).
 */

import rawGaps from "../../data/product-gaps-fill-2.json";
import enhancedManifest from "../../data/product-media-gaps-fill-2-enhanced-manifest.json";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { parsePriceSourceType, type PriceSourceType } from "@/lib/price-source";
import {
  assignLocalProductImages,
  indexPublicImagePaths,
  isUsableRemoteImageUrl,
  preferEnhancedJpegPaths,
  publicPathFromEnhancedDst,
  slugifyProductName,
} from "@/lib/lister-media";

export const LISTER_GAPS2_SUPPLIER_ID_BY_SLUG: Record<string, string> = {
  "jsw-steel": "jsw-steel-limited-in",
  "tata-steel": "tata-steel-limited-in",
  "jindal-steel": "jindal-steel-limited-formerly-jindal-steel-power-l-in",
  "ezz-steel": "ezz-steel-eg",
  "kei-industries": "kei-industries-limited-in",
  polycab: "tegh-cables-india-pvt-ltd-polycab-cables-wires-distributor-m",
  "rr-kabel": "sudkabel-gmbh-kabelsysteme-kabel-und-kabelgarnituren-mannhei",
  "shanghai-shenghua-cable": "shanghai-shenghua-cable-group-co-ltd-cn",
  "shandong-new-luxing-cable": "shandong-new-luxing-cable-co-ltd-cn",
  cemex: "cemex-oficinas-corporativas-madrid",
  "anhui-conch-cement": "anhui-conch-cement-company-limited-cn",
  "heidelberg-materials": "heidelberg-materials-ag",
  "vulcan-materials": "vulcan-materials-company",
  "neway-valve": "neway-valve-suzhou-co-ltd-cn",
  "nanfang-pump": "nanfang-pump-industry-co-ltd-cn",
  "wafangdian-bearing": "wafangdian-bearing-group-corp-ltd-cn",
  "luoyang-huigong-bearing": "luoyang-huigong-bearing-technology-co-ltd-cn",
  "sundram-fasteners": "sundram-fasteners-limited-in",
};

const BUCKET_BY_SLUG: Record<string, "steel" | "cables" | "construction" | "industrial"> = {
  "jsw-steel": "steel",
  "tata-steel": "steel",
  "jindal-steel": "steel",
  "ezz-steel": "steel",
  "kei-industries": "cables",
  polycab: "cables",
  "rr-kabel": "cables",
  "shanghai-shenghua-cable": "cables",
  "shandong-new-luxing-cable": "cables",
  cemex: "construction",
  "anhui-conch-cement": "construction",
  "heidelberg-materials": "construction",
  "vulcan-materials": "construction",
  "neway-valve": "industrial",
  "nanfang-pump": "industrial",
  "wafangdian-bearing": "industrial",
  "luoyang-huigong-bearing": "industrial",
  "sundram-fasteners": "industrial",
};

const CATEGORY_BY_BUCKET: Record<(typeof BUCKET_BY_SLUG)[string], ProductCategory> = {
  steel: "Steel & Metals",
  cables: "Cables & Electrical",
  construction: "Construction",
  industrial: "Industrial Parts",
};

const STEM_ALIASES: Record<string, string> = {
  "jsw-steel/jsw-neosteel-tmt-bars-fe-550d-600": "jsw-neosteel-tmt-bars",
  "jsw-steel/jsw-hot-rolled-coils-plates-and-sheets": "hot-rolled-coils-plates-sheets",
  "jsw-steel/jsw-cold-rolled-and-galvanised-galvalume-coils": "cold-rolled-galvanised-coils",
  "tata-steel/tata-steel-hot-rolled-coils": "hot-rolled-coils",
  "tata-steel/tata-steel-cold-rolled-coils": "cold-rolled-coils",
  "jindal-steel/jindal-wide-steel-plates-rockhard-structural-api": "wide-steel-plates",
  "jindal-steel/jindal-parallel-flange-beams": "parallel-flange-beams",
  "ezz-steel/ezz-deformed-rebar-10-40-mm": "deformed-rebar-10-40-mm",
  "ezz-steel/ezz-wire-rod": "wire-rod",
  "ezz-steel/ezz-hot-rolled-coil-flat-steel": "hot-rolled-coil",
  "kei-industries/kei-house-wire-homecab-fr": "house-wire-homecab-fr",
  "kei-industries/kei-ht-high-voltage-power-cables-up-to-33-kv": "ht-high-voltage-power-cables",
  "kei-industries/kei-ehv-power-cables-up-to-400-kv": "ehv-power-cables",
  "polycab/polycab-green-wire-1-5-sq-mm-90-m-coil": "polycab-green-wire-plus-1-5-sqmm-90m",
  "polycab/polycab-primma-optima-plus-house-wires": "polycab-primma-house-wires",
  "rr-kabel/rr-kabel-future-ready-house-wires-flamex-superex-green-firex":
    "future-ready-house-wires",
  "rr-kabel/rr-kabel-ht-power-cables": "ht-power-cables",
  "rr-kabel/rr-kabel-ehv-power-cables": "ehv-power-cables",
  "shanghai-shenghua-cable/shenghua-xlpe-swa-armoured-power-cable":
    "xlpe-swa-armoured-power-cable",
  "shanghai-shenghua-cable/shenghua-mv-xlpe-unarmoured-power-cable":
    "mv-xlpe-unarmoured-power-cable",
  "shanghai-shenghua-cable/shenghua-lv-xlpe-insulated-power-cable-0-6-1-kv":
    "lv-xlpe-power-cable",
  "shandong-new-luxing-cable/iec60227-450-750v-pvc-insulated-single-core-wire":
    "iec60227-450-750v-pvc-single-core-wire",
  "shandong-new-luxing-cable/house-wiring-eco-pvc-flexible-electric-wire-h05vv-f-rvv":
    "house-wiring-eco-pvc-flexible-electric-wire",
  "cemex/cemex-portland-cement": "portland-cement",
  "cemex/cemex-ready-mix-concrete": "ready-mix-concrete",
  "cemex/cemex-aggregates-crushed-stone-sand-gravel":
    "aggregates-crushed-stone-sand-gravel",
  "anhui-conch-cement/conch-specialty-cement-sulfate-resistant-oil-well-nuclear-white":
    "conch-specialty-cement",
  "heidelberg-materials/heidelberg-materials-cement": "cement",
  "heidelberg-materials/heidelberg-materials-aggregates-sand-gravel-crushed-stone":
    "aggregates-sand-gravel-crushed-stone",
  "heidelberg-materials/heidelberg-materials-ready-mixed-concrete":
    "ready-mixed-concrete",
  "vulcan-materials/vulcan-crushed-stone-sand-and-gravel-construction-aggregates":
    "crushed-stone-sand-gravel-aggregates",
  "vulcan-materials/vulcan-asphalt-mix": "asphalt-mix",
  "vulcan-materials/vulcan-ready-mixed-concrete": "ready-mixed-concrete",
  "neway-valve/neway-ball-valves": "ball-valves",
  "neway-valve/neway-butterfly-valves": "butterfly-valves",
  "neway-valve/neway-gate-valves": "gate-valves",
  "nanfang-pump/cnp-cdl-stainless-steel-vertical-multistage-centrifugal-pump":
    "cdl-stainless-steel-vertical-multistage-pump",
  "nanfang-pump/cnp-end-suction-pumps": "end-suction-pumps",
  "nanfang-pump/cnp-inline-split-case-pumps": "inline-split-case-pumps",
  "wafangdian-bearing/zwz-deep-groove-ball-bearings": "deep-groove-ball-bearings",
  "wafangdian-bearing/zwz-spherical-roller-bearings": "spherical-roller-bearings",
  "wafangdian-bearing/zwz-tapered-roller-bearings": "tapered-roller-bearings",
  "luoyang-huigong-bearing/chg-rolling-mill-bearings": "rolling-mill-bearings",
  "luoyang-huigong-bearing/chg-slewing-bearings": "slewing-bearings",
  "luoyang-huigong-bearing/chg-thin-section-bearings": "thin-section-bearings",
  "sundram-fasteners/sundram-high-tensile-fasteners-m3-m80": "high-tensile-fasteners",
  "sundram-fasteners/sundram-hot-forged-parts": "hot-forged-parts",
  "sundram-fasteners/sundram-radiator-caps": "radiator-caps",
};

type RawSku = {
  product_name: string;
  product_slug: string | null;
  supplier_name: string;
  supplier_slug_guess: string;
  source_url: string;
  unit_price: number | null;
  currency: string | null;
  unit: string | null;
  price_note: string | null;
  image_urls: string[];
  price_source_type?: string | null;
};

type ManifestRow = { dst?: string; dst_rel?: string; src?: string; repo_path?: string };

const supplierById = new Map(phase1Suppliers.map((s) => [s.id, s]));

function moqFromNote(note: string | null, fallback: string | null): string | null {
  if (!note) return fallback;
  const m = note.match(/MOQ\s+(\d[\d,]*(?:\.\d+)?\s+[A-Za-z /]+)/i);
  if (m) return m[1].trim();
  return fallback;
}

const localFiles = indexPublicImagePaths(
  preferEnhancedJpegPaths(
    (enhancedManifest as ManifestRow[])
      .map((e) =>
        publicPathFromEnhancedDst(e.dst_rel ?? e.dst ?? e.repo_path ?? e.src ?? ""),
      )
      .filter((p): p is string => Boolean(p)),
  ),
);

type BuiltRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCountry: string | null;
  name: string;
  slug: string;
  category: ProductCategory;
  bucket: string;
  supplierSlug: string;
  remoteImages: string[];
  basePrice: number | null;
  priceUnit: string | null;
  currency: string;
  moq: string | null;
  priceNote: string | null;
  sourceUrl: string;
  imageSourceUrl: string | null;
  priceSourceType: PriceSourceType | null;
};

function buildRows(): BuiltRow[] {
  const items = (rawGaps as { product_gaps?: RawSku[] }).product_gaps ?? [];
  const out: BuiltRow[] = [];
  for (const sku of items) {
    const bucket = BUCKET_BY_SLUG[sku.supplier_slug_guess];
    if (!bucket) continue;
    const slug = sku.product_slug || slugifyProductName(sku.product_name);
    const supplierId = LISTER_GAPS2_SUPPLIER_ID_BY_SLUG[sku.supplier_slug_guess];
    const mill = supplierId ? supplierById.get(supplierId) : undefined;
    const priced =
      typeof sku.unit_price === "number" &&
      Number.isFinite(sku.unit_price) &&
      sku.unit_price > 0;
    const remotes = (sku.image_urls ?? []).filter(isUsableRemoteImageUrl);
    out.push({
      id: `lister-b5-${sku.supplier_slug_guess}-${slug}`,
      supplierId: supplierId ?? sku.supplier_slug_guess,
      supplierName: mill?.name ?? sku.supplier_name,
      supplierCountry: mill?.country ?? null,
      name: sku.product_name,
      slug,
      category: CATEGORY_BY_BUCKET[bucket],
      bucket,
      supplierSlug: sku.supplier_slug_guess,
      remoteImages: remotes,
      basePrice: priced ? sku.unit_price : null,
      priceUnit: priced ? sku.unit : null,
      currency: priced ? (sku.currency ?? "USD") : (sku.currency ?? "USD"),
      moq: moqFromNote(sku.price_note, mill?.moq ?? null),
      priceNote: sku.price_note,
      sourceUrl: sku.source_url,
      imageSourceUrl: remotes[0] ?? null,
      priceSourceType: parsePriceSourceType(sku.price_source_type),
    });
  }
  return out;
}

const rows = buildRows();
const localById = assignLocalProductImages(rows, localFiles, STEM_ALIASES);

function toScraped(row: BuiltRow): ScrapedProduct {
  const local = localById.get(row.id) ?? [];
  const images = local.length > 0 ? local : row.remoteImages;
  const priced = row.basePrice != null && row.basePrice > 0;
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    supplierLogo: null,
    supplierCountry: row.supplierCountry,
    name: row.name,
    slug: row.slug,
    category: row.category,
    images,
    videos: [],
    basePrice: priced ? row.basePrice : null,
    priceUnit: priced ? row.priceUnit : null,
    commissionRate: priced ? 0 : null,
    currency: row.currency,
    moq: row.moq,
    shippingTime: null,
    description: row.priceNote
      ? `${row.name} from ${row.supplierName}. ${row.priceNote}`
      : `${row.name} from ${row.supplierName}.`,
    shortDescription: `${row.name} — ${row.supplierName}`,
    specifications: {
      Supplier: row.supplierName,
      Category: row.category,
      ...(row.priceNote ? { "Price note": row.priceNote } : {}),
      ...(row.priceSourceType ? { "Price source type": row.priceSourceType } : {}),
      ...(priced && row.priceUnit ? { Unit: row.priceUnit } : {}),
    },
    priceSourceType: row.priceSourceType,
    customizationOptions: [],
    certifications: [],
    rating: null,
    reviewCount: null,
    sourceUrl: row.sourceUrl,
    productUrl: row.sourceUrl,
    imageSourceUrl: row.imageSourceUrl,
    verifiedSupplier: true,
    status: "approved",
    scrapedAt: "2026-09-02T19:00:00.000Z",
  };
}

export const listerGapsFill2Products: ScrapedProduct[] = rows.map(toScraped);

export function listerGapsFill2Count(): number {
  return listerGapsFill2Products.length;
}

export function listerGapsFill2ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerGapsFill2Products.filter((p) => p.supplierId === supplierId);
}
