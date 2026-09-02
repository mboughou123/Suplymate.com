/**
 * Daily expansion 2026-09-02 (51 SKUs) → catalogue ScrapedProduct[].
 *
 * Metadata: data/daily-2026-09-02-products.json
 * Photos:   data/daily-2026-09-02-products-enhanced-manifest.json
 *   → public/images/products/{supplier-slug}/…
 *
 * Honesty: Havells two house-wire SKUs → public_listing (Listed price);
 *          everything else RFQ (never $0.00).
 * Magicrete block-jointing mortar uses an AI-generated bag photo — labelled.
 */

import rawDaily from "../../data/daily-2026-09-02-products.json";
import enhancedManifest from "../../data/daily-2026-09-02-products-enhanced-manifest.json";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import type { ScrapedProduct } from "@/data/scraped-products";
import type { ProductCategory } from "@/data/products";
import { parsePriceSourceType, type PriceSourceType } from "@/lib/price-source";
import {
  assignLocalProductImages,
  indexFlatProductImagePaths,
  isUsableRemoteImageUrl,
  preferEnhancedJpegPaths,
  publicPathFromDailyEnhancedDst,
  slugifyProductName,
} from "@/lib/lister-media";

export const LISTER_DAILY_SUPPLIER_ID_BY_SLUG: Record<string, string> = {
  arcelormittal: "arcelormittal",
  nucor: "nucor",
  ssab: "ssab",
  "nippon-steel": "nippon-steel",
  gerdau: "gerdau",
  "tata-steel": "tata-steel-limited-in",
  "jindal-saw": "jindal-saw-limited-in",
  "welspun-corp": "welspun-corp-limited-in",
  tenaris: "tenaris",
  vallourec: "vallourec",
  "arabian-pipes": "arabian-pipes-company-sa",
  havells: "havells",
  "finolex-cables": "finolex-cables",
  ducab: "ducab-dubai-cable-company-pvt-ltd-ae",
  nexans: "nexans",
  "kei-industries": "kei-industries-limited-in",
  holcim: "holcim",
  sika: "sika",
  "commercial-metals-company": "commercial-metals-company",
  "ultratech-cement": "ultratech-cement-limited-in",
  "zamil-steel-peb": "zamil-steel-pre-engineered-buildings-co-ltd-sa",
  "hangxiao-steel-structure-shandong": "hangxiao-steel-structure-shandong-co-ltd-cn",
  "magicrete-building-solutions": "magicrete-building-solutions-private-limited-in",
  nsk: "nsk",
  timken: "timken",
  flowserve: "flowserve",
  wilo: "wilo",
  ksb: "ksb",
  amcor: "amcor",
  mondi: "mondi",
  "international-paper": "international-paper",
  "smurfit-westrock": "smurfit-westrock",
  huhtamaki: "huhtamaki",
  uflex: "uflex-limited-in",
  "dongguan-caicheng-printing": "dongguan-caicheng-printing-factory-cn",
};

const CATEGORY_BY_SLUG: Record<string, ProductCategory> = {
  arcelormittal: "Steel & Metals",
  nucor: "Steel & Metals",
  ssab: "Steel & Metals",
  "nippon-steel": "Steel & Metals",
  gerdau: "Steel & Metals",
  "tata-steel": "Steel & Metals",
  "jindal-saw": "Tubes & Pipes",
  "welspun-corp": "Tubes & Pipes",
  tenaris: "Tubes & Pipes",
  vallourec: "Tubes & Pipes",
  "arabian-pipes": "Tubes & Pipes",
  havells: "Cables & Electrical",
  "finolex-cables": "Cables & Electrical",
  ducab: "Cables & Electrical",
  nexans: "Cables & Electrical",
  "kei-industries": "Cables & Electrical",
  holcim: "Construction",
  sika: "Construction",
  "commercial-metals-company": "Construction",
  "ultratech-cement": "Construction",
  "zamil-steel-peb": "Construction",
  "hangxiao-steel-structure-shandong": "Construction",
  "magicrete-building-solutions": "Construction",
  nsk: "Industrial Parts",
  timken: "Industrial Parts",
  flowserve: "Industrial Parts",
  wilo: "Industrial Parts",
  ksb: "Industrial Parts",
  amcor: "Packaging",
  mondi: "Packaging",
  "international-paper": "Packaging",
  "smurfit-westrock": "Packaging",
  huhtamaki: "Packaging",
  uflex: "Packaging",
  "dongguan-caicheng-printing": "Packaging",
};

const COUNTRY_BY_SLUG: Record<string, string> = {
  arcelormittal: "Luxembourg",
  nucor: "United States",
  ssab: "Sweden",
  "nippon-steel": "Japan",
  gerdau: "Brazil",
  tenaris: "Luxembourg",
  vallourec: "France",
  havells: "India",
  "finolex-cables": "India",
  ducab: "United Arab Emirates",
  nexans: "France",
  holcim: "Switzerland",
  sika: "Switzerland",
  nsk: "Japan",
  timken: "United States",
  flowserve: "United States",
  wilo: "Germany",
  ksb: "Germany",
  amcor: "Switzerland",
  mondi: "United Kingdom",
  "international-paper": "United States",
  "smurfit-westrock": "Ireland",
  huhtamaki: "Finland",
};

