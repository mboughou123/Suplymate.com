/**
 * Daily expansion 2026-09-07 V2 product pack (9 SKUs) → catalogue ScrapedProduct[].
 *
 * Metadata: data/daily-2026-09-07-products.json
 * Photos:   public/images/products/{supplier-slug}/…
 * Seal:     data/daily-2026-09-07-researcher-products-seal.json (V2)
 *
 * Honesty: all 9 SKUs are mill RFQ (never invent FOB / unit prices).
 * Photos: real local JPGs only — no remote/stock fallbacks, no AI badges.
 *
 * Mill / product split: attach to daily-2026-09-07 mill ids when that mill
 * is already in daily20260907Suppliers (48, including Shougang). Remaining
 * HOLD mill cards (stupp / interpipe) stay out of the directory.
 * Interpipe's product SKU still wires onto its supplier_slug_guess id
 * (does not invent a mill card). Saudi / Corinth / Mueller attach to their
 * now-wired mill ids.
 *
 * HOLD product-stills-fail slugs (berg-pipe, abb, …) are not in this JSON.
 * O-I Glass still is plant campus — researcher soft-OK.
 */

import rawDaily from "../../data/daily-2026-09-07-products.json";
import rawDailyMills from "../../data/daily-2026-09-07-suppliers.json";
import {
  DAILY_20260907_SLUGS,
  dailySupplierIdForSlug20260907,
} from "@/lib/daily-2026-09-07-ids";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { parsePriceSourceType, type PriceSourceType } from "@/lib/price-source";
import {
  preferEnhancedJpegPaths,
  publicPathFromDailyEnhancedDst,
  slugifyProductName,
} from "@/lib/lister-media";

type RawSku = {
  product_name: string;
  product_slug?: string | null;
  supplier_name: string;
  supplier_slug_guess: string;
  category?: string | null;
  source_url: string;
  unit_price: number | null;
  currency: string | null;
  unit: string | null;
  price_note: string | null;
  image_urls?: string[];
  local_images?: string[];
  price_source_type?: string | null;
  needs_ai_generate?: boolean;
};

const CATEGORY_ALIASES: Record<string, ProductCategory> = {
  "Steel & Metals": "Steel & Metals",
  "Tubes & Pipes": "Tubes & Pipes",
  "Tube & Pipes": "Tubes & Pipes",
  "Cables & Electrical": "Cables & Electrical",
  Construction: "Construction",
  "Industrial Parts": "Industrial Parts",
  "Hardware & Motion": "Industrial Parts",
  Packaging: "Packaging",
};

/** HOLD mill slugs whose product SKUs may still wire (no mill card). */
export const DAILY_20260907_HOLD_MILL_PRODUCT_OK_SLUGS = [
  "saudi-steel-pipe",
  "interpipe",
  "corinth-pipeworks",
  "mueller-industries",
] as const;

/** V2 hold_product_stills_fail — must never appear in this pack. */
export const DAILY_20260907_HOLD_PRODUCT_FAIL_SLUGS = [
  "berg-pipe",
  "stupp",
  "alleima",
  "webco",
  "aptar",
  "encore-wire",
  "flsmidth",
  "wartsila",
  "abb",
  "shougang",
  "severstal",
  "nkt",
  "pca",
  "alfalaval",
  "nachi",
  "sig-group",
  "saint-gobain",
  "sika",
  "furukawa-electric",
  "minebeamitsumi",
  "sappi",
  "nippon-paper",
  "upm",
  "andritz",
] as const;

const WIRED_MILL_SLUGS = new Set<string>(DAILY_20260907_SLUGS);

const millById = new Map<string, { name: string; country: string | null; moq?: string | null }>();
for (const mill of (rawDailyMills as {
  suppliers?: { slug: string; company_name: string; country: string; moq?: string }[];
}).suppliers ?? []) {
  const id = dailySupplierIdForSlug20260907(mill.slug);
  millById.set(id, {
    name: mill.company_name,
    country: mill.country ?? null,
    moq: mill.moq ?? null,
  });
}

/**
 * Prefer the 09-07 mill-pack id when that mill is already in
 * daily20260907Suppliers; otherwise keep supplier_slug_guess so HOLD
 * product SKUs attach without inventing a directory mill card.
 */
export function daily20260907ProductSupplierId(slug: string): string {
  if (WIRED_MILL_SLUGS.has(slug)) {
    return dailySupplierIdForSlug20260907(slug);
  }
  return slug;
}

/**
 * Stable Research QA holds: `supplier_slug_guess|product_slug`.
 * Empty — V2 wire-now 9 are all approved.
 */
export const DAILY_20260907_QA_HELD_KEYS = new Set<string>([]);

export const DAILY_20260907_QA_HELD_SUPPLIER_SLUGS = new Set<string>([]);

