import { prisma } from "@/lib/prisma";
import { mapSupplier, mapProduct, mapMaterial } from "@/lib/db-mappers";
import { products as staticProducts } from "@/data/products";
import { materials as staticMaterials } from "@/data/materials";
import { verifiedSuppliers } from "@/data/verified-suppliers";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import { suppliers as legacySuppliers, type Supplier } from "@/data/suppliers";

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

export async function getSuppliersFromDb() {
  try {
    const rows = await prisma.supplier.findMany({
      orderBy: [{ score: "desc" }, { name: "asc" }],
    });
    // Fall back to the verified directory if the DB hasn't been imported yet
    // (or only has the legacy seed rows).
    if (rows.length < 50) return directoryFallback;
    return rows.map(mapSupplier);
  } catch {
    return directoryFallback;
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
    if (row) return mapSupplier(row);
  } catch {
    // ignore — fall through to the deterministic dataset
  }
  return allFallbackSuppliers().find((s) => s.id === slug) ?? null;
}

// Alias: slugs and ids are the same thing in this data model.
export async function getSupplierBySlug(slug: string): Promise<Supplier | null> {
  return getSupplierById(slug);
}

export async function getProductsFromDb() {
  try {
    const rows = await prisma.product.findMany({ orderBy: { name: "asc" } });
    if (rows.length === 0) return staticProducts;
    return rows.map(mapProduct);
  } catch {
    return staticProducts;
  }
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
