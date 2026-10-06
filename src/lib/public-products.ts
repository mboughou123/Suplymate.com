// Public product catalogue data layer.
//
// Serves ONLY admin-published ("approved") scraped products plus the curated
// pack-catalog RFQ SKUs and the legacy static catalogue. DB-level pagination
// is used only when the ScrapedProduct table already contains every approved
// pack product (after `db:seed:packs`). A leftover scrape of a handful of
// rows must not hide the pack catalogue — same rule as `mergePackSuppliers`
// on /en/suppliers. Falls back to the in-memory merge when the DB is empty,
// incomplete, or unavailable.
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
import {
  getProductFallbackImage,
  getRealProductImage,
  getRemoteProductImage,
  GENERIC_PRODUCT_PLACEHOLDER,
  type ProductImageInput,
} from "@/lib/image-fallback";
import { isNavigationTitle, NAVIGATION_TITLES } from "@/lib/catalog-junk";
import { proxiedProductImageUrl } from "@/lib/remote-product-image";
import { resolveCatalogSupplier, supplierIdCandidates } from "@/lib/catalog-supplier";
import { getFallbackSupplierNames } from "@/lib/data-service";
import { approvedPackProducts, getPackProduct, getPackSupplier } from "@/data/pack-catalog";
import { getPublishedProductImageMap } from "@/lib/media-public";
import { applyCommission, formatPrice, COMMISSION_RATE } from "@/config/commerce";
import type { Product, ProductCategory } from "@/data/products";
import { PRODUCT_LIST_PAGE_SIZE } from "@/lib/products-query";
import { displayImageUrl, readImageAttribution } from "@/lib/image-attribution";

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
  /** True when the card is showing an AI illustration because no real photo exists. */
  aiGenerated: boolean;
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

const DEFAULT_PAGE_SIZE = PRODUCT_LIST_PAGE_SIZE;

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

/**
 * The product's own photo wins over a still borrowed from its supplier's
 * folder; a scraped remote photo is re-hosted through the signed proxy.
 */
export function resolveCardImage(input: ProductImageInput): { imageUrl: string; hasRealPhoto: boolean; aiGenerated: boolean } {
  const listed = (input.images ?? []).filter((url): url is string => typeof url === "string");
  const realUrls = listed.filter((url) => !readImageAttribution({ url }).aiGenerated).map(displayImageUrl);
  const aiUrls = listed.filter((url) => readImageAttribution({ url }).aiGenerated);
  const realInput = { ...input, images: realUrls };
  const real = getRealProductImage(realInput);
  if (real && realUrls.includes(real)) return { imageUrl: real, hasRealPhoto: true, aiGenerated: false };
  const remote = getRemoteProductImage(realInput);
  const proxied = remote ? proxiedProductImageUrl(remote) : null;
  if (proxied) return { imageUrl: proxied, hasRealPhoto: true, aiGenerated: false };
  if (real) return { imageUrl: real, hasRealPhoto: true, aiGenerated: false };
  if (aiUrls[0]) return { imageUrl: displayImageUrl(aiUrls[0]), hasRealPhoto: false, aiGenerated: true };
  return {
    imageUrl: getProductFallbackImage(input.productName, input.category) ?? GENERIC_PRODUCT_PLACEHOLDER,
    hasRealPhoto: false,
    aiGenerated: false,
  };
}

/* ------------------------------------------------------------------ */
/* DB path (preferred; DB-level pagination)                            */
/* ------------------------------------------------------------------ */

type Where = Record<string, unknown>;

const PUBLISHED = {
  status: "approved",
  NOT: { name: { in: [...NAVIGATION_TITLES], mode: "insensitive" as const } },
};