export function isDaily20260907QaHeld(
  supplierSlug: string,
  productSlug: string,
): boolean {
  if (DAILY_20260907_QA_HELD_SUPPLIER_SLUGS.has(supplierSlug)) return true;
  return DAILY_20260907_QA_HELD_KEYS.has(`${supplierSlug}|${productSlug}`);
}

function toProductCategory(raw: string | null | undefined): ProductCategory | null {
  if (!raw) return null;
  return CATEGORY_ALIASES[raw.trim()] ?? null;
}

/** Map enhancer / workspace local paths onto `/images/products/...`. */
export function publicPathFromDailyLocalImage(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^\/images\/products\/[^/]+\/[^/]+$/i.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/images\/products\/([^/]+\/[^/]+\.(?:jpe?g|png|webp))$/i);
  if (m) return `/images/products/${m[1]}`;
  return publicPathFromDailyEnhancedDst(trimmed);
}

function moqFromNote(note: string | null, fallback: string | null | undefined): string | null {
  if (!note) return fallback ?? null;
  const m = note.match(/MOQ\s+(\d[\d,]*(?:\.\d+)?\s+[A-Za-z /]+)/i);
  if (m) return m[1].trim();
  return fallback ?? null;
}

function localPublicImages(sku: RawSku): string[] {
  const mapped = (sku.local_images ?? [])
    .map(publicPathFromDailyLocalImage)
    .filter((p): p is string => Boolean(p));
  return preferEnhancedJpegPaths(mapped);
}

function campusNote(slug: string): string | null {
  if (slug === "oi-glass") {
    return "Plant campus still — researcher soft-OK (factory campus, not a close product pack shot).";
  }
  return null;
}

function buildProducts(): ScrapedProduct[] {
  const items = (rawDaily as { products?: RawSku[] }).products ?? [];
  const out: ScrapedProduct[] = [];
  for (const sku of items) {
    const category = toProductCategory(sku.category);
    if (!category) continue;
    const slug = sku.product_slug || slugifyProductName(sku.product_name);
    const supplierId = daily20260907ProductSupplierId(sku.supplier_slug_guess);
    const mill = millById.get(supplierId);
    const images = localPublicImages(sku);
    const priceSourceType: PriceSourceType =
      parsePriceSourceType(sku.price_source_type) ?? "rfq";
    const basePrice = null;
    const held = isDaily20260907QaHeld(sku.supplier_slug_guess, slug);
    const millName = mill?.name ?? sku.supplier_name;
    const soft = campusNote(sku.supplier_slug_guess);
    const descriptionParts = [
      `${sku.product_name} from ${millName}.`,
      sku.price_note,
      soft,
    ].filter(Boolean);
    out.push({
      id: `lister-b7-${sku.supplier_slug_guess}-${slug}`,
      supplierId,
      supplierName: millName,
      supplierLogo: null,
      supplierCountry: mill?.country ?? null,
      name: sku.product_name,
      slug,
      category,
      images,
      videos: [],
      basePrice,
      priceUnit: null,
      commissionRate: null,
      currency: sku.currency ?? "USD",
      moq: moqFromNote(sku.price_note, mill?.moq),
      shippingTime: null,
      description: descriptionParts.join(" "),
      shortDescription: `${sku.product_name} — ${millName}`,
      specifications: {
        Supplier: millName,
        Category: category,
        ...(sku.price_note ? { "Price note": sku.price_note } : {}),
        "Price source type": priceSourceType,
        ...(soft ? { "Campus still": soft } : {}),
        ...(held
          ? {
              "QA hold":
                "Research QA — held from public /products until replacement images land",
            }
          : {}),
      },
      priceSourceType,
      aiGeneratedImage: false,
      customizationOptions: [],
      certifications: [],
      rating: null,
      reviewCount: null,
      sourceUrl: sku.source_url,
      productUrl: sku.source_url,
      imageSourceUrl: images[0] ?? null,
      verifiedSupplier: true,
      status: held ? "needs_info" : "approved",
      scrapedAt: "2026-09-07T17:04:59.000Z",
    });
  }
  return out;
}

export const listerDaily20260907Products: ScrapedProduct[] = buildProducts();

export function listerDaily20260907Count(): number {
  return listerDaily20260907Products.length;
}

export function listerDaily20260907PublicProducts(): ScrapedProduct[] {
  return listerDaily20260907Products.filter((p) => p.status === "approved");
}

export function listerDaily20260907HeldProducts(): ScrapedProduct[] {
  return listerDaily20260907Products.filter((p) => p.status === "needs_info");
}

export function listerDaily20260907PublicCount(): number {
  return listerDaily20260907PublicProducts().length;
}

export function listerDaily20260907HeldCount(): number {
  return listerDaily20260907HeldProducts().length;
}

export function listerDaily20260907ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerDaily20260907Products.filter((p) => p.supplierId === supplierId);
}
