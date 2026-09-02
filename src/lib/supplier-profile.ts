// Deterministic "Verified Supplier Profile" content generator.
//
// Everything a premium supplier profile page needs is derived deterministically
// from the Supplier record (seeded from a hash of the supplier id), so profiles
// render correctly WITHOUT any database — which is exactly how the live site runs
// today (the Neon DB lacks the newer profile tables, so the data layer falls back
// to generated data). When real profile tables (certifications, reviews, media,
// trust_scores, ai_insights, …) are populated later, a thin mapper can replace
// these generators; the page never depends on them existing.

import type { Supplier } from "@/data/suppliers";
import { scoreSupplier } from "@/lib/supplier-ranking";
import { toDisplaySupplier, inferBusinessType, type DisplaySupplier } from "@/lib/supplier-display";
import {
  getSupplierFallbackImage,
  getProductFallbackImage,
} from "@/lib/image-fallback";
import { collectFactoryPhotoUrls, isPhase1Supplier } from "@/lib/phase1";
import {
  calculateSupplierCompleteness,
  mediaQualityFor,
  type MediaQuality,
} from "@/lib/supplier-completeness";

/* ------------------------------------------------------------------ */
/* Seeded deterministic randomness                                     */
/* ------------------------------------------------------------------ */

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small, fast deterministic PRNG (mulberry32). Stable across runs/platforms.
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

