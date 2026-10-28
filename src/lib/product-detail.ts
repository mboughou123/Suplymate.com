// Deterministic Alibaba-style product detail generator.
//
// Given a base Product, this derives everything a premium B2B product page needs
// (gallery, tiered commissioned pricing, specs, description sections, reviews,
// recommended products, and the linked supplier) seeded from the product id, so
// pages render correctly WITHOUT a database. The platform commission from
// src/config/commerce.ts is applied to every displayed price.

import type { Product, ProductCategory } from "@/data/products";
import { products as allProducts } from "@/data/products";
import type { Supplier } from "@/data/suppliers";
import { verifiedSuppliers } from "@/data/verified-suppliers";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import { getPackSupplier, toDirectorySupplier } from "@/data/pack-catalog";
import { toDisplaySupplier } from "@/lib/supplier-display";
import { publicMoq, sourcedGoogleRating, sourcedGoogleReviews } from "@/lib/sourced-facts";
import {
  getRealProductImage,
  hasRealProductImage,
  isRealImageUrl,
} from "@/lib/image-fallback";
import {
  AI_GENERATED_LABEL,
  aiAltText,
  displayImageUrl,
  rankByAuthenticity,
  readImageAttribution,
  type PhotoSource,
} from "@/lib/image-attribution";
import { calculateSupplierCompletenessScore } from "@/lib/supplier-completeness";
import {
  COMMISSION_RATE,
  applyCommission,
  formatPrice,
} from "@/config/commerce";

/* ----------------------------- RNG helpers ----------------------------- */

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
  | "shield"
  | "truck"
  | "award"
  | "factory"
  | "leaf"
  | "ruler"
  | "package"
  | "globe"
  | "sparkles";

export type GalleryImage = {
  id: string;
  label: string;
  /** Alt text. AI illustrations say so explicitly. */
  alt?: string;
  gradient: string;
  icon: IconKey;
  isVideo: boolean;
  url?: string;
  aiGenerated?: boolean;
  photoSource?: PhotoSource | null;
};

