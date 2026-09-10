/**
 * Lister product-gap fill (9 previously empty mills) → catalogue ScrapedProduct[].
 *
 * Metadata: data/product-gaps-fill.json (27 SKUs).
 * Photos:   prefer local enhanced JPGs from
 *   data/product-media-gaps-fill-enhanced-manifest.json
 *   → public/images/products/{packaging|tubes}/{supplier_slug}/…
 * Fall back to non-PDF image_urls when no local file matches.
 *
 * Honesty: listed_fob → Listed FOB; null unit_price / rfq → RFQ (never $0.00).
 */

import rawGaps from "../../data/product-gaps-fill.json";
import enhancedManifest from "../../data/product-media-gaps-fill-enhanced-manifest.json";
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

export const LISTER_GAPS_SUPPLIER_ID_BY_SLUG: Record<string, string> = {
  "jiangsu-jieyuan-container": "jiangsu-jieyuan-container-co-ltd-cn",
  "wuxi-sifang-youxin": "wuxi-sifang-youxin-co-ltd-cn",
  "shangyue-shanghai-printing": "shangyue-shanghai-printing-co-ltd-cn",
  uflex: "uflex-limited-in",
  "shandong-dingsheng-container": "shandong-dingsheng-container-co-ltd-cn",
  "man-industries": "man-industries-india-limited-in",
  "hebei-huayang-steel-pipe": "hebei-huayang-steel-pipe-co-ltd-cn",
  "al-jazeera-steel": "al-jazeera-steel-products-co-saog-om",
  "ratnamani-metals-tubes": "ratnamani-metals-tubes-limited-in",
};

const BUCKET_BY_SLUG: Record<string, "packaging" | "tubes"> = {
  "jiangsu-jieyuan-container": "packaging",
  "wuxi-sifang-youxin": "packaging",
  "shangyue-shanghai-printing": "packaging",
  uflex: "packaging",
  "shandong-dingsheng-container": "packaging",
  "man-industries": "tubes",
  "hebei-huayang-steel-pipe": "tubes",
  "al-jazeera-steel": "tubes",
  "ratnamani-metals-tubes": "tubes",
};

const CATEGORY_BY_BUCKET: Record<"packaging" | "tubes", ProductCategory> = {
  packaging: "Packaging",
  tubes: "Tubes & Pipes",
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
    const supplierId = LISTER_GAPS_SUPPLIER_ID_BY_SLUG[sku.supplier_slug_guess];
    const mill = supplierId ? supplierById.get(supplierId) : undefined;
    const priced =
      typeof sku.unit_price === "number" &&
      Number.isFinite(sku.unit_price) &&
      sku.unit_price > 0;
    const remotes = (sku.image_urls ?? []).filter(isUsableRemoteImageUrl);
    out.push({
      id: `lister-b4-${sku.supplier_slug_guess}-${slug}`,
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
const localById = assignLocalProductImages(rows, localFiles);

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
    scrapedAt: "2026-09-02T18:00:00.000Z",
  };
}

export const listerGapsFillProducts: ScrapedProduct[] = rows.map(toScraped);

export function listerGapsFillCount(): number {
  return listerGapsFillProducts.length;
}

export function listerGapsFillForSupplier(supplierId: string): ScrapedProduct[] {
  return listerGapsFillProducts.filter((p) => p.supplierId === supplierId);
}