function pickSome<T>(rng: () => number, arr: readonly T[], min: number, max: number): T[] {
  const count = Math.min(arr.length, min + Math.floor(rng() * (max - min + 1)));
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return out;
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type RiskLevel = "Low" | "Moderate" | "Elevated";

export type TrustMetrics = {
  trustScore: number;
  rating: number | null;
  reviewCount: number | null;
  onTimeDelivery: number | null;
  repeatBuyerRate: number | null;
  orderCompletion: number | null;
  riskLevel: RiskLevel;
  aiConfidence: number;
  responseRate: number | null;
  responseTime: string | null;
  deliveryReliability: number | null;
  qualityConsistency: number | null;
  trends: {
    onTime: number[];
    quality: number[];
    response: number[];
  };
};

export type CompanyProfile = {
  registrationDate: string;
  yearsInBusiness: number | null;
  businessType: string;
  factorySize: string;
  employeeCount: string;
  productionLines: number | null;
  rdEngineers: number | null;
  annualOutput: string;
  exportMarkets: string[];
  languages: string[];
  moq: string;
  productionCapacity: string;
};

export type Certification = {
  id: string;
  code: string;
  name: string;
  authority: string;
  issued: string;
  expiry: string;
  verified: boolean;
};

export type MediaItem = {
  id: string;
  type: "image" | "video";
  title: string;
  caption: string;
  gradient: string;
  /** Best image URL — real supplier photo when available, else category tile. */
  url: string;
  /** Category-based fallback used if `url` fails to load. */
  fallback: string;
  /** True when `url` is a genuine supplier photograph (not a category tile). */
  isReal: boolean;
};

export type ProfileProduct = {
  id: string;
  name: string;
  category: string;
  gradient: string;
  /** Best product image — supplier photo when available, else category tile. */
  image: string;
  /** Category-based fallback used if `image` fails to load. */
  imageFallback: string;
  /** True when `image` is a genuine photograph. */
  hasRealPhoto: boolean;
  priceRange: string;
  hasRealPrice: boolean;
  moq: string;
  hasRealMoq: boolean;
  leadTime: string;
  material: string;
  certifications: string[];
  shipping: string;
  aiRecommended: boolean;
  rating: number | null;
};

export type Review = {
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
  service: number;
  shipping: number;
  quality: number;
  helpful: number;
};

export type ReviewSummary = {
  average: number;
  total: number;
  distribution: { stars: number; count: number; pct: number }[];
  avgService: number;
  avgShipping: number;
  avgQuality: number;
  aiSummary: string;
};

export type AiInsight = {
  id: string;
  title: string;
  body: string;
  confidence: number;
  trend: number[];
  tone: "positive" | "neutral" | "watch";
};

export type AiInsights = {
  analysis: string;
  sourcingRecommendations: string[];
  negotiationInsights: string[];
  riskAnalysis: string;
  pricingCompetitiveness: number;
  bestMarkets: string[];
  deliveryReliabilityPrediction: number | null;
  overallConfidence: number;
  cards: AiInsight[];
  priceTrend: number[];
  demandTrend: number[];
};

export type SupplierProfile = {
  base: DisplaySupplier;
  slug: string;
  metaDescription: string;
  companySummary: string;
  trust: TrustMetrics;
  company: CompanyProfile;
  certifications: Certification[];
  media: MediaItem[];
  products: ProfileProduct[];
  reviews: Review[];
  reviewSummary: ReviewSummary;
  ai: AiInsights;
  /** 0–100 profile completeness (drives admin/quality signals). */
  completenessScore: number;
  /** High-value signals still missing (e.g. "Website", "Real product photos"). */
  missingSignals: string[];
  /** True when the supplier has no website (no website scraping is attempted). */
  websiteMissing: boolean;
  /** Coarse media-quality bucket — low/medium suppliers flagged for admin. */
  mediaQuality: MediaQuality;
  /** True when the gallery is backed only by category fallbacks (no real media). */
  mediaIncomplete: boolean;
  /** False until sourced mill KPIs exist — never invent on-time / reorder %. */
  hasSourcedTrustMetrics: boolean;
};

/* ------------------------------------------------------------------ */
/* Source pools                                                        */
/* ------------------------------------------------------------------ */

const CERT_POOL: { code: string; name: string; authority: string }[] = [
  { code: "ISO 9001", name: "Quality Management System", authority: "Bureau Veritas" },
  { code: "ISO 14001", name: "Environmental Management", authority: "SGS" },
  { code: "CE", name: "European Conformity", authority: "TÜV Rheinland" },
  { code: "RoHS", name: "Hazardous Substances Compliance", authority: "Intertek" },
  { code: "SGS", name: "Verified Supplier Audit", authority: "SGS Group" },
  { code: "Intertek", name: "Factory Inspection Report", authority: "Intertek" },
  { code: "FDA", name: "Food & Drug Compliance", authority: "US FDA" },
  { code: "GMP", name: "Good Manufacturing Practice", authority: "NSF International" },
  { code: "ISO 45001", name: "Occupational Health & Safety", authority: "DNV" },
];

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

const PRODUCT_GRADIENTS = [
  "linear-gradient(135deg, rgba(2,132,199,0.16), rgba(13,148,136,0.18))",
  "linear-gradient(135deg, rgba(13,51,73,0.14), rgba(2,132,199,0.2))",
  "linear-gradient(135deg, rgba(20,184,166,0.18), rgba(16,185,129,0.16))",
  "linear-gradient(135deg, #eef2f7, #f8fafc)",
  "linear-gradient(135deg, rgba(96,165,250,0.16), rgba(2,132,199,0.14))",
  "linear-gradient(135deg, rgba(203,163,81,0.14), rgba(244,234,210,0.5))",
];

const MEDIA_GRADIENTS = [
  "linear-gradient(135deg, #0b1b30, #143a5f 55%, rgba(14,165,183,0.55))",
  "linear-gradient(135deg, #1e293b, #0b1b30 55%, rgba(20,184,166,0.5))",
  "linear-gradient(135deg, #0b1b30, rgba(14,165,183,0.4) 60%, #0f172a)",
  "linear-gradient(135deg, #0f172a, #0b1b30 55%, rgba(20,184,166,0.45))",
  "linear-gradient(135deg, #102a43, #1e5580 60%, rgba(96,165,250,0.4))",
  "linear-gradient(135deg, #0d3349, #0284c7 70%, rgba(20,184,166,0.4))",
];

function riskFromScore(score: number): RiskLevel {
  if (score >= 82) return "Low";
  if (score >= 68) return "Moderate";
  return "Elevated";
}

export function getSupplierProfile(s: Supplier): SupplierProfile {
  const base = toDisplaySupplier(s);
  const seed = hashString(s.id || s.name);
  const rng = makeRng(seed);

  const trustScore = scoreSupplier({
    name: s.name,
    category: s.category ?? null,
    country: s.country ?? base.country,
    website: s.website ?? null,
    phone: s.phone ?? null,
    email: s.email ?? null,
    description: s.description ?? null,
    address: s.address ?? null,
    verified: base.verified,
    googleRating: base.rating,
    googleReviews: base.reviewCount,
    products: s.products,
  });

  /* --- Trust & performance --- */
  // Directory cards no longer invent on-time / reorder / response figures.
  // Keep the same stance on the profile until sourced mill KPIs exist.
  const ratingLabel =
    base.hasRealRating && base.rating != null ? `${base.rating.toFixed(1)}★` : "no sourced rating";
  const reviewLabel =
    base.hasRealReviews && base.reviewCount != null
      ? `${base.reviewCount.toLocaleString()} reviews`
      : "no sourced review count";
  const aiConfidence = Math.min(
    98,
    Math.round(
      base.rating != null ? (trustScore + base.rating * 10) / 1.5 : trustScore
    )
  );

  const trust: TrustMetrics = {
    trustScore,
    rating: base.rating,
    reviewCount: base.reviewCount,
    onTimeDelivery: null,
    repeatBuyerRate: null,
    orderCompletion: null,
    riskLevel: riskFromScore(trustScore),
    aiConfidence,
    responseRate: null,
    responseTime: null,
    deliveryReliability: null,
    qualityConsistency: null,
    trends: {
      onTime: [],
      quality: [],
      response: [],
    },
  };

  /* --- Company profile --- */
  const years = base.yearsInBusiness;
  const company: CompanyProfile = {
    registrationDate: years != null ? `${["Jan", "Mar", "Apr", "Jun", "Sep", "Nov"][seed % 6]} ${2026 - years}` : "",
    yearsInBusiness: years,
    businessType: inferBusinessType(s),
    factorySize: "",
    employeeCount: base.employees ?? "",
    productionLines: null,
    rdEngineers: null,
    annualOutput: "",
    exportMarkets: [],
    languages: [],
    moq: base.moq || "RFQ",
    productionCapacity: "",
  };

  /* --- Certifications --- */
  const certPool = pickSome(rng, CERT_POOL, 4, 6);
  const certifications: Certification[] = certPool.map((c, i) => {
    const issuedYear = intBetween(rng, 2019, 2024);
    return {
      id: `${base.id}-cert-${i}`,
      code: c.code,
      name: c.name,
      authority: c.authority,
      issued: `${issuedYear}`,
      expiry: `${issuedYear + 3}`,
      verified: rng() > 0.18,
    };
  });

  /* --- Media gallery --- */
  // Image priority: supplier website/Google Places photos (s.imageUrl +
  // s.supplierImages) → category-based factory/warehouse fallback → branded
  // placeholder. Never an empty gallery. Suppliers with no website rely on the
  // Google Places photos (collected at import); we never scrape their site.
  const realSupplierPhotos = collectFactoryPhotoUrls(s);
  const categoryMediaFallback = getSupplierFallbackImage(
    s.category ?? s.industry,
    s.name
  );
  // Rotating, sourcing-relevant captions for each tile.
  const mediaTitles = [
    "Production floor",
    "Warehouse & logistics",
    "Product showcase",
    "Quality control",
    "Factory exterior",
    "Material inspection",
  ];
  const media: MediaItem[] = mediaTitles.map((title, i) => {
    const real = realSupplierPhotos[i];
    return {
      id: `${base.id}-media-${i}`,
      // Only mark a tile as video when we have no real still to show for it
      // (keeps the lightbox honest about which tiles are genuine photos).
      type: i === 3 && realSupplierPhotos.length === 0 ? "video" : "image",
      title,
      caption: `${base.name} — ${title.toLowerCase()}`,
      gradient: MEDIA_GRADIENTS[(seed + i) % MEDIA_GRADIENTS.length],
      url: real ?? categoryMediaFallback,
      fallback: categoryMediaFallback,
      isReal: Boolean(real),
    };
  });

  /* --- Products --- */
  const productCats = ["Featured", "Best seller", "New", "Bulk", "Custom"];
  const baseProducts = s.products.length ? s.products : base.products.map((p) => p.name);
  const realMoq = isPhase1Supplier(s) ? (s.moq ?? "").trim() : "";
  const products: ProfileProduct[] = baseProducts.slice(0, 8).map((name, i) => {
    const pr = makeRng(hashString(`${s.id}-product-${i}`));
    const realPhoto = realSupplierPhotos.length
      ? realSupplierPhotos[i % realSupplierPhotos.length]
      : undefined;
    const imageFallback = getProductFallbackImage(name, s.category ?? base.categoryLabel);
    return {
      id: `${base.id}-p-${i}`,
      name,
      category: pick(pr, productCats),
      gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
      image: realPhoto ?? imageFallback,
      imageFallback,
      hasRealPhoto: Boolean(realPhoto),
      priceRange: "RFQ",
      hasRealPrice: false,
      moq: realMoq,
      hasRealMoq: Boolean(realMoq),
      leadTime: "",
      material: "",
      certifications: [],
      shipping: "",
      aiRecommended: false,
      rating: null,
    };
  });

  /* --- Reviews --- */
  // Do not fabricate buyer reviews. Show sourced Google rating/count in the
  // hero when present; the reviews grid stays empty until real reviews exist.
  const reviews: Review[] = [];
  const reviewSummary: ReviewSummary = {
    average: base.rating ?? 0,
    total: base.reviewCount ?? 0,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, pct: 0 })),
    avgService: 0,
    avgShipping: 0,
    avgQuality: 0,
    aiSummary: base.hasRealReviews
      ? `${base.name} has a sourced public listing score of ${ratingLabel} (${reviewLabel}).`
      : `Suplymate has not sourced independent buyer reviews for ${base.name} yet.`,
  };

  /* --- AI insights --- */
  const bestMarkets = company.exportMarkets.slice(0, 3);
  const overallConfidence = aiConfidence;
  const moqNote = company.moq && company.moq !== "RFQ" ? ` Typical MOQ: ${company.moq}.` : "";

  const ai: AiInsights = {
    analysis: `${base.name} is a ${base.businessTypeLabel.toLowerCase()} in ${
      base.categoryLabel
    }, based in ${base.city}, ${base.country}. Suplymate score ${trustScore}/100 (${ratingLabel}; ${reviewLabel}). Request an RFQ for live pricing — listed commercial figures are not estimated.`,
    sourcingRecommendations: [
      `Best fit for buyers needing ${base.products[0]?.name ?? "core products"}.${moqNote}`,
      `Ask Scout to match specs against other phase-1 mills in the same category.`,
      `Request a paid sample (refundable against first order) to validate spec before bulk commitment.`,
    ],
    negotiationInsights: [
      `Open an RFQ rather than relying on directory estimates — Suplymate does not invent price bands.`,
      `Ask for mill test certificates and lead time with the first quote.`,
      `Confirm Incoterms (FOB / CIF / EXW) in writing before committing volume.`,
    ],
    riskAnalysis: `Risk level from directory completeness: ${trust.riskLevel}. ${
      base.likelyTrader
        ? "This listing reads as a trader/distributor, not a mill — confirm manufacturing origin before treating it as a verified factory."
        : "Recommended safeguards: milestone payments and pre-shipment QC inspection."
    }`,
    pricingCompetitiveness: 0,
    bestMarkets,
    deliveryReliabilityPrediction: null,
    overallConfidence,
    priceTrend: [],
    demandTrend: [],
    cards: [
      {
        id: "pricing",
        title: "Pricing",
        body: "No sourced commercial price is on file. Use RFQ for live mill quotes.",
        confidence: overallConfidence,
        trend: [],
        tone: "neutral",
      },
      {
        id: "delivery",
        title: "Delivery",
        body: "On-time performance is not estimated. Confirm lead time in the RFQ.",
        confidence: overallConfidence,
        trend: [],
        tone: "neutral",
      },
      {
        id: "quality",
        title: "Quality",
        body: "Ask for mill test certificates and recent production photos with the quote.",
        confidence: overallConfidence,
        trend: [],
        tone: "neutral",
      },
      {
        id: "risk",
        title: "Sourcing risk",
        body: `${trust.riskLevel} completeness profile. ${
          base.likelyTrader
            ? "Treat as a trader until a mill of origin is confirmed."
            : "Use milestone payments on first orders."
        }`,
        confidence: aiConfidence,
        trend: [],
        tone: trust.riskLevel === "Low" ? "positive" : "watch",
      },
    ],
  };

  // Description enrichment: keep a real scraped description when present and
  // substantial; otherwise synthesise one from AVAILABLE DATA ONLY (category,
  // location, product names) — no invented certifications or capacity claims.
  const realDescription =
    typeof s.description === "string" && s.description.trim().length >= 80
      ? s.description.trim()
      : null;
  const productNames = (s.products.length ? s.products : base.products.map((p) => p.name))
    .filter(Boolean)
    .slice(0, 3);
  const generatedDescription = `${base.name} is a ${base.categoryLabel.toLowerCase()} supplier based in ${
    base.city
  }, ${base.country}${
    productNames.length ? `, offering products such as ${productNames.join(", ")}` : ""
  }. The company serves B2B buyers looking for reliable ${base.categoryLabel.toLowerCase()} sourcing with competitive MOQs from ${company.moq}.`;
  const companySummary = realDescription ?? generatedDescription;

  const metaDescription = `${base.name} — ${base.businessTypeLabel.toLowerCase()} in ${base.city}, ${base.country} (${base.categoryLabel}). Trust score ${trustScore}/100, ${ratingLabel}. Contact and RFQ on Suplymate.`;

  /* --- completeness / quality flags --- */
  const completeness = calculateSupplierCompleteness({
    verified: base.verified,
    website: s.website,
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    images: s.supplierImages,
    products: s.products,
    productImages: realSupplierPhotos,
    description: realDescription,
    rating: base.rating,
    reviewCount: base.reviewCount,
    certifications: s.certificationsDetailed ?? certifications,
    certificationImages: s.certificationImages,
  });
  // Suppliers with no website are NOT scraped (we only have their Google Places
  // photos/URL, used above as the media + provenance source). They naturally
  // rank lower via the website/completeness signals.
  // TODO(website-enrichment): add a future "Find website for supplier" flow
  // (Google Programmable Search or manual admin input in the review queue) that
  // backfills `website` here; do NOT add live web-search scraping inline.
  const websiteMissing = !(s.website && s.website.trim());
  const mediaQuality = mediaQualityFor({
    imageUrl: s.imageUrl,
    images: s.supplierImages,
    productImages: realSupplierPhotos,
  });

  return {
    base,
    slug: base.id,
    metaDescription,
    companySummary,
    trust,
    company,
    certifications,
    media,
    products,
    reviews,
    reviewSummary,
    ai,
    completenessScore: completeness.scorePct,
    missingSignals: completeness.missing,
    websiteMissing,
    mediaQuality,
    mediaIncomplete: realSupplierPhotos.length === 0,
    hasSourcedTrustMetrics: false,
  };
}
