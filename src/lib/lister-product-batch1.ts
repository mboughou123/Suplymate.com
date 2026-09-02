/**
 * Supplier Lister product-media batch 1 → catalogue ScrapedProduct[].
 *
 * Resolved rows live in data/product-media-batch1-resolved.json (local JPEGs
 * under public/images/products/{packaging|tubes}/…). No Node fs — safe for
 * client imports via supplier-display.
 *
 * Rules:
 *  - unit_price null → RFQ / Price on request
 *  - priced → sourced currency + unit_price + unit (commissionRate 0)
 *  - PDF catalog URLs skipped; local JPEG preferred
 *  - supplier_slug_guess mapped to phase-1 supplier ids
 */

import resolvedJson from "../../data/product-media-batch1-resolved.json";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";

type ResolvedRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCountry: string | null;
  name: string;
  slug: string;
  category: ProductCategory;
  bucket: "packaging" | "tubes";
  supplierSlug: string;
  images: string[];
  basePrice: number | null;
  priceUnit: string | null;
  commissionRate: number | null;
  currency: string;
  moq: string | null;
  priceNote: string | null;
  sourceUrl: string;
  imageSourceUrl: string | null;
  verifiedSupplier: boolean;
  scrapedAt: string;
};

/** Map Lister supplier_slug_guess → phase-1 supplier id. */
export const LISTER_SUPPLIER_ID_BY_SLUG: Record<string, string> = {
  "dongguan-caicheng-printing": "dongguan-caicheng-printing-factory-cn",
  "shandong-corruone-new-material": "shandong-corruone-new-material-co-ltd-cn",
  "meghdoot-packaging": "meghdoot-packaging-uttaranchal-in",
  "dongguan-yalan-packing-materials": "dongguan-yalan-packing-materials-co-ltd-cn",
  "hangzhou-hansin-new-packing": "hangzhou-hansin-new-packing-material-co-ltd-cn",
  "al-gharbia-pipe": "al-gharbia-pipe-company-llc-ae",
  "aj-steel": "aj-steel-icad2-ae",
  "apl-apollo": "apl-apollo-tubes-limited-in",
  "jindal-saw": "jindal-saw-limited-in",
  "welspun-corp": "welspun-corp-limited-in",
  "arabian-pipes": "arabian-pipes-company-sa",
};

function toScraped(row: ResolvedRow): ScrapedProduct {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    supplierLogo: null,
    supplierCountry: row.supplierCountry,
    name: row.name,
    slug: row.slug,
    category: row.category,
    images: row.images,
    videos: [],
    basePrice: row.basePrice,
    priceUnit: row.priceUnit,
    commissionRate: row.commissionRate,
    currency: row.currency,
    moq: row.moq,
    shippingTime: null,
    description: row.priceNote
      ? `${row.name} from ${row.supplierName}. ${row.priceNote}`
      : `${row.name} from ${row.supplierName}.`,
    shortDescription: `${row.name} — ${row.supplierName}`,
    specifications: {
      Supplier: row.supplierName,
      Category: row.category,
      ...(row.priceNote ? { "Price note": row.priceNote } : {}),
      ...(row.priceUnit && row.basePrice != null ? { Unit: row.priceUnit } : {}),
    },
    customizationOptions: [],
    certifications: [],
    rating: null,
    reviewCount: null,
    sourceUrl: row.sourceUrl,
    productUrl: row.sourceUrl,
    imageSourceUrl: row.imageSourceUrl,
    verifiedSupplier: row.verifiedSupplier,
    status: "approved",
    scrapedAt: row.scrapedAt,
  };
}

const rows = resolvedJson as ResolvedRow[];

export const listerBatch1Products: ScrapedProduct[] = rows.map(toScraped);

export function listerProductsForSupplier(supplierId: string): ScrapedProduct[] {
  return listerBatch1Products.filter((p) => p.supplierId === supplierId);
}

export function listerBatch1Count(): number {
  return listerBatch1Products.length;
}
