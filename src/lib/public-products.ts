// Public product catalogue data layer.
//
// Serves ONLY admin-published ("approved") scraped products plus the legacy
// static catalogue. Performs DB-level pagination + filtering over the
// ScrapedProduct table (the source of the 100+ catalogue) and falls back to an
// in-memory path (legacy demo products) when the DB is empty/unavailable.
//
// Hard rules enforced here:
//   - pending / rejected / needs_info products are NEVER returned.
//   - the green "Verified" badge is set ONLY when the linked supplier's
//     verificationStatus is actually "verified".
//   - NO fabricated ratings/reviews. Missing price -> "Contact supplier for
//     pricing"; missing MOQ/shipping -> omitted.

import { prisma } from "@/lib/prisma";
import { products as staticProducts } from "@/data/products";
import {
  listApprovedScrapedProducts,
  scrapedToProduct,
} from "@/lib/scraped-products-store";
import { getBestProductImage, hasRealProductImage } from "@/lib/image-fallback";
import { getPublishedProductImageMap } from "@/lib/media-public";
import { applyCommission, formatPrice, COMMISSION_RATE } from "@/config/commerce";
import type { Product, ProductCategory } from "@/data/products";

export type PublicProductCard = {
  id: string;
  name: string;
  category: string;
  supplierId: string;
  supplierName: string;
  supplierCountry: string | null;
  /** Whether the supplier profile page is publicly reachable (verified/legacy). */
  supplierVisible: boolean;
  /** True ONLY when the linked supplier is actually verified. */
  verified: boolean;
  imageUrl: string;
  hasRealPhoto: boolean;
  /** Commissioned price label, or null when no public price is available. */
  priceLabel: string | null;
  priceUnit: string | null;
  moq: string | null;
  shippingTime: string | null;
  productUrl: string | null;
};

export type PublicProductsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  supplierId?: string;
  country?: string;
  verifiedOnly?: boolean;
  hasPrice?: boolean;
};

export type CatalogueFacets = {
  categories: string[];
  countries: string[];
  suppliers: { id: string; name: string }[];
};

export type PublicProductsResult = {
  items: PublicProductCard[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: CatalogueFacets;
};

const DEFAULT_PAGE_SIZE = 24;

function clampPage(n: number | undefined): number {
  const v = Math.floor(Number(n) || 1);
  return v < 1 ? 1 : v;
}
function clampSize(n: number | undefined): number {
  const v = Math.floor(Number(n) || DEFAULT_PAGE_SIZE);
  return Math.min(Math.max(v, 1), 60);
}

function priceLabelFor(
  basePrice: number | null | undefined,
  currency: string,
  unit: string | null | undefined,
  rate?: number | null
): string | null {
  if (basePrice == null) return null;
  const label = formatPrice(applyCommission(basePrice, rate ?? COMMISSION_RATE), currency);
  return unit ? `${label} / ${unit}` : label;
}

/* ------------------------------------------------------------------ */
/* DB path (preferred; DB-level pagination)                            */
/* ------------------------------------------------------------------ */

type Where = Record<string, unknown>;

function buildWhere(q: PublicProductsQuery): Where {
  const where: Where = { status: "approved" };
  if (q.category) where.category = q.category;
  if (q.supplierId) where.supplierId = q.supplierId;
  if (q.country) where.supplierCountry = q.country;
  if (q.verifiedOnly) where.verifiedSupplier = true;
  if (q.hasPrice) where.basePrice = { not: null };
  if (q.search && q.search.trim()) {
    const s = q.search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { category: { contains: s, mode: "insensitive" } },
      { supplierName: { contains: s, mode: "insensitive" } },
    ];
  }
  return where;
}

async function fromDb(q: PublicProductsQuery): Promise<PublicProductsResult | null> {
  try {
    const where = buildWhere(q);
    const total = await prisma.scrapedProduct.count({ where });
    if (total === 0) return null; // allow the static fallback to populate dev

    const page = clampPage(q.page);
    const pageSize = clampSize(q.pageSize);
    const rows = await prisma.scrapedProduct.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Resolve live supplier verification + country + visibility in one query.
    const supplierIds = [...new Set(rows.map((r) => r.supplierId))];
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, country: true, verificationStatus: true },
    });
    const supMap = new Map(suppliers.map((s) => [s.id, s]));

    // Published Media (admin-curated) takes priority over the legacy JSON
    // `images` field; falls back to it when a product has no published media.
    const mediaMap = await getPublishedProductImageMap(rows.map((r) => r.id));

    const items: PublicProductCard[] = rows.map((r) => {
      const sup = supMap.get(r.supplierId);
      const verified = sup?.verificationStatus === "verified";
      const supplierVisible =
        !sup || !sup.verificationStatus || sup.verificationStatus === "verified";
      const published = mediaMap.get(r.id) ?? [];
      const images = published.length ? published : safeArray(r.images);
      const imageInput = {
        images,
        productName: r.name,
        category: r.category,
      };
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        supplierId: r.supplierId,
        supplierName: r.supplierName,
        supplierCountry: r.supplierCountry ?? sup?.country ?? null,
        supplierVisible,
        verified,
        imageUrl: getBestProductImage(imageInput),
        hasRealPhoto: hasRealProductImage(imageInput),
        priceLabel: priceLabelFor(r.basePrice, r.currency, r.priceUnit, r.commissionRate),
        priceUnit: r.priceUnit ?? null,
        moq: r.moq ?? null,
        shippingTime: r.shippingTime ?? null,
        productUrl: r.productUrl ?? r.sourceUrl ?? null,
      };
    });

    const facets = await dbFacets();
    return {
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      facets,
    };
  } catch {
    return null;
  }
}

function safeArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

async function dbFacets(): Promise<CatalogueFacets> {
  try {
    const [cats, countries, sups] = await Promise.all([
      prisma.scrapedProduct.findMany({
        where: { status: "approved" },
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.scrapedProduct.findMany({
        where: { status: "approved", supplierCountry: { not: null } },
        distinct: ["supplierCountry"],
        select: { supplierCountry: true },
      }),
      prisma.scrapedProduct.findMany({
        where: { status: "approved" },
        distinct: ["supplierId"],
        select: { supplierId: true, supplierName: true },
        orderBy: { supplierName: "asc" },
      }),
    ]);
    return {
      categories: cats.map((c) => c.category).filter(Boolean).sort(),
      countries: countries
        .map((c) => c.supplierCountry as string)
        .filter(Boolean)
        .sort(),
      suppliers: sups.map((s) => ({ id: s.supplierId, name: s.supplierName })),
    };
  } catch {
    return { categories: [], countries: [], suppliers: [] };
  }
}

/* ------------------------------------------------------------------ */
/* In-memory fallback (DB empty/unavailable)                           */
/* ------------------------------------------------------------------ */

function staticToCard(p: Product): PublicProductCard {
  const imageInput = {
    images: p.images,
    productName: p.name,
    category: p.category,
  };
  const base = p.basePrice ?? p.priceMin;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    supplierId: p.supplierId ?? "",
    supplierName: p.supplierName ?? "Suplymate catalogue",
    supplierCountry: p.supplierCountry ?? null,
    supplierVisible: Boolean(p.supplierId),
    verified: false,
    imageUrl: getBestProductImage(imageInput),
    hasRealPhoto: hasRealProductImage(imageInput),
    priceLabel: priceLabelFor(base, p.currency, p.unit, p.commissionRate),
    priceUnit: p.priceUnit ?? p.unit ?? null,
    moq: p.moq ?? null,
    shippingTime: p.shippingTime ?? null,
    productUrl: p.productUrl ?? null,
  };
}

async function fromMemory(q: PublicProductsQuery): Promise<PublicProductsResult> {
  const approved = await listApprovedScrapedProducts().catch(() => []);
  const merged: Product[] = [
    ...approved.map(scrapedToProduct),
    ...staticProducts,
  ];
  let cards = merged.map(staticToCard);

  // Filters.
  const s = (q.search ?? "").toLowerCase().trim();
  cards = cards.filter((c) => {
    if (s && !c.name.toLowerCase().includes(s) && !c.category.toLowerCase().includes(s)) {
      return false;
    }
    if (q.category && c.category !== q.category) return false;
    if (q.supplierId && c.supplierId !== q.supplierId) return false;
    if (q.country && c.supplierCountry !== q.country) return false;
    if (q.verifiedOnly && !c.verified) return false;
    if (q.hasPrice && !c.priceLabel) return false;
    return true;
  });

  const total = cards.length;
  const page = clampPage(q.page);
  const pageSize = clampSize(q.pageSize);
  const items = cards.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const facets: CatalogueFacets = {
    categories: [...new Set(merged.map((p) => p.category))].sort() as ProductCategory[],
    countries: [...new Set(cards.map((c) => c.supplierCountry).filter(Boolean))].sort() as string[],
    suppliers: [
      ...new Map(
        cards.filter((c) => c.supplierId).map((c) => [c.supplierId, { id: c.supplierId, name: c.supplierName }])
      ).values(),
    ],
  };

  return { items, total, page, pageSize, hasMore: page * pageSize < total, facets };
}

/** Public catalogue page (DB-paginated; memory fallback for dev/no-DB). */
export async function getPublicProductsPage(
  q: PublicProductsQuery
): Promise<PublicProductsResult> {
  const db = await fromDb(q);
  if (db) return db;
  return fromMemory(q);
}
