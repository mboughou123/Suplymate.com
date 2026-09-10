/**
 * Supplier Lister product-media batch 1 → catalogue ScrapedProduct[].
 *
 * Metadata: data/product-media-batch1.json (via precomputed resolved rows).
 * Photos:   data/product-media-batch1-enhanced-manifest.json — local JPEGs
 * under public/images/products/{packaging|tubes}/{supplier_slug_guess}/…
 *
 * Cards always use those LOCAL public paths. Remote image_urls are attribution
 * only (imageSourceUrl) — never card/gallery sources.
 *
 * Mapping: supplier_slug_guess + product_slug (or slugified name) against
 * Lister-style filenames. Secondary `-2.jpg` variants are attached when present.
 *
 * Rules:
 *  - unit_price null → RFQ / Price on request
 *  - priced → sourced currency + unit_price + unit (commissionRate 0)
 *  - PDF catalog URLs skipped
 *  - supplier_slug_guess mapped to phase-1 supplier ids
 *
 * No Node fs — safe for client imports via supplier-display.
 */

import resolvedJson from "../../data/product-media-batch1-resolved.json";
import enhancedManifest from "../../data/product-media-batch1-enhanced-manifest.json";
import rawBatch from "../../data/product-media-batch1.json";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { parsePriceSourceType, type PriceSourceType } from "@/lib/price-source";

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
  priceSourceType?: PriceSourceType | null;
};

type ManifestEntry = { repo_path: string; from?: string };

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

const STOP_TOKENS = new Set(["and", "for", "the", "of", "with", "from", "per"]);

