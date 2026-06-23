import { prisma } from "@/lib/prisma";
import {
  sampleScrapedProducts,
  type ScrapedProduct,
} from "@/data/scraped-products";
import type { Product, ProductCategory } from "@/data/products";
import { persistProductImage } from "@/lib/image-storage";

/* ------------------------------------------------------------------ */
/* In-memory overlay                                                   */
/* ------------------------------------------------------------------ */
// Lets admin edits persist for the lifetime of a running server even when the
// DB table isn't provisioned (local dev / demo). When the DB IS available it is
// the source of truth and the overlay is bypassed.

const overlay = new Map<string, ScrapedProduct>();
let seeded = false;

function ensureSeed() {
  if (seeded) return;
  for (const p of sampleScrapedProducts) {
    if (!overlay.has(p.id)) overlay.set(p.id, { ...p });
  }
  seeded = true;
}

/* ------------------------------------------------------------------ */
/* DB row <-> domain mapping                                           */
/* ------------------------------------------------------------------ */

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type ScrapedRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierLogo: string | null;
  supplierCountry?: string | null;
  name: string;
  slug?: string | null;
  category: string;
  images: string;
  videos: string;
  basePrice: number | null;
  priceUnit?: string | null;
  commissionRate: number | null;
  currency: string;
  moq: string | null;
  minimumOrderUnit?: string | null;
  shippingTime: string | null;
  description: string | null;
  shortDescription?: string | null;
  specifications: string;
  customizationOptions: string;
  certifications: string;
  rating: number | null;
  reviewCount: number | null;
  sourceUrl: string;
  productUrl?: string | null;
  imageSourceUrl?: string | null;
  sku?: string | null;
  verifiedSupplier: boolean;
  status: string;
  scrapedAt: Date | string;
};

