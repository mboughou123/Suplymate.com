import type { ScrapedProduct } from "../../src/data/scraped-products";
import type { ProductCategory } from "../../src/data/products";

export type { ScrapedProduct };

/**
 * A public supplier catalogue/listing page to collect product data from.
 * Only public, non-authenticated pages should ever be listed here.
 */
export type ScrapeTarget = {
  /** Stable short id used to namespace scraped product ids. */
  key: string;
  supplierId: string;
  supplierName: string;
  category: ProductCategory;
  currency?: string;
  /** Public product or listing URL (no login / no query-auth). */
  url: string;
};

export type ScrapeStats = {
  attempted: number;
  scraped: number;
  skippedRobots: number;
  skippedDuplicate: number;
  errors: number;
};
