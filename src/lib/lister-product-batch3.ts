/**
 * Lister product-media batch 3 → catalogue ScrapedProduct[].
 *
 * Metadata: data/product-media-batch3.json (steel + cables).
 * Photos:   prefer local enhanced JPGs (dst_rel in the batch-3 manifest).
 *           Fall back to non-PDF image_urls when no local file matches.
 *
 * Honesty: public_listing / listed_public → Listed price;
 *          marketplace_listing → Marketplace listing;
 *          listed_fob → Listed FOB; null/rfq → RFQ.
 *
 * Hadeed: official S3 product stills (hrc, flat-cate, flat-products,
 * rebar-in-coil, wire-rod; plus rebar-straight) are card primaries.
 * Midrex/plant shots are extras only. Never attribute Rajhi remotes.
 */

import rawBatch from "../../data/product-media-batch3.json";
import enhancedManifest from "../../data/product-media-batch3-enhanced-manifest.json";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { parsePriceSourceType, type PriceSourceType } from "@/lib/price-source";
import {
  assignLocalProductImages,
  indexPublicImagePaths,
  isUsableRemoteImageUrl,
  preferEnhancedJpegPaths,
  publicPathFromEnhancedDst,
  slugifyProductName,
} from "@/lib/lister-media";

export const LISTER_B3_SUPPLIER_ID_BY_SLUG: Record<string, string> = {
  emsteel: "emsteel-building-materials-pjsc-emsteel-ae",
  "ferrite-structural-steels": "ferrite-structural-steels-pvt-ltd-panvel",
  hadeed: "saudi-iron-and-steel-company-hadeed-sa",
  "qatar-steel": "qatar-steel-company-q-p-s-c-qa",
  "jingye-steel": "jingye-steel-jingye-group-cn",
  // Phase-1 pack currently stores RINL / Vizag Steel under this id.
  "rinl-vizag-steel": "ispat-alloys-tube-industries-mumbai",
  "foliflex-cables": "foliflex-wires-cables-delhi",
  "jiangsu-yuhui-cable": "jiangsu-yuhui-cable-co-ltd-cn",
  "henan-huadong-cable": "henan-huadong-cable-co-ltd-cn",
  "peoples-cable-group": "people-s-cable-group-co-ltd-cn",
  "xwa-power-cable": "xwa-power-cable-co-ltd-cn",
};

const CATEGORY_BY_BUCKET: Record<string, ProductCategory> = {
  steel: "Steel & Metals",
  cables: "Cables & Electrical",
};

