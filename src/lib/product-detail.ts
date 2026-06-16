// Deterministic Alibaba-style product detail generator.
//
// Given a base Product, this derives everything a premium B2B product page needs
// (gallery, tiered commissioned pricing, specs, description sections, reviews,
// recommended products, and the linked supplier) seeded from the product id, so
// pages render correctly WITHOUT a database. The platform commission from
// src/config/commerce.ts is applied to every displayed price.

import type { Product, ProductCategory } from "@/data/products";
import { products as allProducts } from "@/data/products";
import { verifiedSuppliers } from "@/data/verified-suppliers";
import { toDisplaySupplier } from "@/lib/supplier-display";
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

function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
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
  gradient: string;
  icon: IconKey;
  isVideo: boolean;
  url?: string;
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
  moq: string;
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
  rating: number;
  reviewCount: number;
  responseTime: string;
  yearsInBusiness: number;
  onTimeDelivery: number;
  reorderRate: number;
  href: string;
};

export type ProductDetail = {
  product: Product;
  category: ProductCategory;
  unit: string;
  moq: string;
  leadTime: string;
  rating: number;
  reviewCount: number;
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
    leadTime: string;
    methods: string[];
    incoterms: string[];
    packaging: string;
    port: string;
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

function linkedSupplier(product: Product) {
  const pool = verifiedSuppliers.filter((s) => s.category === product.category);
  const list = pool.length ? pool : verifiedSuppliers;
  const idx = hashString(product.id) % list.length;
  return list[idx];
}

/* ----------------------------- Card data ------------------------------- */

export type ProductCardData = {
  id: string;
  name: string;
  category: ProductCategory;
  icon: IconKey;
  gradient: string;
  imageUrl?: string;
  supplierId: string;
  supplierName: string;
  verified: boolean;
  unit: string;
  bulkPriceLabel: string;
  moq: string;
  shippingTime: string;
  rating: number;
  reviewCount: number;
};

/** Lightweight derivation for catalogue cards (no full detail generation). */
export function getProductCardData(product: Product): ProductCardData {
  const seed = hashString(product.id || product.name);
  const rng = makeRng(seed);
  const supplierRecord = linkedSupplier(product);
  const sd = toDisplaySupplier(supplierRecord);
  const rate = product.commissionRate ?? COMMISSION_RATE;
  const base = product.basePrice ?? product.priceMin;
  // Bulk price = best tier (highest volume discount), commission applied.
  const bulkPrice = applyCommission(base * 0.82, rate);
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    icon: ICONS_BY_CATEGORY[product.category],
    gradient: GALLERY_GRADIENTS[seed % GALLERY_GRADIENTS.length],
    imageUrl: product.images?.[0],
    supplierId: sd.id,
    supplierName: sd.name,
    verified: sd.verified,
    unit: product.unit,
    bulkPriceLabel: `${formatPrice(bulkPrice, product.currency)} / ${product.unit}`,
    moq: product.moq ?? `${intBetween(rng, 1, 50) * (product.unit === "ton" ? 1 : 10)} ${product.unit}s`,
    shippingTime: product.shippingTime ?? `${product.bestDeliveryDays}–${product.bestDeliveryDays + 8} days`,
    rating: product.rating ?? Math.min(5, Math.round((4.3 + rng() * 0.6) * 10) / 10),
    reviewCount: product.reviewCount ?? intBetween(rng, 24, 480),
  };
}

/* ----------------------------- Generator ------------------------------- */

