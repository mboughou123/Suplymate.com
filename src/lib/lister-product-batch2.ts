/**
 * Lister product-media batch 2 → catalogue ScrapedProduct[].
 *
 * Metadata: data/product-media-batch2.json (construction + industrial).
 * Photos:   prefer local JPGs from the enhanced manifest
 *   public/images/products/{construction|industrial}/{supplier_slug}/…
 * Fall back to non-PDF image_urls when no local file matches.
 *
 * Honesty: printed_mrp / mill_estimate / mill_list / listed_fob / retail_eshop / RFQ.
 */

import rawBatch from "../../data/product-media-batch2.json";
import enhancedManifest from "../../data/product-media-batch2-enhanced-manifest.json";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { parsePriceSourceType, type PriceSourceType } from "@/lib/price-source";
import {
  assignLocalProductImages,
  indexPublicImagePaths,
  isUsableRemoteImageUrl,
  publicPathFromEnhancedDst,
  slugifyProductName,
} from "@/lib/lister-media";

export const LISTER_B2_SUPPLIER_ID_BY_SLUG: Record<string, string> = {
  "ultratech-cement": "ultratech-cement-limited-in",
  "magicrete-building-solutions": "magicrete-building-solutions-private-limited-in",
  "hangxiao-steel-structure-shandong": "hangxiao-steel-structure-shandong-co-ltd-cn",
  "zamil-steel-peb": "zamil-steel-pre-engineered-buildings-co-ltd-sa",
  "commercial-metals-company": "commercial-metals-company",
  "chaoda-valves": "chaoda-valves-group-co-ltd-cn",
  "tong-ming-enterprise": "tong-ming-enterprise-zhejiang-co-ltd-cn",
  "kirloskar-brothers": "kirloskar-brothers-limited-in",
  "zhejiang-zhiju-pipeline": "zhejiang-zhiju-pipeline-industry-co-ltd-cn",
  "leo-group-pump-zhejiang": "leo-group-pump-zhejiang-co-ltd-cn",
};

const CATEGORY_BY_BUCKET: Record<string, ProductCategory> = {
  construction: "Construction",
  industrial: "Industrial Parts",
};

/** Lister stems that do not slugify cleanly from the product name. */
const STEM_ALIASES: Record<string, string> = {
  "ultratech-cement/ultratech-opc-53-grade-cement-50-kg-bag": "opc-53-bag",
  "ultratech-cement/ultratech-super-cement-ppc-super-50-kg-bag": "super-bag",
  "ultratech-cement/ultratech-ppc-portland-pozzolana-cement-50-kg-bag": "ppc-bag",
  "hangxiao-steel-structure-shandong/durable-steel-structure-prefabricated-warehouse-for-commercial-use":
    "prefab-warehouse",
  "zamil-steel-peb/zamil-fabricated-peb-structural-steel-members": "peb-fabrication-line",
  "leo-group-pump-zhejiang/leo-xzs-stainless-steel-standard-centrifugal-pump":
    "xzs-ss-centrifugal",
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

type ManifestRow = { dst?: string; src?: string; repo_path?: string };

const supplierById = new Map(phase1Suppliers.map((s) => [s.id, s]));

function moqFromNote(note: string | null, fallback: string | null): string | null {
  if (!note) return fallback;
  const m = note.match(/MOQ\s+(\d[\d,]*(?:\.\d+)?\s+[A-Za-z /]+)/i);
  if (m) return m[1].trim();
  return fallback;
}

const localFiles = indexPublicImagePaths(
  (enhancedManifest as ManifestRow[])
    .map((e) => publicPathFromEnhancedDst(e.dst ?? e.repo_path ?? e.src ?? ""))
    .filter((p): p is string => Boolean(p))
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
  const out: BuiltRow[] = [];
  const buckets = rawBatch as Record<string, RawSku[]>;
  for (const [bucket, items] of Object.entries(buckets)) {
    const category = CATEGORY_BY_BUCKET[bucket];
    if (!category) continue;
    for (const sku of items) {
      const slug = sku.product_slug || slugifyProductName(sku.product_name);
      const supplierId = LISTER_B2_SUPPLIER_ID_BY_SLUG[sku.supplier_slug_guess];
      const mill = supplierId ? supplierById.get(supplierId) : undefined;
      const priced =
        typeof sku.unit_price === "number" &&
        Number.isFinite(sku.unit_price) &&
        sku.unit_price > 0;
      const remotes = (sku.image_urls ?? []).filter(isUsableRemoteImageUrl);
      out.push({
        id: `lister-b2-${sku.supplier_slug_guess}-${slug}`,
        supplierId: supplierId ?? sku.supplier_slug_guess,
        supplierName: mill?.name ?? sku.supplier_name,
        supplierCountry: mill?.country ?? null,
        name: sku.product_name,
        slug,
        category,
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
  }
  return out;
}

const rows = buildRows();
const localById = assignLocalProductImages(rows, localFiles, STEM_ALIASES);

/** Leftover Zamil stills that token-overlap misses — gallery extras, not primaries. */
const EXTRA_STEMS: Record<string, string> = {
  "zamil-steel-peb/single-skin-sw-panel":
    "zamil-tempcon-insulated-sandwich-wall-roof-panels",
  "zamil-steel-peb/temparch-dimensions":
    "zamil-tempcon-insulated-sandwich-wall-roof-panels",
  "zamil-steel-peb/temparch-thermal":
    "zamil-tempcon-insulated-sandwich-wall-roof-panels",
  "zamil-steel-peb/dx-ex-liner-panel":
    "zamil-tempcon-insulated-sandwich-wall-roof-panels",
  "zamil-steel-peb/factory-aerial": "zamil-steel-pre-engineered-building-peb-system",
  "zamil-steel-peb/applications": "zamil-steel-pre-engineered-building-peb-system",
};

function attachExtraStems() {
  const byKey = new Map<string, BuiltRow>();
  for (const row of rows) {
    byKey.set(`${row.supplierSlug}/${row.slug}`, row);
  }
  for (const file of localFiles) {
    const stem = file.filename.replace(/\.(jpe?g|png|webp)$/i, "").replace(/-\d+$/, "");
    const targetSlug = EXTRA_STEMS[`${file.supplierSlug}/${stem}`];
    if (!targetSlug) continue;
    const row = byKey.get(`${file.supplierSlug}/${targetSlug}`);
    if (!row) continue;
    const current = localById.get(row.id) ?? [];
    if (!current.includes(file.publicPath)) {
      localById.set(row.id, [...current, file.publicPath]);
    }
  }
}
attachExtraStems();

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
    scrapedAt: "2026-09-02T14:00:00.000Z",
  };
}

export const listerBatch2Products: ScrapedProduct[] = rows.map(toScraped);

export function listerBatch2Count(): number {
  return listerBatch2Products.length;
}

export function listerBatch2ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerBatch2Products.filter((p) => p.supplierId === supplierId);
}
