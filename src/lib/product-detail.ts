// Product detail assembly.
//
// This module used to generate a complete Alibaba-style product page from a hash
// of the product id: physical dimensions (thickness, width, length), material,
// grade, surface treatment, a manufacturing standard (ASTM A36, EN 10025,
// ISO 9001), place of origin, packaging, a shipping port, Incoterms, a lead
// time, a volume-discount ladder, and four to six buyer reviews per product with
// invented authors, employers, countries, dates and ratings. Ratings, review
// counts and MOQs were invented whenever the record had none.
//
// None of it was collected. It was published against real, identifiable
// companies and their real scraped products, and read as fact.
//
// All of it has been removed. What remains is either a collected field or
// plainly derived from one: the specification table and customization list come
// from the scraped record (`Product.specifications`,
// `Product.customizationOptions`) and are simply absent when the record has
// none. The Review table holds no product reviews, so the page shows an honest
// empty state rather than generating one.

import type { Product, ProductCategory } from "@/data/products";
import { products as allProducts } from "@/data/products";
import type { Supplier } from "@/data/suppliers";
import { verifiedSuppliers } from "@/data/verified-suppliers";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import { toDisplaySupplier } from "@/lib/supplier-display";
import {
  getRealProductImage,
  hasRealProductImage,
} from "@/lib/image-fallback";
import { calculateSupplierCompletenessScore } from "@/lib/supplier-completeness";
import {
  COMMISSION_RATE,
  applyCommission,
  formatPrice,
} from "@/config/commerce";

/* --------------------------- Deterministic seed ------------------------- */

// The only remaining use of a hash is choosing a stable gradient per product and
// resolving the supplier link, so the same card always looks the same. It no
// longer drives any factual claim.
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ----------------------------- Public types ---------------------------- */

export type IconKey =
  | "award"
  | "factory"
  | "ruler"
  | "package"
  | "sparkles";

export type GalleryImage = {
  id: string;
  label: string;
  gradient: string;
  icon: IconKey;
  isVideo: boolean;
  url?: string;
};

/**
 * The supplier-listed unit price with the platform commission applied.
 *
 * This replaced a four-step volume-discount ladder (1 / 50 / 200 / 1000 units
 * at 0% / 6% / 12% / 18% off). The price itself was derived from a real
 * `basePrice`, but the volume bands and the discounts at each band were
 * invented, so they read as a price list the supplier had agreed to. Only the
 * one price we actually hold is published.
 */
export type ListedPrice = {
  /** Supplier-listed base price before commission. */
  basePrice: number;
  /** Displayed price (commission applied). */
  price: number;
  priceLabel: string;
};

export type SpecRow = { label: string; value: string };

export type DescriptionSection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  table?: SpecRow[];
};

export type RecommendedProduct = {
  id: string;
  name: string;
  category: string;
  gradient: string;
  icon: IconKey;
  /** Commissioned supplier-listed price; null when there is no public price. */
  priceFromLabel: string | null;
  /** Supplier-stated MOQ; null when the record has none. */
  moq: string | null;
};

export type ProductSupplierCard = {
  id: string;
  name: string;
  logoText: string;
  logoGradient: string;
  country: string;
  city: string;
  flag: string;
  verified: boolean;
  /** Google Places rating; null when the supplier has none. */
  rating: number | null;
  /** Google Places review count; null when the supplier has none. */
  reviewCount: number | null;
  href: string;
};

export type ProductDetail = {
  product: Product;
  category: ProductCategory;
  unit: string;
  /** Supplier-stated MOQ; null when the record has none. */
  moq: string | null;
  /**
   * Supplier-stated lead time; null when the record has none.
   *
   * `Product.bestDeliveryDays` is not a source for this: the scraped-product
   * importer defaults it to 14 for every row, so it measures nothing.
   */
  leadTime: string | null;
  /** Rating published on the supplier's own site; null when there is none. */
  rating: number | null;
  /** Review count published on the supplier's own site; null when none. */
  reviewCount: number | null;
  commissionRate: number;
  /** Null when the record has no public price. */
  listedPrice: ListedPrice | null;
  gallery: GalleryImage[];
  /** Supplier-listed customization options; empty when the record has none. */
  customizationOptions: string[];
  /** Specifications as scraped from the supplier; empty when none were found. */
  specs: SpecRow[];
  descriptionSections: DescriptionSection[];
  recommended: RecommendedProduct[];
  supplier: ProductSupplierCard;
};

