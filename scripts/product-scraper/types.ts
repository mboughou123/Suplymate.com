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
  /**
   * Optional explicit supplier linkage. When omitted, the import step matches
   * the product to a supplier by the source URL's domain (and creates a PENDING
   * supplier if none exists) so products are never orphaned.
   */
  supplierId?: string;
  supplierName?: string;
  /** Optional category hint; inferred from the product name when omitted. */
  category?: ProductCategory;
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