function buildWhere(q: PublicProductsQuery): Where {
  const where: Where = { ...PUBLISHED };
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
    const packApproved = approvedPackProducts();
    if (packApproved.length > 0) {
      const packIds = packApproved.map((p) => p.id);
      const packInDb = await prisma.scrapedProduct.count({
        where: { status: "approved", id: { in: packIds } },
      });
      // Incomplete seed (live leftover scrape): do not page a tiny payload.
      if (packInDb < packApproved.length) return null;
    }

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
    const supplierIds = [...new Set(rows.flatMap((r) => supplierIdCandidates(r.supplierId)))];
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true, country: true, verificationStatus: true },
    });
    const supMap = new Map(suppliers.map((s) => [s.id, s]));
    const profiles = publicProfiles();
    for (const s of suppliers) {
      if (!s.verificationStatus || s.verificationStatus === "verified") profiles.set(s.id, s.name);
      else profiles.delete(s.id);
    }

    // Published Media (admin-curated) takes priority over the legacy JSON
    // `images` field; falls back to it when a product has no published media.
    const mediaMap = await getPublishedProductImageMap(rows.map((r) => r.id));

    const items: PublicProductCard[] = rows.filter((r) => !isNavigationTitle(r.name)).map((r) => {
      const supplier = resolveCatalogSupplier(r.supplierId, r.supplierName, profiles);
      const sup = supMap.get(supplier.id);
      const verified = sup?.verificationStatus === "verified";
      const published = mediaMap.get(r.id) ?? [];
      const pack = getPackProduct(r.id);
      const legacy = published.length ? published : safeArray(r.images);
      const images = [...new Set([...(pack?.images ?? []), ...legacy])];
      const imageInput = {
        images,
        id: r.id,
        slug: r.slug ?? pack?.slug ?? pack?.packSlug,
        supplierId: r.supplierId,
        productName: r.name,
        category: r.category,
      };
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierCountry: r.supplierCountry ?? sup?.country ?? null,
        supplierVisible: supplier.hasProfile,
        verified,
        ...resolveCardImage(imageInput),
        priceLabel: priceLabelFor(r.basePrice, r.currency, r.priceUnit, r.commissionRate),
        priceUnit: r.priceUnit ?? null,
        moq: cleanHint(r.moq),
        shippingTime: cleanHint(r.shippingTime),
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

/**
 * Scraped MOQ / shipping hints are sometimes sentence fragments cut out of the
 * page ("& Shipping", "ping anywhere in Canada…"). Keep only text that starts
 * like a value.
 */
export function cleanHint(text: string | null | undefined): string | null {
  const t = (text ?? "").trim();
  if (t.length < 3 || !/^[A-Z0-9≤<>~]/.test(t)) return null;
  return t;
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
        where: PUBLISHED,
        distinct: ["category"],
        select: { category: true },
      }),
      prisma.scrapedProduct.findMany({
        where: { ...PUBLISHED, supplierCountry: { not: null } },
        distinct: ["supplierCountry"],
        select: { supplierCountry: true },
      }),
      prisma.scrapedProduct.findMany({
        where: PUBLISHED,
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

/** id → name of suppliers with a public profile page (product-host-only mills excluded). */
function publicProfiles(): Map<string, string> {
  const out = new Map<string, string>();
  for (const [id, name] of getFallbackSupplierNames()) {
    if (!getPackSupplier(id)?.productHostOnly) out.set(id, name);
  }
  return out;
}

function staticToCard(p: Product, profiles: ReadonlyMap<string, string>): PublicProductCard {
  const supplier = resolveCatalogSupplier(p.supplierId, p.supplierName, profiles);
  const pack = getPackProduct(p.id);
  const images = [...new Set([...(pack?.images ?? []), ...(p.images ?? [])])];
  const imageInput = {
    images,
    id: p.id,
    slug: p.slug ?? pack?.slug ?? pack?.packSlug,
    supplierId: p.supplierId,
    productName: p.name,
    category: p.category,
  };
  // RFQ-only listings (mill quotes, no public price) come through
  // scrapedToProduct with basePrice undefined and a legacy priceMin of 0 —
  // that is "no price", never "$0.00".
  const base = p.basePrice ?? (p.priceMin > 0 ? p.priceMin : null);
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierCountry: p.supplierCountry ?? null,
    supplierVisible: supplier.hasProfile,
    verified: false,
    ...resolveCardImage(imageInput),
    priceLabel: priceLabelFor(base, p.currency, p.unit, p.commissionRate),
    priceUnit: p.priceUnit ?? p.unit ?? null,
    moq: cleanHint(p.moq),
    shippingTime: cleanHint(p.shippingTime),
    productUrl: p.productUrl ?? null,
  };
}

async function fromMemory(q: PublicProductsQuery): Promise<PublicProductsResult> {
  const approved = await listApprovedScrapedProducts().catch(() => []);
  const merged: Product[] = [
    ...approved.map(scrapedToProduct),
    ...staticProducts,
  ];
  const profiles = publicProfiles();
  let cards = merged.filter((p) => !isNavigationTitle(p.name)).map((p) => staticToCard(p, profiles));

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