/* --------------------------- Presentation pools ------------------------- */

const GALLERY_GRADIENTS = [
  "linear-gradient(135deg, #0b1b30, #143a5f 55%, rgba(14,165,183,0.55))",
  "linear-gradient(135deg, #1e293b, #0b1b30 55%, rgba(20,184,166,0.5))",
  "linear-gradient(135deg, #102a43, #1e5580 60%, rgba(96,165,250,0.4))",
  "linear-gradient(135deg, #0d3349, #0284c7 70%, rgba(20,184,166,0.4))",
  "linear-gradient(135deg, #0f172a, #0b1b30 55%, rgba(20,184,166,0.45))",
];

const ICONS_BY_CATEGORY: Record<ProductCategory, IconKey> = {
  "Steel & Metals": "factory",
  "Cables & Electrical": "sparkles",
  "Tubes & Pipes": "ruler",
  Packaging: "package",
  Construction: "factory",
  "Industrial Parts": "award",
};

/* ----------------------------- Linkage --------------------------------- */

// Real photos linked to a supplier record (banner + gallery), de-duplicated.
function supplierPhotos(s: Supplier): string[] {
  return [s.imageUrl, ...(s.supplierImages ?? [])].filter(
    (u): u is string => Boolean(u && /^https?:\/\//i.test(u))
  );
}

const suppliersById = new Map<string, Supplier>(
  [...outscraperSuppliers, ...verifiedSuppliers].map((s) => [s.id, s])
);

/**
 * Resolves the supplier that actually sells this product.
 *
 * This used to hash the product id and pick whichever same-category supplier
 * happened to land on that index, preferring ones with photos — it never read
 * `product.supplierId`, which every scraped row carries. So a real listing from
 * one company was bylined, described and illustrated as another real company's,
 * while the cart and RFQ (which do read `product.supplierId`) transacted with a
 * third. Two named businesses were misrepresented per mismatch.
 *
 * `photos` is empty unless they belong to this supplier, so a product can no
 * longer illustrate itself with an unrelated company's premises.
 */
function resolveSupplier(product: Product): { record: Supplier; photos: string[] } {
  const known = product.supplierId ? suppliersById.get(product.supplierId) : undefined;
  if (known) return { record: known, photos: supplierPhotos(known) };

  // The supplier is known to the product but absent from the static bundle,
  // which is a snapshot that trails the database. Build a minimal record from
  // the product's own denormalised fields rather than substituting a different
  // company. Anything we do not hold stays empty so the UI omits it.
  const country = product.supplierCountry ?? "";
  return {
    record: {
      id: product.supplierId ?? "",
      name: product.supplierName ?? "",
      industry: "Metal",
      location: country,
      products: [],
      deliveryRegions: [],
      moq: null,
      reliabilityScore: 0,
      category: product.category,
      country,
    },
    photos: [],
  };
}

/* ----------------------------- Price helpers --------------------------- */

// Scraped rows frequently carry no public price; arithmetic on a nullish base
// would render as "$0.00", implying the product is free.
function listedPriceFor(product: Product): ListedPrice | null {
  const base = product.basePrice ?? product.priceMin;
  if (typeof base !== "number" || !Number.isFinite(base) || base <= 0) return null;
  const rate = product.commissionRate ?? COMMISSION_RATE;
  const price = applyCommission(base, rate);
  return {
    basePrice: base,
    price,
    priceLabel: [formatPrice(price, product.currency), product.unit]
      .filter(Boolean)
      .join(" / "),
  };
}

/* ----------------------------- Card data ------------------------------- */

export type ProductCardData = {
  id: string;
  name: string;
  category: ProductCategory;
  icon: IconKey;
  gradient: string;
  /** Best REAL photo (product's own or linked supplier's), or undefined. */
  imageUrl?: string;
  /** True when a genuine photograph is available (not just a category tile). */
  hasRealPhoto: boolean;
  supplierId: string;
  supplierName: string;
  supplierLocation: string;
  verified: boolean;
  /** Profile-completeness of the linked supplier (sort key for the catalogue). */
  completenessScore: number;
  unit: string;
  /** Null when the product has no public price ("contact supplier"). */
  priceLabel: string | null;
  /** Supplier-stated MOQ; null when the record has none. */
  moq: string | null;
  /** Supplier-stated lead time; null when the record has none. */
  shippingTime: string | null;
  /** Rating published on the supplier's own site; null when there is none. */
  rating: number | null;
  /** Review count published on the supplier's own site; null when none. */
  reviewCount: number | null;
};

/** Lightweight derivation for catalogue cards (no full detail generation). */
export function getProductCardData(product: Product): ProductCardData {
  const seed = hashString(product.id || product.name);
  const { record: supplierRecord, photos } = resolveSupplier(product);
  const sd = toDisplaySupplier(supplierRecord);

  const imageInput = {
    images: product.images,
    supplierImages: photos,
    productName: product.name,
    category: product.category,
  };
  const realImage = getRealProductImage(imageInput);

  const completenessScore = calculateSupplierCompletenessScore({
    verified: sd.verified,
    website: supplierRecord.website,
    logoUrl: supplierRecord.logoUrl,
    imageUrl: supplierRecord.imageUrl,
    images: supplierRecord.supplierImages,
    products: supplierRecord.products,
    productImages: realImage ? [realImage] : [],
    description: supplierRecord.description,
    rating: supplierRecord.googleRating ?? supplierRecord.rating,
    reviewCount: supplierRecord.googleReviews ?? supplierRecord.reviewCount,
    certifications: supplierRecord.certificationsDetailed,
    certificationImages: supplierRecord.certificationImages,
  });

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    icon: ICONS_BY_CATEGORY[product.category],
    gradient: GALLERY_GRADIENTS[seed % GALLERY_GRADIENTS.length],
    imageUrl: realImage,
    hasRealPhoto: hasRealProductImage(imageInput),
    supplierId: sd.id,
    supplierName: sd.name,
    supplierLocation: [sd.city, sd.country].filter(Boolean).join(", "),
    verified: sd.verified,
    completenessScore,
    unit: product.unit,
    priceLabel: listedPriceFor(product)?.priceLabel ?? null,
    moq: product.moq?.trim() || null,
    shippingTime: product.shippingTime?.trim() || null,
    rating: product.rating ?? null,
    reviewCount: product.reviewCount ?? null,
  };
}

