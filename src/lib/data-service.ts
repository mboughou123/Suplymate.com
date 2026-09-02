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
import { phase1Suppliers } from "@/data/phase1-suppliers";
import { daily20260902Suppliers } from "@/lib/daily-2026-09-02-suppliers";
import { suppliers as legacySuppliers, type Supplier } from "@/data/suppliers";
import { compareForDirectory } from "@/lib/supplier-directory-sort";

export { compareForDirectory } from "@/lib/supplier-directory-sort";

// Prefer the real Outscraper dataset (public Google Maps data); fall back to the
// generated directory only if it's somehow empty.
const directoryFallback =
  outscraperSuppliers.length > 0 ? outscraperSuppliers : verifiedSuppliers;

/**
 * Merge supplier lists by id. Later lists win so the phase-1 factory pack can
 * overlay richer photos/descriptions onto Outscraper/DB rows without a prod
 * DB import.
 */
function mergeSuppliersById(...lists: Supplier[][]): Supplier[] {
  const byId = new Map<string, Supplier>();
  for (const list of lists) {
    for (const s of list) byId.set(s.id, s);
  }
  return [...byId.values()];
}

// Every supplier known to the deterministic (DB-less) fallback path. The union
// powers profile lookups and static params so links resolve whether the slug
// comes from the live directory, the generated verified set, or the legacy seed.
function allFallbackSuppliers(): Supplier[] {
  return mergeSuppliersById(
    directoryFallback,
    verifiedSuppliers,
    legacySuppliers,
    phase1Suppliers,
    daily20260902Suppliers
  );
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
  const status = s.verificationStatus;
  return !status || status === "verified";
}

export async function getSuppliersFromDb() {
  try {
    const rows = await prisma.supplier.findMany({
      orderBy: [{ score: "desc" }, { name: "asc" }],
    });
    // Fall back to the verified directory if the DB hasn't been imported yet
    // (or only has the legacy seed rows). Overlay the phase-1 factory pack so
    // curated local photos land without a production DB deploy.
    if (rows.length < 50) {
      return mergeSuppliersById(
        directoryFallback,
        phase1Suppliers,
        daily20260902Suppliers,
      ).sort(compareForDirectory);
    }
    // Never surface pending/rejected/needs_info imports on public surfaces.
    const fromDb = rows.map(mapSupplier).filter(isPubliclyVisible);
    return mergeSuppliersById(fromDb, phase1Suppliers, daily20260902Suppliers).sort(
      compareForDirectory,
    );
  } catch {
    return mergeSuppliersById(
      directoryFallback,
      phase1Suppliers,
      daily20260902Suppliers,
    ).sort(compareForDirectory);
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
      const mapped = mapSupplier(row);
      // Pending/rejected/needs_info imports must not be reachable by slug.
      return isPubliclyVisible(mapped) ? mapped : null;
    }
  } catch {
    // ignore — fall through to the deterministic dataset
  }
  return allFallbackSuppliers().find((s) => s.id === slug) ?? null;
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
