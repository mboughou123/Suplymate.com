import { listerBatch1Products } from "@/lib/lister-product-batch1";
import { listerBatch2Products } from "@/lib/lister-product-batch2";
import { listerBatch3Products } from "@/lib/lister-product-batch3";
import { listerGapsFillProducts } from "@/lib/lister-product-gaps-fill";
import { listerGapsFill2Products } from "@/lib/lister-product-gaps-fill-2";
import { listerDaily20260902Products } from "@/lib/lister-product-daily-2026-09-02";
import { listerDaily20260903Products } from "@/lib/lister-product-daily-2026-09-03";
import type { ScrapedProduct } from "@/data/scraped-products";

export const listerCatalogueProducts: ScrapedProduct[] = [
  ...listerBatch1Products,
  ...listerBatch2Products,
  ...listerBatch3Products,
  ...listerGapsFillProducts,
  ...listerGapsFill2Products,
  ...listerDaily20260902Products,
  ...listerDaily20260903Products,
];

export function listerProductsForSupplier(supplierId: string): ScrapedProduct[] {
  return listerCatalogueProducts.filter((p) => p.supplierId === supplierId);
}
