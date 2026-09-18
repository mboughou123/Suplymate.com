import { INDUSTRIES } from "@/data/industries";
import { MATERIAL_CATALOG } from "@/data/material-catalog";
import { approvedPackProducts, packStats, packSuppliers } from "@/data/pack-catalog";
import { countSupplierCountries } from "@/lib/home-benefits";
import { pickHomeProducts, type HomeProductItem } from "@/lib/home-products";

/**
 * Homepage data that does not touch Prisma, Outscraper, or the full product
 * table. Those full-catalogue reads were the first-load bottleneck (TTFB plus
 * serial `/_next/image` work) — the hero stats and product grid only need the
 * curated pack that already ships in the repo.
 */
export type HomePageContent = {
  supplierCount: number;
  industryCount: number;
  materialCount: number;
  countryCount: number;
  products: HomeProductItem[];
};

export function getHomePageContent(): HomePageContent {
  return {
    supplierCount: packStats.suppliers,
    industryCount: INDUSTRIES.length,
    materialCount: MATERIAL_CATALOG.length,
    countryCount: countSupplierCountries(packSuppliers),
    products: pickHomeProducts(approvedPackProducts()),
  };
}