export type PriceTier = {
  minQty: number;
  rangeLabel: string;
  basePrice: number;
  price: number; // displayed (commission applied)
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

export type ProductHighlight = {
  icon: IconKey;
  title: string;
  text: string;
};

export type ProductOption = { name: string; values: string[] };

export type ProductReview = {
  id: string;
  author: string;
  company: string;
  country: string;
  flag: string;
  rating: number;
  date: string;
  verifiedPurchase: boolean;
  title: string;
  body: string;
};

export type ReviewSummary = {
  average: number;
  total: number;
  distribution: { stars: number; count: number; pct: number }[];
};

export type RecommendedProduct = {
  id: string;
  name: string;
  category: string;
  gradient: string;
  icon: IconKey;
  priceFromLabel: string;
  moq: string | null;
};

export type ProductSupplierCard = {
  id: string;
  name: string;
  logoText: string;
  logoGradient: string;
  logoUrl?: string;
  country: string;
  city: string;
  flag: string;
  verified: boolean;
  rating: number | null;
  reviewCount: number | null;
  responseTime: string | null;
  yearsInBusiness: number | null;
  onTimeDelivery: number | null;
  reorderRate: number | null;
  href: string;
};

export type ProductDetail = {
  product: Product;
  category: ProductCategory;
  unit: string;
  moq: string | null;
  leadTime: string | null;
  rating: number | null;
  reviewCount: number | null;
  commissionRate: number;
  displayFromLabel: string;
  gallery: GalleryImage[];
  priceTiers: PriceTier[];
  options: ProductOption[];
  customizationOptions: string[];
  highlights: ProductHighlight[];
  specs: SpecRow[];
  descriptionSections: DescriptionSection[];
  reviews: ProductReview[];
  reviewSummary: ReviewSummary;
  recommended: RecommendedProduct[];
  supplier: ProductSupplierCard;
  shipping: {
    leadTime: string | null;
    methods: string[];
    incoterms: string[];
    packaging: string | null;
    port: string | null;
  };
};

/* ----------------------------- Source pools ---------------------------- */

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

const MATERIALS: Record<ProductCategory, string[]> = {
  "Steel & Metals": ["Carbon steel Q235", "Stainless steel 304/316", "Galvanized steel", "Aluminum 6061"],
  "Cables & Electrical": ["Electrolytic copper", "Tinned copper", "XLPE insulation", "PVC sheath"],
  "Tubes & Pipes": ["Seamless carbon steel", "Stainless steel 304", "HDPE PE100", "PVC-U"],
  Packaging: ["Kraft paper 200gsm", "Corrugated E-flute", "PET / rPET", "LDPE film"],
  Construction: ["Portland clinker", "Reinforced concrete", "Mineral wool", "EPDM membrane"],
  "Industrial Parts": ["Alloy steel 40Cr", "Cast iron GG25", "Hardened steel", "Bronze bushing"],
};

const SURFACE_TREATMENTS = ["Hot-dip galvanized", "Powder coated", "Anodized", "Mill finish", "Polished"];
const STANDARDS = ["ASTM A36", "EN 10025", "ISO 9001", "DIN 17100", "GB/T 700", "JIS G3101"];
const GRADES = ["Grade A", "Premium", "Industrial", "Commercial", "Export grade"];
const ORIGINS = ["China", "Germany", "India", "Turkey", "Italy", "United States"];
const PACKAGING_OPTIONS = [
  "Export-standard wooden pallets + steel strapping",
  "Seaworthy crates with moisture barrier",
  "Bundled with waterproof wrap on pallets",
  "Carton boxes on shrink-wrapped pallets",
];
const INCOTERMS = ["FOB", "CIF", "EXW", "DDP", "FCA"];
const SHIP_METHODS = ["Sea freight (FCL/LCL)", "Air freight", "Rail freight", "Express courier"];
const PORTS = ["Shanghai", "Hamburg", "Mumbai (Nhava Sheva)", "Istanbul (Ambarli)", "Genoa", "Rotterdam"];

const REVIEW_AUTHORS = [
  "Procurement Director",
  "Sourcing Manager",
  "Operations Lead",
  "Category Buyer",
  "Plant Manager",
  "Head of Purchasing",
];
const REVIEW_COMPANIES = [
  "Meridian Industries",
  "Vortex Manufacturing",
  "Northwind Trading",
  "Apex Build Group",
  "Cardinal Components",
  "Stratos Engineering",
  "Orion Procurement",
];
const REVIEW_COUNTRIES = ["United States", "Germany", "France", "United Kingdom", "Netherlands", "UAE", "Spain", "Canada"];
const FLAGS: Record<string, string> = {
  "united states": "🇺🇸", usa: "🇺🇸", germany: "🇩🇪", france: "🇫🇷", "united kingdom": "🇬🇧", uk: "🇬🇧",
  netherlands: "🇳🇱", uae: "🇦🇪", "united arab emirates": "🇦🇪", spain: "🇪🇸", italy: "🇮🇹", canada: "🇨🇦",
  china: "🇨🇳", india: "🇮🇳", turkey: "🇹🇷", morocco: "🇲🇦", mexico: "🇲🇽", brazil: "🇧🇷",
};
function flagFor(country: string): string {
  return FLAGS[country.trim().toLowerCase()] ?? "🌍";
}

/* ----------------------------- Linkage --------------------------------- */

// A supplier "has a real photo" if it carries a banner or gallery photograph
// (Google Maps / website media, or a local curated pack photo). Used to prefer
// image-bearing suppliers so the products they back can show a genuine
// photograph rather than a category tile.
function supplierHasRealPhoto(s: Supplier): boolean {
  return isRealImageUrl(s.imageUrl) || Boolean(s.supplierImages?.some(isRealImageUrl));
}

// Real photos linked to a supplier record (banner + gallery), de-duplicated.
function supplierPhotos(s: Supplier): string[] {
  return [
    ...new Set(
      [s.imageUrl, ...(s.supplierImages ?? [])].filter((u): u is string => isRealImageUrl(u))
    ),
  ];
}

// Link a catalogue product to a REAL supplier. Products that carry a
// `supplierId` (imported / pack products) resolve to that exact supplier — the
// curated pack first, then the directory. Legacy demo products without one are
// deterministically linked to an image-bearing Outscraper supplier so the card
// can surface a real photo, falling back to the generated verified directory
// only when no image-bearing supplier exists for the category.
function linkedSupplier(product: Product): Supplier {
  if (product.supplierId) {
    const pack = getPackSupplier(product.supplierId);
    if (pack) return toDirectorySupplier(pack);
    const known =
      outscraperSuppliers.find((s) => s.id === product.supplierId) ??
      verifiedSuppliers.find((s) => s.id === product.supplierId);
    if (known) return known;
  }
  const seed = hashString(product.id || product.name);

  const sameCatWithPhoto = outscraperSuppliers.filter(
    (s) => s.category === product.category && supplierHasRealPhoto(s)
  );
  if (sameCatWithPhoto.length) return sameCatWithPhoto[seed % sameCatWithPhoto.length];

  const anyWithPhoto = outscraperSuppliers.filter(supplierHasRealPhoto);
  if (anyWithPhoto.length) return anyWithPhoto[seed % anyWithPhoto.length];

  const verifiedSameCat = verifiedSuppliers.filter((s) => s.category === product.category);
  const list = verifiedSameCat.length ? verifiedSameCat : verifiedSuppliers;
  return list[seed % list.length];
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
  /** True when the card image is an AI illustration (it ranks below any real photo). */
  aiGenerated?: boolean;
  supplierId: string;
  supplierName: string;
  supplierLocation: string;
  verified: boolean;
  /** Profile-completeness of the linked supplier (sort key for the catalogue). */
  completenessScore: number;
  unit: string;
  bulkPriceLabel: string;
  moq: string | null;
  shippingTime: string | null;
  rating: number | null;
  reviewCount: number | null;
};

/** Lightweight derivation for catalogue cards (no full detail generation). */
export function getProductCardData(product: Product): ProductCardData {
  const seed = hashString(product.id || product.name);
  const supplierRecord = linkedSupplier(product);
  const sd = toDisplaySupplier(supplierRecord);
  const rate = product.commissionRate ?? COMMISSION_RATE;
  const base = product.basePrice ?? product.priceMin;

  const photos = supplierPhotos(supplierRecord);
  const ownImages = (product.images ?? []).map((url) => ({
    url,
    ...readImageAttribution({ url }),
  }));
  const realOwn = ownImages.filter((image) => !image.aiGenerated).map((image) => displayImageUrl(image.url));
  const aiOwn = ownImages.filter((image) => image.aiGenerated);
  const imageInput = {
    images: realOwn,
    supplierImages: photos,
    id: product.id,
    slug: product.slug,
    supplierId: product.supplierId,
    productName: product.name,
    category: product.category,
  };
  const realImage = getRealProductImage(imageInput);
  const showingAi = !realImage && aiOwn.length > 0;

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
    imageUrl: realImage ?? (showingAi ? displayImageUrl(aiOwn[0].url) : undefined),
    hasRealPhoto: hasRealProductImage(imageInput),
    aiGenerated: showingAi,
    supplierId: sd.id,
    supplierName: sd.name,
    supplierLocation: [sd.city, sd.country].filter(Boolean).join(", "),
    verified: sd.verified,
    completenessScore,
    unit: product.unit,
    bulkPriceLabel: base > 0 ? `${formatPrice(applyCommission(base, rate), product.currency)} / ${product.unit}` : "",
    moq: publicMoq(product.moq, product.category),
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

/* ----------------------------- Generator ------------------------------- */

export function getProductDetail(product: Product): ProductDetail {
  const seed = hashString(product.id || product.name);

  const supplierRecord = linkedSupplier(product);
  const sd = toDisplaySupplier(supplierRecord);

  const unit = product.unit;
  const icon = ICONS_BY_CATEGORY[product.category];

  /* --- pricing (commission applied) --- */
  const base = product.basePrice ?? product.priceMin;
  const rate = product.commissionRate ?? COMMISSION_RATE;
  const listed = base > 0;
  const priceTiers: PriceTier[] = listed
    ? [
        {
          minQty: 1,
          rangeLabel: `Per ${unit}`,
          basePrice: base,
          price: applyCommission(base, rate),
          priceLabel: `${formatPrice(applyCommission(base, rate), product.currency)} / ${unit}`,
        },
      ]
    : [];
  const displayFromLabel = listed
    ? `${formatPrice(applyCommission(base, rate), product.currency)} / ${unit}`
    : "Contact supplier for pricing";

  /* --- gallery --- */
  const galleryLabels = ["Main view", "Detail", "Application", "Packaging", "Factory video"];
  const hasVideos = (product.videos?.length ?? 0) > 0;
  let gallery: GalleryImage[];

  if (product.images?.length) {
    const ranked = rankByAuthenticity(
      product.images.map((url) => ({ url, ...readImageAttribution({ url }) }))
    );
    gallery = ranked.map((image, i) => {
      const ai = image.aiGenerated;
      const label = ai ? `${product.name} — ${AI_GENERATED_LABEL}` : `${product.name} — photo ${i + 1}`;
      return {
        id: `${product.id}-img-${i}`,
        // Real photographs are labelled by product, not by an invented "view".
        label,
        alt: ai ? aiAltText(product.name, label) : label,
        gradient: GALLERY_GRADIENTS[(seed + i) % GALLERY_GRADIENTS.length],
        icon,
        url: displayImageUrl(image.url),
        isVideo: false,
        aiGenerated: ai,
        photoSource: image.photoSource,
      };
    });
    if (hasVideos) {
      gallery.push({
        id: `${product.id}-video-0`,
        label: "Factory video",
        gradient: GALLERY_GRADIENTS[(seed + gallery.length) % GALLERY_GRADIENTS.length],
        icon,
        isVideo: true,
      });
    }
  } else {
    gallery = galleryLabels.map((label, i) => ({
      id: `${product.id}-img-${i}`,
      label,
      gradient: GALLERY_GRADIENTS[(seed + i) % GALLERY_GRADIENTS.length],
      icon,
      isVideo: hasVideos && i === galleryLabels.length - 1,
    }));
  }

  /* --- moq / lead time / rating: stored fields only --- */
  const moq = publicMoq(product.moq, product.category);
  const leadTime = product.shippingTime?.trim() || null;
  const rating = product.rating ?? null;
  const reviewCount = product.reviewCount ?? null;

  const options: ProductOption[] = [];
  const customizationOptions = (product.customizationOptions ?? []).filter((c) => c.trim());
  const highlights: ProductHighlight[] = [];

  const specs: SpecRow[] = [
    { label: "Product Name", value: product.name },
    ...Object.entries(product.specifications ?? {})
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
      .map(([label, value]) => ({ label, value })),
  ];
  if (supplierRecord.country) specs.push({ label: "Place of Origin", value: supplierRecord.country });
  if (moq) specs.push({ label: "MOQ", value: moq });
  if (leadTime) specs.push({ label: "Delivery Time", value: leadTime });

  const descriptionSections: DescriptionSection[] = [];
  if (product.description?.trim()) {
    descriptionSections.push({
      id: "overview",
      title: "Overview",
      body: product.description.trim(),
    });
  }
  if (specs.length) {
    descriptionSections.push({ id: "specifications", title: "Specifications", table: specs });
  }
  if (customizationOptions.length) {
    descriptionSections.push({
      id: "customization",
      title: "Customization Options",
      bullets: customizationOptions,
    });
  }

  const reviews: ProductReview[] = [];
  const reviewSummary: ReviewSummary = {
    average: rating ?? 0,
    total: reviewCount ?? 0,
    distribution: [],
  };

  const recommended: RecommendedProduct[] = allProducts
    .filter((p) => p.id !== product.id)
    .sort((a, b) => (a.category === product.category ? -1 : 1) - (b.category === product.category ? -1 : 1))
    .slice(0, 6)
    .map((p, i) => {
      const listedPrice = p.basePrice ?? p.priceMin;
      return {
        id: p.id,
        name: p.name,
        category: p.category,
        gradient: GALLERY_GRADIENTS[(hashString(p.id) + i) % GALLERY_GRADIENTS.length],
        icon: ICONS_BY_CATEGORY[p.category],
        priceFromLabel:
          listedPrice > 0
            ? formatPrice(applyCommission(listedPrice, p.commissionRate ?? rate), p.currency)
            : "",
        moq: publicMoq(p.moq, p.category),
      };
    });

  /* --- supplier card --- */
  const packHost = product.supplierId ? getPackSupplier(product.supplierId) : undefined;
  const supplier: ProductSupplierCard = {
    id: sd.id,
    name: sd.name,
    logoText: sd.logoText,
    logoGradient: sd.logoGradient,
    logoUrl: sd.logoUrl,
    country: sd.country,
    city: sd.city,
    flag: sd.flag,
    verified: sd.verified,
    rating: sourcedGoogleRating(supplierRecord),
    reviewCount: sourcedGoogleReviews(supplierRecord),
    responseTime: null,
    yearsInBusiness: supplierRecord.yearsInBusiness ?? null,
    onTimeDelivery: null,
    reorderRate: null,
    href: packHost?.productHostOnly ? "" : `/supplier/${sd.id}`,
  };

  return {
    product,
    category: product.category,
    unit,
    moq,
    leadTime,
    rating,
    reviewCount,
    commissionRate: rate,
    displayFromLabel,
    gallery,
    priceTiers,
    options,
    customizationOptions,
    highlights,
    specs,
    descriptionSections,
    reviews,
    reviewSummary,
    recommended,
    supplier,
    shipping: {
      leadTime,
      methods: [],
      incoterms: [],
      packaging: null,
      port: null,
    },
  };
}

function applicationsFor(category: ProductCategory): string[] {
  const map: Record<ProductCategory, string[]> = {
    "Steel & Metals": ["Structural construction & framing", "Automotive & machinery fabrication", "Shipbuilding & infrastructure", "Industrial equipment manufacturing"],
    "Cables & Electrical": ["Power transmission & distribution", "Building & industrial wiring", "Telecom & data networks", "Renewable energy installations"],
    "Tubes & Pipes": ["Oil, gas & fluid transport", "Plumbing & HVAC systems", "Structural & scaffolding", "Irrigation & water supply"],
    Packaging: ["FMCG & retail packaging", "Industrial & export shipping", "Food-grade packaging", "E-commerce fulfillment"],
    Construction: ["Commercial & residential building", "Infrastructure & civil works", "Roads, bridges & foundations", "Insulation & waterproofing"],
    "Industrial Parts": ["Heavy machinery & equipment", "Automotive & transport", "Hydraulic & pneumatic systems", "MRO & maintenance"],
  };
  return map[category];
}