export function getProductDetail(product: Product): ProductDetail {
  const seed = hashString(product.id || product.name);
  const rng = makeRng(seed);

  const supplierRecord = linkedSupplier(product);
  const sd = toDisplaySupplier(supplierRecord);

  const unit = product.unit;
  const icon = ICONS_BY_CATEGORY[product.category];

  /* --- pricing (commission applied) --- */
  const base = product.basePrice ?? product.priceMin;
  const rate = product.commissionRate ?? COMMISSION_RATE;
  const tierDefs = [
    { minQty: 1, mult: 1.0 },
    { minQty: 50, mult: 0.94 },
    { minQty: 200, mult: 0.88 },
    { minQty: 1000, mult: 0.82 },
  ];
  const priceTiers: PriceTier[] = tierDefs.map((t, i) => {
    const basePrice = Math.round(base * t.mult * 100) / 100;
    const price = applyCommission(basePrice, rate);
    const next = tierDefs[i + 1];
    const rangeLabel = next
      ? `${t.minQty} – ${next.minQty - 1} ${unit}s`
      : `≥ ${t.minQty} ${unit}s`;
    return {
      minQty: t.minQty,
      rangeLabel,
      basePrice,
      price,
      priceLabel: `${formatPrice(price, product.currency)} / ${unit}`,
    };
  });
  const displayFromLabel = `${formatPrice(applyCommission(base * 0.82, rate), product.currency)} – ${formatPrice(
    applyCommission(product.priceMax, rate),
    product.currency
  )}`;

  /* --- gallery --- */
  const galleryLabels = ["Main view", "Detail", "Application", "Packaging", "Factory video"];
  const hasVideos = (product.videos?.length ?? 0) > 0;
  let gallery: GalleryImage[];

  if (product.images?.length) {
    gallery = product.images.map((url, i) => ({
      id: `${product.id}-img-${i}`,
      label: galleryLabels[i] ?? `Image ${i + 1}`,
      gradient: GALLERY_GRADIENTS[(seed + i) % GALLERY_GRADIENTS.length],
      icon,
      url,
      isVideo: false,
    }));
    while (gallery.length < 2) {
      const i = gallery.length;
      gallery.push({
        id: `${product.id}-placeholder-${i}`,
        label: galleryLabels[i] ?? `View ${i + 1}`,
        gradient: GALLERY_GRADIENTS[(seed + i) % GALLERY_GRADIENTS.length],
        icon,
        isVideo: false,
      });
    }
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

  /* --- moq / lead time / rating --- */
  const moq = product.moq ?? `${intBetween(rng, 1, 50) * (unit === "ton" ? 1 : 10)} ${unit}s`;
  const leadTime = product.shippingTime ?? `${product.bestDeliveryDays}–${product.bestDeliveryDays + 8} days`;
  const rating = product.rating ?? Math.min(5, Math.round((4.3 + rng() * 0.6) * 10) / 10);
  const reviewCount = product.reviewCount ?? intBetween(rng, 24, 480);

  /* --- options & customization --- */
  const material = pick(rng, MATERIALS[product.category]);
  const options: ProductOption[] = [
    { name: "Grade", values: [pick(rng, GRADES), pick(rng, GRADES)].filter((v, i, a) => a.indexOf(v) === i) },
    { name: "Surface", values: [pick(rng, SURFACE_TREATMENTS), pick(rng, SURFACE_TREATMENTS)].filter((v, i, a) => a.indexOf(v) === i) },
    { name: "Packaging", values: ["Standard export", "Custom branded"] },
  ];
  const customizationOptions = product.customizationOptions ?? [
    "Custom dimensions & tolerances",
    "OEM / private-label branding",
    "Bespoke surface treatment & color",
    "Tailored packaging & labeling",
    "Third-party inspection on request",
  ];

  /* --- highlights --- */
  const highlights: ProductHighlight[] = [
    { icon: "shield", title: "Verified supplier", text: `Sourced from ${sd.name}, a vetted ${product.category.toLowerCase()} supplier.` },
    { icon: "award", title: "Certified quality", text: `Produced under ${pick(rng, STANDARDS)} with full documentation.` },
    { icon: "truck", title: "Export-ready", text: `Ships in ${leadTime} with ${pick(rng, INCOTERMS)} / ${pick(rng, INCOTERMS)} terms.` },
    { icon: "package", title: "Flexible MOQ", text: `Orders from ${moq}, with tiered volume discounts.` },
  ];

  /* --- specifications table (Alibaba-style) --- */
  const origin = supplierRecord.country ?? pick(rng, ORIGINS);
  const standard = pick(rng, STANDARDS);
  const grade = pick(rng, GRADES);
  const surface = pick(rng, SURFACE_TREATMENTS);
  const packaging = pick(rng, PACKAGING_OPTIONS);
  const specs: SpecRow[] = [
    { label: "Product Name", value: product.name },
    { label: "Material", value: material },
    { label: "Thickness", value: `${intBetween(rng, 1, 40)} mm` },
    { label: "Width", value: `${intBetween(rng, 50, 2000)} mm` },
    { label: "Length", value: `${intBetween(rng, 1, 12)} m / custom` },
    { label: "Surface Treatment", value: surface },
    { label: "Standard", value: standard },
    { label: "Grade", value: grade },
    { label: "Certification", value: "ISO 9001, CE, SGS" },
    { label: "Place of Origin", value: origin },
    { label: "MOQ", value: moq },
    { label: "Delivery Time", value: leadTime },
    { label: "Packaging", value: packaging },
    { label: "Customization Available", value: "Yes (OEM / ODM)" },
  ];

  /* --- description sections --- */
  const descriptionSections: DescriptionSection[] = [
    {
      id: "overview",
      title: "Overview",
      body:
        product.description ??
        `The ${product.name} is a premium ${product.category.toLowerCase()} product supplied by ${sd.name} (${sd.city}, ${sd.country}). Manufactured to ${standard} under strict quality control, it is engineered for demanding industrial applications and available for global B2B export with flexible MOQs and tiered volume pricing.`,
    },
    {
      id: "features",
      title: "Key Features",
      bullets: [
        `Manufactured from ${material.toLowerCase()} for consistent performance`,
        `${surface} finish for durability and corrosion resistance`,
        `Compliant with ${standard} and ${grade.toLowerCase()} specifications`,
        "Batch-traceable with full quality documentation",
        "Available in standard and custom dimensions",
      ],
    },
    { id: "specifications", title: "Specifications", table: specs },
    {
      id: "applications",
      title: "Applications",
      bullets: applicationsFor(product.category),
    },
    {
      id: "materials",
      title: "Materials",
      body: `Primary material: ${material}. Raw inputs are sourced from certified mills and verified on intake. Material certificates (mill test reports) are provided with every shipment on request.`,
    },
    {
      id: "certifications",
      title: "Certifications",
      bullets: ["ISO 9001 — Quality Management", "CE — European Conformity", "SGS — Verified factory audit", "RoHS — Hazardous substance compliance"],
    },
    {
      id: "packaging",
      title: "Packaging",
      body: `${packaging}. Each unit is labeled with product code, batch number, and handling instructions. Custom branded packaging is available for OEM orders.`,
    },
    {
      id: "shipping",
      title: "Shipping & Delivery",
      body: `Standard lead time is ${leadTime} after order confirmation. We ship via ${SHIP_METHODS.slice(0, 3).join(", ")} from the Port of ${pick(rng, PORTS)} under ${INCOTERMS.slice(0, 3).join(" / ")} terms. Express options are available for urgent orders.`,
    },
    {
      id: "customization",
      title: "Customization Options",
      bullets: customizationOptions,
    },
  ];

  /* --- reviews --- */
  const reviewTitles = [
    "Reliable quality for recurring orders",
    "Exactly as specified, on time",
    "Competitive pricing and fast quotes",
    "Great export experience",
    "Consistent batches, solid documentation",
  ];
  const reviewBodies = [
    "Delivered on spec and on time. Material certificates were complete and the packaging held up well for ocean freight.",
    "We've reordered several times — quality has been consistent and communication is responsive.",
    "Pricing beat three other quotes and the lead time was shorter than promised.",
    "Samples matched the production batch. Smooth from RFQ to delivery.",
    "Handled a custom spec without issues; QC photos were shared before dispatch.",
  ];
  const reviewN = intBetween(rng, 4, 6);
  const reviews: ProductReview[] = Array.from({ length: reviewN }).map((_, i) => {
    const rr = makeRng(hashString(`${product.id}-rev-${i}`));
    const country = pick(rr, REVIEW_COUNTRIES);
    return {
      id: `${product.id}-rev-${i}`,
      author: pick(rr, REVIEW_AUTHORS),
      company: pick(rr, REVIEW_COMPANIES),
      country,
      flag: flagFor(country),
      rating: rr() > 0.82 ? 4 : 5,
      date: `${pick(rr, ["Jan", "Feb", "Mar", "Apr", "May", "Sep", "Oct", "Nov"])} 202${intBetween(rr, 4, 6)}`,
      verifiedPurchase: rr() > 0.2,
      title: pick(rr, reviewTitles),
      body: pick(rr, reviewBodies),
    };
  });
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    return { stars, count, pct: Math.round((count / reviews.length) * 100) };
  });
  const reviewSummary: ReviewSummary = { average: rating, total: reviewCount, distribution };

  /* --- recommended (same category, excluding self) --- */
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
      priceFromLabel: `From ${formatPrice(applyCommission((p.basePrice ?? p.priceMin) * 0.82, rate), p.currency)}`,
      moq: p.moq ?? `${intBetween(makeRng(hashString(p.id)), 1, 50)} ${p.unit}s`,
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
    responseTime: sd.responseTime,
    yearsInBusiness: sd.yearsInBusiness,
    onTimeDelivery: sd.onTimeDelivery,
    reorderRate: sd.reorderRate,
    href: `/supplier/${sd.id}`,
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
      methods: SHIP_METHODS.slice(0, 3),
      incoterms: INCOTERMS.slice(0, 3),
      packaging,
      port: pick(rng, PORTS),
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