const STEM_ALIASES: Record<string, string> = {
  "arcelormittal/arcelormittal-european-ipe-i-sections-en-10365": "ipe-i-sections",
  "arcelormittal/arcelormittal-hot-rolled-upe-parallel-flange-channels": "upe-pic",
  "nucor/nucor-hot-rolled-sbq-steel-bar-rounds-squares-hexes-flats":
    "hot-rolled-steel-bar",
  "nucor/nucor-eaf-hot-rolled-steel-sheet-coil": "sheet-coil",
  "ssab/ssab-hardox-wear-plate-400-450-500-tuf-500-550-600": "hardox-wear-plate",
  "ssab/ssab-strenx-high-strength-structural-steel": "strenx-header",
  "nippon-steel/nippon-steel-heavy-plate-ship-bridge-offshore-power": "heavy-plate",
  "gerdau/gerdau-straight-concrete-reinforcing-bar-astm-a615-a706": "rebar-banner",
  "tata-steel/tata-steelium-cold-rolled-steel-coils-and-sheets": "tata-steelium",
  "jindal-saw/jindal-saw-ductile-iron-pipes-centrifugal-casting-dn40-dn2200":
    "di-pipe",
  "jindal-saw/jindal-saw-carbon-alloy-steel-seamless-pipes-and-tubes":
    "cs-as-seamless",
  "welspun-corp/welspun-erw-hfiw-line-pipe-1-16-in": "dahej-mill",
  "tenaris/tenaris-seamless-octg-casing-and-tubing": "octg-hero",
  "tenaris/tenarishydril-blue-premium-connections": "blue-riser",
  "vallourec/vallourec-vam-premium-connections-and-octg": "vam-threading",
  "vallourec/vallourec-seamless-line-pipe-oil-and-gas": "line-pipes",
  "arabian-pipes/arabian-pipes-coated-line-pipe-3lpe-fbe-mill-coating":
    "mill-slide",
  "havells/havells-lifeguard-fr-lsh-2-5-sq-mm-house-wire-90-m-coil":
    "lifeguard-frlsh-90m",
  "havells/havells-lifeline-fr-2-5-sq-mm-house-wire-180-m": "lifeline-fr-red",
  "finolex-cables/finolex-fr-pvc-house-wires-and-cables-is-694": "wires-cables",
  "ducab/ducab-lv-xlpe-pvc-power-cables-0-6-1-kv": "lv-cables",
  "ducab/ducab-hv-ehv-power-cables-up-to-400-kv": "hv-ehv-cables",
  "nexans/nexans-building-and-power-cables": "buildings",
  "nexans/nexans-subsea-offshore-power-cables": "offshore-wind",
  "kei-industries/kei-marine-and-offshore-cables": "home-banner",
  "holcim/holcim-cement-portland-blended-ecoplanet": "cement-ops",
  "sika/sika-concrete-admixtures-viscocrete-water-reducers":
    "sika-admixture-pour",
  "commercial-metals-company/cmc-recycled-mill-rebar-greenbar-100-recycled-content":
    "greenbar-recycled",
  "ultratech-cement/ultratech-ready-mix-concrete": "homebuilding-stages",
  "ultratech-cement/ultratech-home-building-products-waterproofing-repair":
    "ihb-card",
  "zamil-steel-peb/zamil-steel-standing-seam-roof-sheeting-systems":
    "roof-systems-local",
  "hangxiao-steel-structure-shandong/hangxiao-prefabricated-steel-structure-workshop":
    "workshop-local",
  "magicrete-building-solutions/magicrete-block-jointing-mortar":
    "block-jointing-mortar-ai",
  "nsk/nsk-deep-groove-ball-bearings": "dgbb-cut",
  "nsk/nsk-angular-contact-ball-bearings": "acbb",
  "timken/timken-tapered-roller-bearings": "tapered-bearing",
  "flowserve/flowserve-argus-trunnion-mounted-ball-valves-fk76m": "argus-fk76m",
  "flowserve/flowserve-mark-3-ansi-standard-process-pump": "mark3-ansi",
  "flowserve/flowserve-limitorque-mxb-electric-valve-actuator": "limitorque-mxb",
  "wilo/wilo-helix-vertical-multistage-centrifugal-pump": "helix-696",
  "ksb/ksb-standard-water-and-process-pumps": "noriresist",
  "amcor/amcor-rigid-custom-packaging": "rigid-custom",
  "amcor/amcor-flexible-packaging-films-and-pouches": "flex-pk-grad",
  "mondi/mondi-smartkraft-white-kraft-paper-packaging": "smartkraft-white",
  "mondi/mondi-recycleready-flexibag-bag-in-box": "flexibag",
  "international-paper/international-paper-corrugated-packaging-incl-leak-resistant":
    "leak-resistant-corrugated",
  "smurfit-westrock/smurfit-westrock-corrugated-packaging-and-paper-bags":
    "paper-bags",
  "huhtamaki/huhtamaki-foodservice-paper-and-fiber-packaging": "picnic-hero",
  "uflex/uflex-kraftika-paper-tube-packaging": "kraftika-paper-tube",
  "uflex/uflex-f-hss-mono-material-pet-packaging-film": "fhss-pet-film",
  "dongguan-caicheng-printing/dongguan-caicheng-qa040-rigid-gift-packaging-box":
    "qa040",
};

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
  needs_ai_generate?: boolean;
};