/**
 * Catalogue sort key: image-rich, complete, verified suppliers first. Products
 * backed by a real photo are boosted so they always outrank fallback-only ones
 * (this realises the P1→P5 tiering described in the catalogue spec).
 */
export function productCatalogueRank(card: ProductCardData): number {
  return card.completenessScore + (card.hasRealPhoto ? 50 : 0);
}

/** Comparator for the public catalogue (highest rank first, stable by name). */
export function compareProductsForCatalogue(a: Product, b: Product): number {
  const ra = productCatalogueRank(getProductCardData(a));
  const rb = productCatalogueRank(getProductCardData(b));
  if (rb !== ra) return rb - ra;
  return a.name.localeCompare(b.name);
}

/* ------------------------------ Assembly ------------------------------- */

export function getProductDetail(product: Product): ProductDetail {
  const seed = hashString(product.id || product.name);

  const { record: supplierRecord } = resolveSupplier(product);
  const sd = toDisplaySupplier(supplierRecord);

  const unit = product.unit;
  const icon = ICONS_BY_CATEGORY[product.category];
  const rate = product.commissionRate ?? COMMISSION_RATE;
  const listedPrice = listedPriceFor(product);
  const moq = product.moq?.trim() || null;
  const leadTime = product.shippingTime?.trim() || null;

  /* --- gallery --- */
  // Labels describe position only. The gallery was previously padded to five
  // captioned tiles ("Detail", "Application", "Packaging", "Factory video")
  // whether or not any such media existed; we do not know what a given photo
  // shows, and an absent photo is not a photo.
  const gallery: GalleryImage[] = (product.images ?? []).map((url, i) => ({
    id: `${product.id}-img-${i}`,
    label: i === 0 ? "Main view" : `View ${i + 1}`,
    gradient: GALLERY_GRADIENTS[(seed + i) % GALLERY_GRADIENTS.length],
    icon,
    url,
    isVideo: false,
  }));
  (product.videos ?? []).forEach((_, i) => {
    gallery.push({
      id: `${product.id}-video-${i}`,
      label: `Video ${i + 1}`,
      gradient: GALLERY_GRADIENTS[(seed + gallery.length) % GALLERY_GRADIENTS.length],
      icon,
      isVideo: true,
    });
  });
  if (gallery.length === 0) {
    gallery.push({
      id: `${product.id}-no-media`,
      label: "No photo provided",
      gradient: GALLERY_GRADIENTS[seed % GALLERY_GRADIENTS.length],
      icon,
      isVideo: false,
    });
  }

  /* --- specifications --- */
  // Only what the supplier published. The previous table asserted thickness,
  // width, length, material, grade, surface treatment, standard, certification
  // ("ISO 9001, CE, SGS") and packaging for every product, none of it measured.
  const specs: SpecRow[] = Object.entries(product.specifications ?? {})
    .filter(([label, value]) => label.trim() && String(value).trim())
    .map(([label, value]) => ({ label, value: String(value) }));

  const customizationOptions = (product.customizationOptions ?? []).filter((c) =>
    c.trim()
  );

  /* --- description sections --- */
  const place = [sd.city, sd.country].filter(Boolean).join(", ");
  // Keeps the scraped description when there is one; otherwise states only what
  // the record holds. No grade, standard, tolerance or quality-control claim.
  const overviewBody =
    product.description?.trim() ||
    `${product.name} is listed under ${product.category.toLowerCase()} by ${sd.name}${
      place ? ` (${place})` : ""
    }. Request a quote for specifications, pricing, minimum order quantity and lead time.`;

  const descriptionSections: DescriptionSection[] = [
    { id: "overview", title: "Overview", body: overviewBody },
  ];
  if (specs.length) {
    descriptionSections.push({
      id: "specifications",
      title: "Specifications",
      table: specs,
    });
  }
  if (customizationOptions.length) {
    descriptionSections.push({
      id: "customization",
      title: "Customization options",
      bullets: customizationOptions,
    });
  }

  /* --- recommended (same category first, excluding self) --- */
  const recommended: RecommendedProduct[] = allProducts
    .filter((p) => p.id !== product.id)
    .sort((a, b) => (a.category === product.category ? -1 : 1) - (b.category === product.category ? -1 : 1))
    .slice(0, 6)
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      gradient: GALLERY_GRADIENTS[(hashString(p.id) + i) % GALLERY_GRADIENTS.length],
      icon: ICONS_BY_CATEGORY[p.category],
      priceFromLabel: listedPriceFor(p)?.priceLabel ?? null,
      moq: p.moq?.trim() || null,
    }));

  /* --- supplier card --- */
  const supplier: ProductSupplierCard = {
    id: sd.id,
    name: sd.name,
    logoText: sd.logoText,
    logoGradient: sd.logoGradient,
    country: sd.country,
    city: sd.city,
    flag: sd.flag,
    verified: sd.verified,
    rating: sd.rating,
    reviewCount: sd.reviewCount,
    href: `/supplier/${sd.id}`,
  };

  return {
    product,
    category: product.category,
    unit,
    moq,
    leadTime,
    rating: product.rating ?? null,
    reviewCount: product.reviewCount ?? null,
    commissionRate: rate,
    listedPrice,
    gallery,
    customizationOptions,
    specs,
    descriptionSections,
    recommended,
    supplier,
  };
}