const STEM_ALIASES: Record<string, string> = {
  "emsteel/emsteel-reinforcing-bar-straight-bar-coil": "rebar",
  "emsteel/emsteel-heavy-jumbo-structural-sections": "sections-annual-report",
  "emsteel/emsteel-continuous-cast-billets-made-in-uae": "billets",
  "hadeed/hadeed-concrete-reinforcing-bars-straight-rebar": "rebar-straight",
  "hadeed/hadeed-wire-rod": "wire-rod",
  "hadeed/hadeed-hot-rolled-coil-hrc-flat-products": "hrc",
  "ferrite-structural-steels/ferrite-equal-mild-steel-angles": "ms-angles",
  "ferrite-structural-steels/ferrite-mild-steel-i-beams-h-beams": "ms-beams",
  "ferrite-structural-steels/ferrite-mild-steel-plates-sheets": "ms-plates",
  "qatar-steel/qatar-steel-reinforcing-bars-rebar-8-40-mm": "rebar",
  "qatar-steel/qatar-steel-continuous-cast-billets": "billets",
  "qatar-steel/qatar-steel-dri-hot-briquetted-iron-hbi": "dri-hbi",
  "jingye-steel/jingye-hot-rolled-ribbed-bar-rebar-hrb400-b500b-astm-gr-60": "rebar",
  "jingye-steel/jingye-medium-thick-steel-plate": "plate",
  "jingye-steel/jingye-hot-rolled-coil-hrc": "hrc",
  "rinl-vizag-steel/vizag-tmt-rebars-rinl": "tmt-mill",
  "rinl-vizag-steel/vizag-ukku-structurals-beams-channels-angles": "structurals-mill",
  "rinl-vizag-steel/vizag-plain-wire-rod-coils": "wire-rod-mill",
  "foliflex-cables/foliflex-1-5-mm-pvc-housing-wire-90-m-coil": "fr-housing",
  "foliflex-cables/foliflex-2-5-sq-mm-pvc-housing-wire-frls-90-m": "copper-90m",
  "foliflex-cables/foliflex-2-5-mm-aluminum-cable-90-m": "al-2p5",
  "foliflex-cables/foliflex-3-core-submersible-flat-cable": "submersible-flat",
  "jiangsu-yuhui-cable/yuhui-xlpe-insulated-pvc-sheathed-35-kv-mv-power-cable": "35kv-mv-xlpe",
  "jiangsu-yuhui-cable/yuhui-double-insulated-xlpe-pvc-0-6-1-kv-lv-power-cable": "1kv-lv-xlpe",
  "jiangsu-yuhui-cable/yuhui-pvc-control-cable-multi-core": "control-cable",
  "henan-huadong-cable/huadong-factory-price-1x10-mm-abc-aerial-bundled-cable-0-6-1-kv":
    "abc-1x10",
  "henan-huadong-cable/huadong-underground-xlpe-copper-power-cable-5x16-mm-0-6-1-kv":
    "power",
  "henan-huadong-cable/huadong-overhead-communication-cable-range": "communication",
  "peoples-cable-group/rmjt-xlpe-insulated-aerial-bundled-cable-abc-1-15-kv": "abc",
  "peoples-cable-group/rmjt-pvc-building-wire-rvv-flexible-cord": "rvv",
  "peoples-cable-group/rmjt-pvc-xlpe-power-cable-up-to-35-kv": "xlpe-power",
  "xwa-power-cable/xwa-lv-power-cable-0-6-1-kv-xlpe-pvc": "lv-power",
  "xwa-power-cable/xwa-mv-power-cable-3-6-35-kv-xlpe": "mv-power",
  "xwa-power-cable/xwa-control-cable": "control-cable",
};

const HADEED_OFFICIAL = /flat-cate|hrc\.jpg|rebar-in-coil|wire-rod|rebar-straight|flat-products/i;
const HADEED_PLANT = /midrex|plant/i;
const HADEED_STANDIN_REMOTE = /rajhisteel|midrex\.com/i;

type RawSku = {
  product_name: string;
  product_slug: string | null;
  supplier_name: string;
  supplier_slug_guess: string;
  source_url: string;
  unit_price: number | null;
  currency: string | null;
  unit: string | null;
  price_note: string | null;
  image_urls: string[];
  price_source_type?: string | null;
};

type ManifestRow = { dst_rel?: string; dst?: string; repo_path?: string; src?: string };

const supplierById = new Map(phase1Suppliers.map((s) => [s.id, s]));

function moqFromNote(note: string | null, fallback: string | null): string | null {
  if (!note) return fallback;
  const m = note.match(/MOQ\s+(\d[\d,]*(?:\.\d+)?\s+[A-Za-z /]+)/i);
  if (m) return m[1].trim();
  return fallback;
}

const localFiles = indexPublicImagePaths(
  preferEnhancedJpegPaths(
    (enhancedManifest as ManifestRow[])
      .map((e) => publicPathFromEnhancedDst(e.dst_rel ?? e.dst ?? e.repo_path ?? e.src ?? ""))
      .filter((p): p is string => Boolean(p))
  )
);

