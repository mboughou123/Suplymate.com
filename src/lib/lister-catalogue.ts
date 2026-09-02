import { listerBatch1Products } from "@/lib/lister-product-batch1";
import { listerBatch2Products } from "@/lib/lister-product-batch2";
import type { ScrapedProduct } from "@/data/scraped-products";

export const listerCatalogueProducts: ScrapedProduct[] = [
  ...listerBatch1Products,
  ...listerBatch2Products,
];

export function listerProductsForSupplier(supplierId: string): ScrapedProduct[] {
  return listerCatalogueProducts.filter((p) => p.supplierId === supplierId);
}
