import { prisma } from "@/lib/prisma";
import {
  sampleScrapedProducts,
  type ScrapedProduct,
} from "@/data/scraped-products";
import type { Product, ProductCategory } from "@/data/products";

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
  name: string;
  category: string;
  images: string;
  videos: string;
  basePrice: number | null;
  commissionRate: number | null;
  currency: string;
  moq: string | null;
  shippingTime: string | null;
  description: string | null;
  specifications: string;
  customizationOptions: string;
  certifications: string;
  rating: number | null;
  reviewCount: number | null;
  sourceUrl: string;
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
    name: row.name,
    category: row.category as ProductCategory,
    images: parseJson<string[]>(row.images, []),
    videos: parseJson<string[]>(row.videos, []),
    basePrice: row.basePrice,
    commissionRate: row.commissionRate,
    currency: row.currency,
    moq: row.moq,
    shippingTime: row.shippingTime,
    description: row.description,
    specifications: parseJson<Record<string, string>>(row.specifications, {}),
    customizationOptions: parseJson<string[]>(row.customizationOptions, []),
    certifications: parseJson<string[]>(row.certifications, []),
    rating: row.rating,
    reviewCount: row.reviewCount,
    sourceUrl: row.sourceUrl,
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
    | "description"
    | "basePrice"
    | "commissionRate"
    | "moq"
    | "shippingTime"
    | "images"
    | "videos"
    | "supplierLogo"
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

  const updated: ScrapedProduct = { ...current, ...patch, id };
  overlay.set(id, updated);

  // Best-effort persistence; ignored when the table doesn't exist.
  try {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.basePrice !== undefined) data.basePrice = patch.basePrice;
    if (patch.commissionRate !== undefined) data.commissionRate = patch.commissionRate;
    if (patch.moq !== undefined) data.moq = patch.moq;
    if (patch.shippingTime !== undefined) data.shippingTime = patch.shippingTime;
    if (patch.images !== undefined) data.images = JSON.stringify(patch.images);
    if (patch.videos !== undefined) data.videos = JSON.stringify(patch.videos);
    if (patch.supplierLogo !== undefined) data.supplierLogo = patch.supplierLogo;
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

/* ------------------------------------------------------------------ */
/* Public catalogue conversion                                         */
/* ------------------------------------------------------------------ */

/** Convert an APPROVED scraped product into a catalogue Product. */
export function scrapedToProduct(sp: ScrapedProduct): Product {
  const base = sp.basePrice ?? 1;
  return {
    id: sp.id,
    name: sp.name,
    category: sp.category,
    // priceMin/priceMax keep legacy catalogue filters working; the rich card
    // and detail page recompute commissioned tiers from basePrice.
    priceMin: base,
    priceMax: Math.round(base * 1.35 * 100) / 100,
    currency: sp.currency,
    bestDeliveryDays: 14,
    supplierCount: 1,
    unit: "unit",
    supplierId: sp.supplierId,
    images: sp.images,
    videos: sp.videos,
    basePrice: base,
    commissionRate: sp.commissionRate ?? undefined,
    moq: sp.moq ?? undefined,
    shippingTime: sp.shippingTime ?? undefined,
    description: sp.description ?? undefined,
    specifications: sp.specifications,
    customizationOptions: sp.customizationOptions,
    rating: sp.rating ?? undefined,
    reviewCount: sp.reviewCount ?? undefined,
    sourceUrl: sp.sourceUrl,
    status: "approved",
  };
}