type BuiltRow = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierCountry: string | null;
  name: string;
  slug: string;
  category: ProductCategory;
  bucket: string;
  supplierSlug: string;
  remoteImages: string[];
  basePrice: number | null;
  priceUnit: string | null;
  currency: string;
  moq: string | null;
  priceNote: string | null;
  sourceUrl: string;
  imageSourceUrl: string | null;
  priceSourceType: PriceSourceType | null;
};

function buildRows(): BuiltRow[] {
  const out: BuiltRow[] = [];
  const buckets = rawBatch as Record<string, RawSku[]>;
  for (const [bucket, items] of Object.entries(buckets)) {
    const category = CATEGORY_BY_BUCKET[bucket];
    if (!category) continue;
    for (const sku of items) {
      const slug = sku.product_slug || slugifyProductName(sku.product_name);
      const supplierId = LISTER_B3_SUPPLIER_ID_BY_SLUG[sku.supplier_slug_guess];
      const mill = supplierId ? supplierById.get(supplierId) : undefined;
      const priced =
        typeof sku.unit_price === "number" &&
        Number.isFinite(sku.unit_price) &&
        sku.unit_price > 0;
      const remotes = (sku.image_urls ?? []).filter((url) => {
        if (!isUsableRemoteImageUrl(url)) return false;
        if (sku.supplier_slug_guess === "hadeed" && HADEED_STANDIN_REMOTE.test(url)) {
          return false;
        }
        return true;
      });
      out.push({
        id: `lister-b3-${sku.supplier_slug_guess}-${slug}`,
        supplierId: supplierId ?? sku.supplier_slug_guess,
        supplierName: mill?.name ?? sku.supplier_name,
        supplierCountry: mill?.country ?? null,
        name: sku.product_name,
        slug,
        category,
        bucket,
        supplierSlug: sku.supplier_slug_guess,
        remoteImages: remotes,
        basePrice: priced ? sku.unit_price : null,
        priceUnit: priced ? sku.unit : null,
        currency: priced ? (sku.currency ?? "USD") : (sku.currency ?? "USD"),
        moq: moqFromNote(sku.price_note, mill?.moq ?? null),
        priceNote: sku.price_note,
        sourceUrl: sku.source_url,
        imageSourceUrl:
          sku.supplier_slug_guess === "hadeed"
            ? sku.source_url
            : (remotes[0] ?? null),
        priceSourceType: parsePriceSourceType(sku.price_source_type),
      });
    }
  }
  return out;
}

const rows = buildRows();
const localById = assignLocalProductImages(rows, localFiles, STEM_ALIASES);

function orderHadeedImages(images: string[]): string[] {
  const official = images.filter((u) => HADEED_OFFICIAL.test(u));
  const plant = images.filter((u) => HADEED_PLANT.test(u));
  const rest = images.filter((u) => !HADEED_OFFICIAL.test(u) && !HADEED_PLANT.test(u));
  return [...official, ...rest, ...plant];
}

function toScraped(row: BuiltRow): ScrapedProduct {
  let local = localById.get(row.id) ?? [];
  if (row.supplierSlug === "hadeed") local = orderHadeedImages(local);
  const images = local.length > 0 ? local : row.remoteImages;
  const priced = row.basePrice != null && row.basePrice > 0;
  const hadeedStill = row.supplierSlug === "hadeed" && local.some((u) => HADEED_OFFICIAL.test(u));
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    supplierLogo: null,
    supplierCountry: row.supplierCountry,
    name: row.name,
    slug: row.slug,
    category: row.category,
    images,
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
      ...(hadeedStill ? { "Photo credit": "Hadeed product still" } : {}),
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
    verifiedSupplier: true,
    status: "approved",
    scrapedAt: "2026-09-02T16:00:00.000Z",
  };
}

export const listerBatch3Products: ScrapedProduct[] = rows.map(toScraped);

export function listerBatch3Count(): number {
  return listerBatch3Products.length;
}

export function listerBatch3ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerBatch3Products.filter((p) => p.supplierId === supplierId);
}
