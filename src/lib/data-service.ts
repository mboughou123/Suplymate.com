import { prisma } from "@/lib/prisma";
import { mapSupplier, mapProduct, mapMaterial } from "@/lib/db-mappers";
import { suppliers as staticSuppliers } from "@/data/suppliers";
import { products as staticProducts } from "@/data/products";
import { materials as staticMaterials } from "@/data/materials";

export async function getSuppliersFromDb() {
  try {
    const rows = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    if (rows.length === 0) return staticSuppliers;
    return rows.map(mapSupplier);
  } catch {
    return staticSuppliers;
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
