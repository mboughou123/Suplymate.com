/**
 * Daily expansion 2026-09-09 product pack — OK 1 + soft 15 = 16 RFQ SKUs.
 *
 * Metadata: data/daily-2026-09-09-products.json
 * Photos:   public/images/products/{supplier-slug}/…
 * Seal:     data/daily-2026-09-09-researcher-products-seal.json
 *             (QA-DAILY-2026-09-09-PRODUCTS-RESEARCHER-PARTIAL)
 *
 * Honesty: all 16 SKUs are mill RFQ (never invent FOB / unit prices).
 * Photos: on-disk local JPGs only — no remote/stock fallbacks, no AI badges.
 * HOLD 34 omitted (including pepperl-fuchs product). Soft SKUs attach by
 * slug to a wired mill card when one exists (marcegaglia / ternium now do).
 */

import rawDaily from "../../data/daily-2026-09-09-products.json";
import rawDailyMills from "../../data/daily-2026-09-09-suppliers.json";
import {
  DAILY_20260909_SLUGS,
  dailySupplierIdForSlug20260909,
} from "@/lib/daily-2026-09-09-ids";
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

export const DAILY_20260909_PRODUCT_OK_SLUGS = ["sew-eurodrive"] as const;

export const DAILY_20260909_PRODUCT_SOFT_SLUGS = [
  "marcegaglia",
  "arvedi",
  "cayirova",
  "choo-bee",
  "procarsa",
  "rama",
  "zenith",
  "constellium",
  "orora",
  "kaeser",
  "swagelok",
  "yokogawa",
  "esab",
  "ternium",
  "daido-steel",
] as const;

/** Researcher HOLD — not in the JSON and must not appear in the catalogue. */
export const DAILY_20260909_HOLD_PRODUCT_SLUGS = [
  "tubacero",
  "umran",
  "noksel",
  "npc",
  "nexteel",
  "vetropack",
  "toyo-seikan",
  "elopak",
  "alpla",
  "novelis",
  "billerud",
  "coveris",
  "greatview",
  "kitz",
  "velan",
  "gea",
  "endress-hauser",
  "lincoln-electric",
  "donaldson",
  "howden",
  "pepperl-fuchs",
  "bonfiglioli",
  "wittenstein",
  "gates",
  "sfs",
  "lisi",
  "british-steel",
  "usiminas",
  "kobe-steel",
  "leoni",
  "helukabel",
  "lapp",
  "rockwool",
  "james-hardie",
] as const;

const WIRED_PRODUCT_SLUGS = new Set<string>([
  ...DAILY_20260909_PRODUCT_OK_SLUGS,
  ...DAILY_20260909_PRODUCT_SOFT_SLUGS,
]);

const WIRED_MILL_SLUGS = new Set<string>(DAILY_20260909_SLUGS);

const millById = new Map<string, { name: string; country: string | null; moq?: string | null }>();
for (const mill of (rawDailyMills as {
  suppliers?: { slug: string; company_name: string; country: string; moq?: string }[];
}).suppliers ?? []) {
  const id = dailySupplierIdForSlug20260909(mill.slug);
  millById.set(id, {
    name: mill.company_name,
    country: mill.country ?? null,
    moq: mill.moq ?? null,
  });
}

/**
 * Prefer the 09-09 mill-pack id when that mill is already in
 * daily20260909Suppliers; otherwise keep supplier_slug_guess so
 * product-only SKUs (mill HOLD out) attach without a mill card.
 */
export function daily20260909ProductSupplierId(slug: string): string {
  if (WIRED_MILL_SLUGS.has(slug)) {
    return dailySupplierIdForSlug20260909(slug);
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
    if (!WIRED_PRODUCT_SLUGS.has(sku.supplier_slug_guess)) continue;
    const category = toProductCategory(sku.category);
    if (!category) continue;
    const slug = sku.product_slug || slugifyProductName(sku.product_name);
    const supplierId = daily20260909ProductSupplierId(sku.supplier_slug_guess);
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
      id: `lister-b9-${sku.supplier_slug_guess}-${slug}`,
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
      scrapedAt: "2026-09-09T17:15:42.000Z",
    });
  }
  return out;
}

export const listerDaily20260909Products: ScrapedProduct[] = buildProducts();

export function listerDaily20260909Count(): number {
  return listerDaily20260909Products.length;
}

export function listerDaily20260909PublicProducts(): ScrapedProduct[] {
  return listerDaily20260909Products.filter((p) => p.status === "approved");
}

export function listerDaily20260909HeldProducts(): ScrapedProduct[] {
  return listerDaily20260909Products.filter((p) => p.status === "needs_info");
}

export function listerDaily20260909PublicCount(): number {
  return listerDaily20260909PublicProducts().length;
}

export function listerDaily20260909HeldCount(): number {
  return listerDaily20260909HeldProducts().length;
}

export function listerDaily20260909ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerDaily20260909Products.filter((p) => p.supplierId === supplierId);
}
