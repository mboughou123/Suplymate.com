import { INDUSTRIES } from "@/data/industries";
import { MATERIAL_CATALOG } from "@/data/material-catalog";
import { approvedPackProducts } from "@/data/pack-catalog";
import { pickHomeProducts, type HomeProductItem } from "@/lib/home-products";

/**
 * Homepage product grid and catalogue-sized stats. Supplier and country
 * counts are NOT taken from `packStats` (that file counts curated media-pack
 * mills only). The page passes `publicSupplierStats(await getSuppliersFromDb())`
 * so the hero matches the supplier directory.
 */
export type HomePageContent = {
  industryCount: number;
  materialCount: number;
  products: HomeProductItem[];
};

export function getHomePageContent(): HomePageContent {
  return {
    industryCount: INDUSTRIES.length,
    materialCount: MATERIAL_CATALOG.length,
    products: pickHomeProducts(approvedPackProducts()),
  };
}