function mapRow(row: ScrapedRow): ScrapedProduct {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    supplierLogo: row.supplierLogo,
    supplierCountry: row.supplierCountry ?? null,
    name: row.name,
    slug: row.slug ?? null,
    category: row.category as ProductCategory,
    images: parseJson<string[]>(row.images, []),
    videos: parseJson<string[]>(row.videos, []),
    basePrice: row.basePrice,
    priceUnit: row.priceUnit ?? null,
    commissionRate: row.commissionRate,
    currency: row.currency,
    moq: row.moq,
    minimumOrderUnit: row.minimumOrderUnit ?? null,
    shippingTime: row.shippingTime,
    description: row.description,
    shortDescription: row.shortDescription ?? null,
    specifications: parseJson<Record<string, string>>(row.specifications, {}),
    customizationOptions: parseJson<string[]>(row.customizationOptions, []),
    certifications: parseJson<string[]>(row.certifications, []),
    rating: row.rating,
    reviewCount: row.reviewCount,
    sourceUrl: row.sourceUrl,
    productUrl: row.productUrl ?? null,
    imageSourceUrl: row.imageSourceUrl ?? null,
    sku: row.sku ?? null,
    verifiedSupplier: row.verifiedSupplier,
    status: row.status as ScrapedProduct["status"],
    scrapedAt:
      row.scrapedAt instanceof Date ? row.scrapedAt.toISOString() : row.scrapedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function listScrapedProducts(): Promise<ScrapedProduct[]> {
  try {
    const rows = await prisma.scrapedProduct.findMany({
      orderBy: { scrapedAt: "desc" },
    });
    if (rows.length) return rows.map((r) => mapRow(r as ScrapedRow));
  } catch {
    // table not provisioned — fall back to the in-memory overlay/seed
  }
  ensureSeed();
  return [...overlay.values()].sort((a, b) =>
    b.scrapedAt.localeCompare(a.scrapedAt)
  );
}

export async function getScrapedProduct(
  id: string
): Promise<ScrapedProduct | null> {
  try {
    const row = await prisma.scrapedProduct.findUnique({ where: { id } });
    if (row) return mapRow(row as ScrapedRow);
  } catch {
    // ignore
  }
  ensureSeed();
  return overlay.get(id) ?? null;
}

export async function listApprovedScrapedProducts(): Promise<ScrapedProduct[]> {
  const all = await listScrapedProducts();
  return all.filter((p) => p.status === "approved");
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export type ScrapedPatch = Partial<
  Pick<
    ScrapedProduct,
    | "name"
    | "category"
    | "description"
    | "shortDescription"
    | "basePrice"
    | "priceUnit"
    | "commissionRate"
    | "moq"
    | "minimumOrderUnit"
    | "shippingTime"
    | "images"
    | "videos"
    | "supplierLogo"
    | "imageSourceUrl"
    | "productUrl"
    | "verifiedSupplier"
    | "status"
  >
>;

export async function updateScrapedProduct(
  id: string,
  patch: ScrapedPatch
): Promise<ScrapedProduct | null> {
  ensureSeed();
  const current = (await getScrapedProduct(id)) ?? overlay.get(id) ?? null;
  if (!current) return null;

  // On publish (status -> approved), re-host the primary image through the
  // configured storage provider so the public catalogue never depends solely
  // on a fragile hotlink. With no provider configured this is a passthrough
  // that keeps the original URL + records imageSourceUrl for attribution.
  if (patch.status === "approved" && current.status !== "approved") {
    const images = patch.images ?? current.images ?? [];
    const primary = images.find((u) => /^https?:\/\//i.test(u));
    if (primary) {
      const sourceUrl = current.imageSourceUrl ?? primary;
      const stored = await persistProductImage(primary, id).catch(() => null);
      if (stored && stored !== primary) {
        patch.images = [stored, ...images.filter((u) => u !== stored)];
      }
      if (patch.imageSourceUrl === undefined) patch.imageSourceUrl = sourceUrl;
    }
  }

  const updated: ScrapedProduct = { ...current, ...patch, id };
  overlay.set(id, updated);

  // Best-effort persistence; ignored when the table doesn't exist.
  try {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.category !== undefined) data.category = patch.category;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.shortDescription !== undefined) data.shortDescription = patch.shortDescription;
    if (patch.basePrice !== undefined) data.basePrice = patch.basePrice;
    if (patch.priceUnit !== undefined) data.priceUnit = patch.priceUnit;
    if (patch.commissionRate !== undefined) data.commissionRate = patch.commissionRate;
    if (patch.moq !== undefined) data.moq = patch.moq;
    if (patch.minimumOrderUnit !== undefined) data.minimumOrderUnit = patch.minimumOrderUnit;
    if (patch.shippingTime !== undefined) data.shippingTime = patch.shippingTime;
    if (patch.images !== undefined) data.images = JSON.stringify(patch.images);
    if (patch.videos !== undefined) data.videos = JSON.stringify(patch.videos);
    if (patch.supplierLogo !== undefined) data.supplierLogo = patch.supplierLogo;
    if (patch.imageSourceUrl !== undefined) data.imageSourceUrl = patch.imageSourceUrl;
    if (patch.productUrl !== undefined) data.productUrl = patch.productUrl;
    if (patch.verifiedSupplier !== undefined) data.verifiedSupplier = patch.verifiedSupplier;
    if (patch.status !== undefined) data.status = patch.status;
    if (Object.keys(data).length) {
      await prisma.scrapedProduct.update({ where: { id }, data });
    }
  } catch {
    // no DB — overlay holds the change for this session
  }

  return updated;
}

/** Permanently delete a scraped product (admin only). */
export async function deleteScrapedProduct(id: string): Promise<boolean> {
  ensureSeed();
  const existed = overlay.delete(id);
  try {
    await prisma.scrapedProduct.delete({ where: { id } });
    return true;
  } catch {
    return existed;
  }
}

/* ------------------------------------------------------------------ */
/* Public catalogue conversion                                         */
/* ------------------------------------------------------------------ */

/** Convert an APPROVED scraped product into a catalogue Product. */
export function scrapedToProduct(sp: ScrapedProduct): Product {
  const hasPublicPrice = sp.basePrice != null;
  const base = sp.basePrice ?? 0;
  return {
    id: sp.id,
    name: sp.name,
    category: sp.category,
    // priceMin/priceMax keep legacy catalogue filters working; the rich card
    // and detail page recompute commissioned tiers from basePrice.
    priceMin: base,
    priceMax: hasPublicPrice ? Math.round(base * 1.35 * 100) / 100 : 0,
    currency: sp.currency,
    bestDeliveryDays: 14,
    supplierCount: 1,
    unit: sp.priceUnit ?? "unit",
    supplierId: sp.supplierId,
    supplierName: sp.supplierName,
    supplierCountry: sp.supplierCountry ?? undefined,
    images: sp.images,
    videos: sp.videos,
    basePrice: hasPublicPrice ? base : undefined,
    hasPublicPrice,
    priceUnit: sp.priceUnit ?? undefined,
    minimumOrderUnit: sp.minimumOrderUnit ?? undefined,
    commissionRate: sp.commissionRate ?? undefined,
    moq: sp.moq ?? undefined,
    shippingTime: sp.shippingTime ?? undefined,
    description: sp.description ?? undefined,
    specifications: sp.specifications,
    customizationOptions: sp.customizationOptions,
    rating: sp.rating ?? undefined,
    reviewCount: sp.reviewCount ?? undefined,
    sourceUrl: sp.sourceUrl,
    productUrl: sp.productUrl ?? undefined,
    imageSourceUrl: sp.imageSourceUrl ?? undefined,
    status: "approved",
  };
}
