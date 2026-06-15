import { prisma } from "@/lib/prisma";
import { mapSupplier, mapProduct, mapMaterial } from "@/lib/db-mappers";
import { products as staticProducts } from "@/data/products";
import { materials as staticMaterials } from "@/data/materials";
import { verifiedSuppliers } from "@/data/verified-suppliers";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";

// Prefer the real Outscraper dataset (public Google Maps data); fall back to the
// generated directory only if it's somehow empty.
const directoryFallback =
  outscraperSuppliers.length > 0 ? outscraperSuppliers : verifiedSuppliers;

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
