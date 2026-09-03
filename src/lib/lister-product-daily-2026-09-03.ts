/**
 * Daily expansion 2026-09-03 (70 SKUs) → catalogue ScrapedProduct[].
 *
 * Metadata: data/daily-2026-09-03-products.json
 * Photos:   data/daily-2026-09-03-manifest-products.json
 *   → public/images/products/{supplier-slug}/…
 *
 * Honesty: all 70 SKUs are mill RFQ (never invent FOB / unit prices).
 * Photos: real local JPGs only — no remote/stock fallbacks, no AI badges.
 * No new mills — attach to existing phase-1 + 2026-09-02 mill ids.
 *
 * No remaining Research QA holds on this pack. All 70 SKUs are status
 * `approved`. Soft-but-OK (Ball beverage, SKF DGBB, Smurfit CGI, Tetra
 * Prisma/Brik) stay public. Flowserve TX3 / BigMax, KSB ISORIA, Huhtamaki
 * blueloop, Tenaris BlueCoil, and NSK HPS stay on their official mill stills.
 * Jiuli 6 + Ball Aluminum Aerosol were unhidden after sealed product stills
 * replaced the mismatched cards.
 */

import rawDaily from "../../data/daily-2026-09-03-products.json";
import rawDailyMills from "../../data/daily-2026-09-02-suppliers.json";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { parsePriceSourceType, type PriceSourceType } from "@/lib/price-source";
import { dailySupplierIdForSlug } from "@/lib/daily-2026-09-02-ids";
import { LISTER_DAILY_SUPPLIER_ID_BY_SLUG } from "@/lib/lister-product-daily-2026-09-02";
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
  Packaging: "Packaging",
};

const millById = new Map<string, { name: string; country: string | null; moq?: string | null }>();
for (const s of phase1Suppliers) {
  millById.set(s.id, { name: s.name, country: s.country ?? null, moq: s.moq ?? null });
}
for (const mill of (rawDailyMills as { suppliers?: { slug: string; company_name: string; country: string; moq?: string }[] }).suppliers ?? []) {
  const id = dailySupplierIdForSlug(mill.slug);
  millById.set(id, {
    name: mill.company_name,
    country: mill.country ?? null,
    moq: mill.moq ?? null,
  });
}

export function daily20260903SupplierId(slug: string): string {
  return LISTER_DAILY_SUPPLIER_ID_BY_SLUG[slug] ?? dailySupplierIdForSlug(slug);
}

/**
 * Stable Research QA holds: `supplier_slug_guess|product_slug`.
 * Empty — no remaining Research QA holds on this pack.
 */
export const DAILY_20260903_QA_HELD_KEYS = new Set<string>([]);

export const DAILY_20260903_QA_HELD_SUPPLIER_SLUGS = new Set<string>([]);

export function isDaily20260903QaHeld(
  supplierSlug: string,
  productSlug: string,
): boolean {
  if (DAILY_20260903_QA_HELD_SUPPLIER_SLUGS.has(supplierSlug)) return true;
  return DAILY_20260903_QA_HELD_KEYS.has(`${supplierSlug}|${productSlug}`);
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

function buildProducts(): ScrapedProduct[] {
  const items = (rawDaily as { products?: RawSku[] }).products ?? [];
  const out: ScrapedProduct[] = [];
  for (const sku of items) {
    const category = toProductCategory(sku.category);
    if (!category) continue;
    const slug = sku.product_slug || slugifyProductName(sku.product_name);
    const supplierId = daily20260903SupplierId(sku.supplier_slug_guess);
    const mill = millById.get(supplierId);
    const images = localPublicImages(sku);
    const priceSourceType: PriceSourceType =
      parsePriceSourceType(sku.price_source_type) ?? "rfq";
    // Pack contract: all RFQ — never invent FOB / unit prices even if a number sneaks in.
    const basePrice = null;
    const held = isDaily20260903QaHeld(sku.supplier_slug_guess, slug);
    out.push({
      id: `lister-b7-${sku.supplier_slug_guess}-${slug}`,
      supplierId,
      supplierName: mill?.name ?? sku.supplier_name,
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
      description: sku.price_note
        ? `${sku.product_name} from ${mill?.name ?? sku.supplier_name}. ${sku.price_note}`
        : `${sku.product_name} from ${mill?.name ?? sku.supplier_name}.`,
      shortDescription: `${sku.product_name} — ${mill?.name ?? sku.supplier_name}`,
      specifications: {
        Supplier: mill?.name ?? sku.supplier_name,
        Category: category,
        ...(sku.price_note ? { "Price note": sku.price_note } : {}),
        "Price source type": priceSourceType,
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
      // needs_info = held from public catalogue; JSON + photos remain on disk.
      status: held ? "needs_info" : "approved",
      scrapedAt: "2026-09-03T05:21:59.000Z",
    });
  }
  return out;
}

export const listerDaily20260903Products: ScrapedProduct[] = buildProducts();

export function listerDaily20260903Count(): number {
  return listerDaily20260903Products.length;
}

export function listerDaily20260903PublicProducts(): ScrapedProduct[] {
  return listerDaily20260903Products.filter((p) => p.status === "approved");
}

export function listerDaily20260903HeldProducts(): ScrapedProduct[] {
  return listerDaily20260903Products.filter((p) => p.status === "needs_info");
}

export function listerDaily20260903PublicCount(): number {
  return listerDaily20260903PublicProducts().length;
}

export function listerDaily20260903HeldCount(): number {
  return listerDaily20260903HeldProducts().length;
}

export function listerDaily20260903ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerDaily20260903Products.filter((p) => p.supplierId === supplierId);
}
