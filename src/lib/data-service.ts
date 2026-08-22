import { prisma } from "@/lib/prisma";
import { mapSupplier, mapProduct, mapMaterial } from "@/lib/db-mappers";
import { products as staticProducts, type Product } from "@/data/products";
import { materials as staticMaterials } from "@/data/materials";
import {
  listApprovedScrapedProducts,
  scrapedToProduct,
} from "@/lib/scraped-products-store";
import { verifiedSuppliers } from "@/data/verified-suppliers";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import { suppliers as legacySuppliers, type Supplier } from "@/data/suppliers";
import { isRealImageUrl } from "@/lib/image-fallback";
import {
  isMarketplaceVisible,
  isVerified,
} from "@/lib/verification";

// A supplier "has an image" if it carries a primary photo or any gallery image.
// Image-bearing suppliers are surfaced first so empty/untrustworthy cards never
// lead the directory.
function supplierHasImage(s: Supplier): boolean {
  return (
    isRealImageUrl(s.imageUrl) ||
    Boolean(s.supplierImages?.some((url) => isRealImageUrl(url)))
  );
}

// Public directory ordering: image-bearing first, then by Suplymate score
// (falling back to reliabilityScore), then alphabetically. Used so the server
// and the client agree on ordering.
export function compareForDirectory(a: Supplier, b: Supplier): number {
  const img = Number(supplierHasImage(b)) - Number(supplierHasImage(a));
  if (img) return img;
  const score = (b.score ?? b.reliabilityScore ?? 0) - (a.score ?? a.reliabilityScore ?? 0);
  if (score) return score;
  return a.name.localeCompare(b.name);
}

// Prefer the real Outscraper dataset (public Google Maps data); fall back to the
// generated directory only if it's somehow empty.
const directoryFallback =
  outscraperSuppliers.length > 0 ? outscraperSuppliers : verifiedSuppliers;

// Every supplier known to the deterministic (DB-less) fallback path. The union
// powers profile lookups and static params so links resolve whether the slug
// comes from the live directory, the generated verified set, or the legacy seed.
function allFallbackSuppliers(): Supplier[] {
  const byId = new Map<string, Supplier>();
  for (const s of [...directoryFallback, ...verifiedSuppliers, ...legacySuppliers]) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }
  return [...byId.values()];
}

export function getFallbackSupplierIds(): string[] {
  return allFallbackSuppliers().map((s) => s.id);
}

/**
 * Public visibility gate for the supplier moderation system.
 *
 * Suppliers collected via CSV import / the website scraper carry an explicit
 * `verificationStatus` and must be admin-approved ("verified") before they are
 * exposed publicly. Legacy/seed directory suppliers have NO verificationStatus
 * (undefined) and remain visible — so this is additive and non-breaking.
 *
 * Rule: hide ONLY records whose status is explicitly a non-verified moderation
 * state (pending / rejected / needs_info).
 */
function isPubliclyVisible(s: Supplier): boolean {
  return isMarketplaceVisible(s.marketplaceStatus);
}

function withHonestVerification(s: Supplier): Supplier {
  return {
    ...s,
    verified: isVerified({
      marketplaceStatus: s.marketplaceStatus,
      verifiedBy: s.verifiedBy,
    }),
  };
}

export async function getSuppliersFromDb() {
  try {
    const rows = await prisma.supplier.findMany({
      orderBy: [{ score: "desc" }, { name: "asc" }],
    });
    // Fall back to the verified directory if the DB hasn't been imported yet
    // (or only has the legacy seed rows).
    if (rows.length < 50) {
      return directoryFallback
        .map(withHonestVerification)
        .sort(compareForDirectory);
    }
    // Marketplace lifecycle is authoritative for public visibility.
    return rows
      .map(mapSupplier)
      .filter(isPubliclyVisible)
      .map(withHonestVerification)
      .sort(compareForDirectory);
  } catch {
    return directoryFallback
      .map(withHonestVerification)
      .sort(compareForDirectory);
  }
}

// Look up a single supplier by id (the id IS the slug, e.g.
// "rotterdam-steel-works"). Tries the DB first, then falls back to the
// deterministic dataset — so profile pages render with NO database.
export async function getSupplierById(id: string): Promise<Supplier | null> {
  const slug = (id ?? "").trim().toLowerCase();
  if (!slug) return null;
  try {
    const row = await prisma.supplier.findUnique({ where: { id: slug } });
    if (row) {
      const mapped = withHonestVerification(mapSupplier(row));
      return isPubliclyVisible(mapped) ? mapped : null;
    }
  } catch {
    // ignore — fall through to the deterministic dataset
  }
  const fallback = allFallbackSuppliers().find((s) => s.id === slug);
  return fallback ? withHonestVerification(fallback) : null;
}

// Alias: slugs and ids are the same thing in this data model.
export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  return getSupplierById(slug);
}

async function getBaseProducts(): Promise<Product[]> {
  try {
    const rows = await prisma.product.findMany({ orderBy: { name: "asc" } });
    if (rows.length === 0) return staticProducts;
    return rows.map(mapProduct);
  } catch {
    return staticProducts;
  }
}

// Public catalogue = base products + ADMIN-APPROVED scraped products.
// Pending/rejected scraped products are never returned here.
export async function getProductsFromDb(): Promise<Product[]> {
  const base = await getBaseProducts();
  try {
    const approved = await listApprovedScrapedProducts();
    const ids = new Set(base.map((p) => p.id));
    const extra = approved.map(scrapedToProduct).filter((p) => !ids.has(p.id));
    return [...base, ...extra];
  } catch {
    return base;
  }
}

// Resolve a single catalogue product by id for the detail page: base products
// first, then approved scraped products. Returns null for unknown/unapproved.
export async function getProductByIdAsync(id: string): Promise<Product | null> {
  const slug = (id ?? "").trim();
  if (!slug) return null;
  const base = await getBaseProducts();
  const hit = base.find((p) => p.id === slug);
  if (hit) return hit;
  try {
    const approved = await listApprovedScrapedProducts();
    const sp = approved.find((p) => p.id === slug);
    if (sp) return scrapedToProduct(sp);
  } catch {
    // ignore
  }
  return null;
}

export async function getMaterialsFromDb() {
  try {
    const rows = await prisma.material.findMany({ orderBy: { name: "asc" } });
    if (rows.length === 0) return staticMaterials;
    return rows.map(mapMaterial);
  } catch {
    return staticMaterials;
  }
}
