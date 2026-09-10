/**
 * Daily expansion 2026-09-08 product pack — prior OK 4 + soft 34, plus
 * HOLD12 Researcher OK 9 + soft 3 = 50 RFQ SKUs (HOLD=[]).
 *
 * Metadata: data/daily-2026-09-08-products.json
 * Photos:   public/images/products/{supplier-slug}/…
 * Seal:     data/daily-2026-09-08-researcher-hold12-products-seal.json
 *             (QA-HOLD12-PRODUCTS-RESEARCHER-OK)
 *
 * Honesty: all 50 SKUs are mill RFQ (never invent FOB / unit prices).
 * Photos: on-disk local JPGs only — no remote/stock fallbacks, no AI badges.
 * Fujikura wires fiber only (power quarantined). misumi SKU attaches by slug
 * without a mill card (mill stays HOLD distributor).
 */

import rawDaily from "../../data/daily-2026-09-08-products.json";
import rawDailyMills from "../../data/daily-2026-09-08-suppliers.json";
import {
  DAILY_20260908_SLUGS,
  dailySupplierIdForSlug20260908,
} from "@/lib/daily-2026-09-08-ids";
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
  honesty_note?: string | null;
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

export const DAILY_20260908_PRODUCT_OK_SLUGS = [
  "schuetz",
  "komatsu",
  "hitachi-cm",
  "volvo-ce",
] as const;

export const DAILY_20260908_PRODUCT_SOFT_SLUGS = [
  "eew",
  "butting",
  "eisenbau-kramer",
  "hengyang-valin",
  "changbao",
  "dura-bond",
  "chelpipe",
  "panyu-chu-kong",
  "borusan-mannesmann",
  "erciyas",
  "toscelik",
  "cangzhou-spiral",
  "verallia",
  "vidrala",
  "gerresheimer",
  "schneider-electric",
  "siemens",
  "rockwell-automation",
  "honeywell",
  "spirax-sarco",
  "rotork",
  "liebherr",
  "putzmeister",
  "caterpillar",
  "rittal",
  "nvent",
  "oriental-motor",
  "acerinox",
  "aperam",
  "carpenter",
  "nlmk",
  "algoma",
  "knauf",
  "owens-corning",
] as const;

/** HOLD12 Researcher OK — appended after the locked 4+34 set. */
export const DAILY_20260908_HOLD12_OK_SLUGS = [
  "can-pack",
  "mayr-melnhof",
  "constantia-flexibles",
  "rengo",
  "misumi",
  "legrand",
  "harmonic-drive",
  "fujikura",
  "belden",
] as const;

/** HOLD12 Researcher soft category generics. */
export const DAILY_20260908_HOLD12_SOFT_SLUGS = [
  "nine-dragons",
  "mauser",
  "sumitomo-electric",
] as const;

/** Researcher HOLD — empty after HOLD12 seal (QA-HOLD12-PRODUCTS-RESEARCHER-OK). */
export const DAILY_20260908_HOLD_PRODUCT_SLUGS = [] as const;

const WIRED_MILL_SLUGS = new Set<string>(DAILY_20260908_SLUGS);

const millById = new Map<string, { name: string; country: string | null; moq?: string | null }>();
for (const mill of (rawDailyMills as {
  suppliers?: { slug: string; company_name: string; country: string; moq?: string }[];
}).suppliers ?? []) {
  const id = dailySupplierIdForSlug20260908(mill.slug);
  millById.set(id, {
    name: mill.company_name,
    country: mill.country ?? null,
    moq: mill.moq ?? null,
  });
}

/**
 * Prefer the 09-08 mill-pack id when that mill is already in
 * daily20260908Suppliers; otherwise keep supplier_slug_guess so
 * product-only SKUs (nvent) attach without inventing a mill card.
 */
export function daily20260908ProductSupplierId(slug: string): string {
  if (WIRED_MILL_SLUGS.has(slug)) {
    return dailySupplierIdForSlug20260908(slug);
  }
  return slug;
}

export function publicPathFromDailyLocalImage(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (/^\/images\/products\/[^/]+\/[^/]+$/i.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/images\/products\/([^/]+\/[^/]+\.(?:jpe?g|png|webp))$/i);
  if (m) return `/images/products/${m[1]}`;
  return publicPathFromDailyEnhancedDst(trimmed);
}

function toProductCategory(raw: string | null | undefined): ProductCategory | null {
  if (!raw) return null;
  return CATEGORY_ALIASES[raw.trim()] ?? null;
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

function buildProducts(): ScrapedProduct[] {
  const items = (rawDaily as { products?: RawSku[] }).products ?? [];
  const out: ScrapedProduct[] = [];
  for (const sku of items) {
    const category = toProductCategory(sku.category);
    if (!category) continue;
    const slug = sku.product_slug || slugifyProductName(sku.product_name);
    const supplierId = daily20260908ProductSupplierId(sku.supplier_slug_guess);
    const mill = millById.get(supplierId);
    const images = localPublicImages(sku);
    const priceSourceType: PriceSourceType =
      parsePriceSourceType(sku.price_source_type) ?? "rfq";
    const millName = mill?.name ?? sku.supplier_name;
    const honesty = (sku.honesty_note ?? "").trim();
    const descriptionParts = [
      `${sku.product_name} from ${millName}.`,
      sku.price_note,
      honesty || null,
    ].filter(Boolean);
    out.push({
      id: `lister-b8-${sku.supplier_slug_guess}-${slug}`,
      supplierId,
      supplierName: millName,
      supplierLogo: null,
      supplierCountry: mill?.country ?? null,
      name: sku.product_name,
      slug,
      category,
      images,
      videos: [],
      basePrice: null,
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
        ...(honesty ? { "Honesty note": honesty } : {}),
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
      status: "approved",
      scrapedAt: "2026-09-08T17:06:17.000Z",
    });
  }
  return out;
}

export const listerDaily20260908Products: ScrapedProduct[] = buildProducts();

export function listerDaily20260908Count(): number {
  return listerDaily20260908Products.length;
}

export function listerDaily20260908PublicProducts(): ScrapedProduct[] {
  return listerDaily20260908Products.filter((p) => p.status === "approved");
}

export function listerDaily20260908HeldProducts(): ScrapedProduct[] {
  return listerDaily20260908Products.filter((p) => p.status === "needs_info");
}

export function listerDaily20260908PublicCount(): number {
  return listerDaily20260908PublicProducts().length;
}

export function listerDaily20260908HeldCount(): number {
  return listerDaily20260908HeldProducts().length;
}

export function listerDaily20260908ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerDaily20260908Products.filter((p) => p.supplierId === supplierId);
}