type ManifestRow = { dst?: string; dst_rel?: string; src?: string; repo_path?: string };

const supplierById = new Map(phase1Suppliers.map((s) => [s.id, s]));

function moqFromNote(note: string | null, fallback: string | null): string | null {
  if (!note) return fallback;
  const m = note.match(/MOQ\s+(\d[\d,]*(?:\.\d+)?\s+[A-Za-z /]+)/i);
  if (m) return m[1].trim();
  return fallback;
}

const localFiles = indexFlatProductImagePaths(
  preferEnhancedJpegPaths(
    (enhancedManifest as ManifestRow[])
      .map((e) =>
        publicPathFromDailyEnhancedDst(e.dst_rel ?? e.dst ?? e.repo_path ?? e.src ?? ""),
      )
      .filter((p): p is string => Boolean(p)),
  ),
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
  aiGeneratedImage: boolean;
};

function buildRows(): BuiltRow[] {
  const items = (rawDaily as { products?: RawSku[] }).products ?? [];
  const out: BuiltRow[] = [];
  for (const sku of items) {
    const category = CATEGORY_BY_SLUG[sku.supplier_slug_guess];
    if (!category) continue;
    const slug = sku.product_slug || slugifyProductName(sku.product_name);
    const supplierId =
      LISTER_DAILY_SUPPLIER_ID_BY_SLUG[sku.supplier_slug_guess] ??
      sku.supplier_slug_guess;
    const mill = supplierById.get(supplierId);
    const priced =
      typeof sku.unit_price === "number" &&
      Number.isFinite(sku.unit_price) &&
      sku.unit_price > 0;
    const remotes = (sku.image_urls ?? []).filter(isUsableRemoteImageUrl);
    out.push({
      id: `lister-b6-${sku.supplier_slug_guess}-${slug}`,
      supplierId,
      supplierName: mill?.name ?? sku.supplier_name,
      supplierCountry: mill?.country ?? COUNTRY_BY_SLUG[sku.supplier_slug_guess] ?? null,
      name: sku.product_name,
      slug,
      category,
      bucket: "daily",
      supplierSlug: sku.supplier_slug_guess,
      remoteImages: remotes,
      basePrice: priced ? sku.unit_price : null,
      priceUnit: priced ? sku.unit : null,
      currency: priced ? (sku.currency ?? "USD") : (sku.currency ?? "USD"),
      moq: moqFromNote(sku.price_note, mill?.moq ?? null),
      priceNote: sku.price_note,
      sourceUrl: sku.source_url,
      imageSourceUrl: remotes[0] ?? null,
      priceSourceType: parsePriceSourceType(sku.price_source_type),
      aiGeneratedImage: sku.needs_ai_generate === true,
    });
  }
  return out;
}

const rows = buildRows();
const localById = assignLocalProductImages(rows, localFiles, STEM_ALIASES);

function toScraped(row: BuiltRow): ScrapedProduct {
  const local = localById.get(row.id) ?? [];
  const images = local.length > 0 ? local : row.remoteImages;
  const priced = row.basePrice != null && row.basePrice > 0;
  const aiGeneratedImage =
    row.aiGeneratedImage || images.some((url) => /-ai\.(jpe?g|png|webp)$/i.test(url));
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
      ...(priced && row.priceUnit ? { Unit: row.priceUnit } : {}),
      ...(aiGeneratedImage ? { "Image note": "AI-generated image" } : {}),
    },
    priceSourceType: row.priceSourceType,
    aiGeneratedImage,
    customizationOptions: [],
    certifications: [],
    rating: null,
    reviewCount: null,
    sourceUrl: row.sourceUrl,
    productUrl: row.sourceUrl,
    imageSourceUrl: row.imageSourceUrl,
    verifiedSupplier: true,
    status: "approved",
    scrapedAt: "2026-09-02T21:00:00.000Z",
  };
}

export const listerDaily20260902Products: ScrapedProduct[] = rows.map(toScraped);

export function listerDaily20260902Count(): number {
  return listerDaily20260902Products.length;
}

export function listerDaily20260902ForSupplier(supplierId: string): ScrapedProduct[] {
  return listerDaily20260902Products.filter((p) => p.supplierId === supplierId);
}