export function slugifyProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[''`"]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tokens(slug: string): Set<string> {
  return new Set(
    slug.split("-").filter((t) => t.length > 1 && !STOP_TOKENS.has(t))
  );
}

function stemOfFilename(filename: string): string {
  return filename.replace(/\.(jpe?g|png|webp)$/i, "").replace(/-\d+$/, "");
}

function variantIndex(filename: string): number {
  const m = filename.match(/-(\d+)\.(jpe?g|png|webp)$/i);
  return m ? Number(m[1]) : 0;
}

function publicPathFromRepo(repoPath: string): string {
  return repoPath.startsWith("public/") ? repoPath.slice("public".length) : `/${repoPath}`;
}

function scoreStem(stem: string, slug: string, nameSlug: string): number {
  if (stem === slug || stem === nameSlug) return 1000;
  if (nameSlug.startsWith(stem) || stem.startsWith(nameSlug)) {
    return 500 + Math.min(stem.length, nameSlug.length);
  }
  const a = tokens(stem);
  const b = tokens(nameSlug);
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  if (shared === 0) return 0;
  return (shared / Math.max(a.size, b.size)) * 100 + shared * 10;
}

function sortVariants(filenames: string[]): string[] {
  return [...filenames].sort((a, b) => variantIndex(a) - variantIndex(b));
}

type IndexedFile = { filename: string; stem: string; publicPath: string };

function indexEnhancedFiles(): Map<string, IndexedFile[]> {
  const byKey = new Map<string, IndexedFile[]>();
  for (const entry of enhancedManifest as ManifestEntry[]) {
    const parts = entry.repo_path.split("/");
    // public/images/products/{bucket}/{supplier}/{file}
    if (parts.length < 6) continue;
    const bucket = parts[3];
    const supplier = parts[4];
    const filename = parts[5];
    const key = `${bucket}/${supplier}`;
    const list = byKey.get(key) ?? [];
    list.push({
      filename,
      stem: stemOfFilename(filename),
      publicPath: publicPathFromRepo(entry.repo_path),
    });
    byKey.set(key, list);
  }
  return byKey;
}

/**
 * Assign every enhanced local JPEG to a batch-1 SKU.
 * Prefer exact product_slug / name slug, then token overlap with Lister stems.
 * Leftover files (e.g. erw-pipe-racks) attach to the best same-supplier SKU.
 */
export function assignEnhancedLocalImages(
  rows: Pick<ResolvedRow, "id" | "name" | "slug" | "bucket" | "supplierSlug">[]
): Map<string, string[]> {
  const indexed = indexEnhancedFiles();
  const assigned = new Map<string, string[]>();

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.bucket}/${row.supplierSlug}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  for (const [key, group] of groups) {
    const files = indexed.get(key) ?? [];
    const byStem = new Map<string, IndexedFile[]>();
    for (const f of files) {
      const list = byStem.get(f.stem) ?? [];
      list.push(f);
      byStem.set(f.stem, list);
    }

    const claimed = new Set<string>();
    const ranked = group
      .map((row) => {
        const nameSlug = slugifyProductName(row.name);
        let bestStem: string | null = null;
        let bestScore = -1;
        for (const stem of byStem.keys()) {
          const sc = scoreStem(stem, row.slug, nameSlug);
          if (sc > bestScore) {
            bestScore = sc;
            bestStem = stem;
          }
        }
        return { row, nameSlug, bestStem, bestScore };
      })
      .sort((a, b) => b.bestScore - a.bestScore);

    for (const item of ranked) {
      if (item.bestStem && item.bestScore > 20 && !claimed.has(item.bestStem)) {
        claimed.add(item.bestStem);
        const variants = sortVariants(
          (byStem.get(item.bestStem) ?? []).map((f) => f.filename)
        );
        const paths = variants.map(
          (fname) =>
            (byStem.get(item.bestStem!) ?? []).find((f) => f.filename === fname)!
              .publicPath
        );
        assigned.set(item.row.id, paths);
      } else {
        assigned.set(item.row.id, []);
      }
    }

    for (const [stem, filesForStem] of byStem) {
      if (claimed.has(stem)) continue;
      let bestId: string | null = null;
      let bestScore = -1;
      for (const row of group) {
        const sc = scoreStem(stem, row.slug, slugifyProductName(row.name));
        if (sc > bestScore) {
          bestScore = sc;
          bestId = row.id;
        }
      }
      if (bestId && bestScore > 20) {
        const extra = sortVariants(filesForStem.map((f) => f.filename)).map(
          (fname) => filesForStem.find((f) => f.filename === fname)!.publicPath
        );
        assigned.set(bestId, [...(assigned.get(bestId) ?? []), ...extra]);
      }
    }
  }

  return assigned;
}

type RawSku = {
  product_name: string;
  product_slug: string | null;
  supplier_slug_guess: string;
  price_source_type?: string | null;
};

function indexPriceSourceTypes(): Map<string, PriceSourceType> {
  const map = new Map<string, PriceSourceType>();
  const buckets = rawBatch as Record<string, RawSku[]>;
  for (const items of Object.values(buckets)) {
    for (const sku of items) {
      const parsed = parsePriceSourceType(sku.price_source_type);
      if (!parsed) continue;
      const slug = sku.product_slug || slugifyProductName(sku.product_name);
      map.set(`${sku.supplier_slug_guess}/${slug}`, parsed);
      map.set(`${sku.supplier_slug_guess}/${slugifyProductName(sku.product_name)}`, parsed);
    }
  }
  return map;
}

const PRICE_SOURCE_BY_KEY = indexPriceSourceTypes();

function priceSourceFor(row: Pick<ResolvedRow, "supplierSlug" | "slug" | "name">): PriceSourceType | null {
  return (
    PRICE_SOURCE_BY_KEY.get(`${row.supplierSlug}/${row.slug}`) ??
    PRICE_SOURCE_BY_KEY.get(`${row.supplierSlug}/${slugifyProductName(row.name)}`) ??
    null
  );
}

function toScraped(row: ResolvedRow): ScrapedProduct {
  const priced =
    typeof row.basePrice === "number" &&
    Number.isFinite(row.basePrice) &&
    row.basePrice > 0;
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
    basePrice: priced ? row.basePrice : null,
    priceUnit: priced ? row.priceUnit : null,
    commissionRate: priced ? 0 : null,
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
      ...(row.priceSourceType ? { "Price source type": row.priceSourceType } : {}),
      ...(priced && row.priceUnit ? { Unit: row.priceUnit } : {}),
    },
    priceSourceType: row.priceSourceType,
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
const enhancedById = assignEnhancedLocalImages(rows);

const wiredRows: ResolvedRow[] = rows.map((row) => {
  const local = enhancedById.get(row.id) ?? [];
  const images = local.length > 0 ? local : row.images.filter((u) => u.startsWith("/images/products/"));
  return { ...row, images, priceSourceType: priceSourceFor(row) };
});

export const listerBatch1Products: ScrapedProduct[] = wiredRows.map(toScraped);

export function listerProductsForSupplier(supplierId: string): ScrapedProduct[] {
  return listerBatch1Products.filter((p) => p.supplierId === supplierId);
}

export function listerBatch1Count(): number {
  return listerBatch1Products.length;
}

/** Example path used in product-card wiring docs. */
export const CAICHENG_FOLDING_GIFT_BOX_IMAGE =
  "/images/products/packaging/dongguan-caicheng-printing/folding-gift-box.jpg";
