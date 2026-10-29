// Public supplier profile.
//
// Performance numbers (on-time delivery, reorder rate, response time, buyer
// reviews, AI forecasts) are not invented. The only score on the page is
// `trust.trustScore`, which is Suplymate's listing-completeness score from
// public fields the record actually holds.

import type { Supplier } from "@/data/suppliers";
import { toDisplaySupplier, type DisplaySupplier } from "@/lib/supplier-display";
import {
  isCatalogueVerified,
  publicMoq,
  sourcedGoogleRating,
  sourcedGoogleReviews,
  sourcedProductNames,
  suplymateProfileScore,
} from "@/lib/sourced-facts";
import {
  isRealImageUrl,
  getSupplierFallbackImage,
  getProductFallbackImage,
} from "@/lib/image-fallback";
import { AI_GENERATED_LABEL, displayImageUrl, readImageAttribution, type PhotoSource } from "@/lib/image-attribution";
import {
  calculateSupplierCompleteness,
  mediaQualityFor,
  type MediaQuality,
} from "@/lib/supplier-completeness";
import { packProductsForSupplier } from "@/data/pack-catalog";
import { COMMISSION_RATE, applyCommission, formatPrice } from "@/config/commerce";

/* ------------------------------------------------------------------ */
/* Real-certification labelling                                        */
/* ------------------------------------------------------------------ */

/** Short badge code for a collected certification ("ISO 9001", "API 5L", "CE"). */
export function certificationCode(name: string, type?: string | null): string {
  const m = name.match(
    /\b(API(?:\s?(?:Spec\s?)?[A-Z0-9]{1,4})?|ISO(?:\/IEC)?\s?\d{4,5}|IATF\s?\d+|OHSAS\s?\d+|EN\s?\d{4,5}|ASTM\s?[A-Z]\d+|BIS|CARES|ACRS|PED|RoHS|CE|UL|FM|SASO|ADNOC)\b/i
  );
  if (m) return m[1].replace(/\s+/g, " ").toUpperCase().replace("SPEC ", "Spec ");
  if (type) return type.replace(/_/g, " ");
  return name.length > 18 ? `${name.slice(0, 16).trim()}…` : name;
}

/** Issuing body family for a collected certification (display only). */
export function certificationAuthority(name: string, type?: string | null): string {
  const n = `${name} ${type ?? ""}`.toLowerCase();
  if (/\bapi\b/.test(n)) return "American Petroleum Institute";
  if (/\biatf\b/.test(n)) return "IATF";
  if (/\bcares\b/.test(n)) return "UK CARES";
  if (/\bacrs\b/.test(n)) return "ACRS";
  if (/\bbis\b/.test(n)) return "Bureau of Indian Standards";
  if (/\bul\b/.test(n)) return "UL Solutions";
  if (/\bfm\b/.test(n)) return "FM Approvals";
  if (/\badnoc\b/.test(n)) return "ADNOC";
  if (/\bsaso\b/.test(n)) return "SASO";
  if (/\bce\b|\bcpr\b|\bped\b|\ben\s?\d/.test(n)) return "EU notified body";
  if (/\biso\b|\biec\b|\bohsas\b/.test(n)) return "Accredited certification body";
  return "Supplier-declared";
}

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

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type RiskLevel = "Low" | "Moderate" | "Elevated";

export type TrustMetrics = {
  /** Suplymate listing-completeness score (0–100). Not a performance rating. */
  trustScore: number;
  rating: number | null;
  reviewCount: number | null;
  onTimeDelivery: number | null;
  repeatBuyerRate: number | null;
  orderCompletion: number | null;
  riskLevel: RiskLevel | null;
  aiConfidence: number | null;
  responseRate: number | null;
  responseTime: string | null;
  deliveryReliability: number | null;
  qualityConsistency: number | null;
  trends: {
    onTime: number[];
    quality: number[];
    response: number[];
  } | null;
};

export type CompanyProfile = {
  registrationDate: string | null;
  yearsInBusiness: number | null;
  businessType: string | null;
  factorySize: string | null;
  employeeCount: string | null;
  productionLines: number | null;
  rdEngineers: number | null;
  annualOutput: string | null;
  exportMarkets: string[];
  languages: string[];
  moq: string | null;
  productionCapacity: string | null;
  address: string | null;
  openingHours: string | null;
};

export type Certification = {
  id: string;
  code: string;
  name: string;
  authority: string;
  issued: string;
  expiry: string;
  verified: boolean;
  /** Local / hosted scan of the certificate when the supplier published one. */
  imageUrl?: string | null;
  /** Mill page the certificate was collected from (attribution link). */
  sourceUrl?: string | null;
  /**
   * True when this entry is REAL collected data (pack / import / scrape) rather
   * than the deterministic placeholder set — real entries never show invented
   * issue/expiry dates or a verified badge.
   */
  isReal: boolean;
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
  photoSource?: PhotoSource | null;
  aiGenerated?: boolean;
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
  moq: string;
  leadTime: string;
  material: string;
  certifications: string[];
  shipping: string;
  aiRecommended: boolean;
  rating: number;
  /** Catalogue detail page when the product is a real listed SKU. */
  href?: string;
  /** True for real catalogue products (no invented rating / AI pick / specs). */
  isReal: boolean;
  /** True when the card image is an AI illustration. */
  aiGeneratedImage?: boolean;
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
  deliveryReliabilityPrediction: number;
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
};

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

export function getSupplierProfile(s: Supplier): SupplierProfile {
  const base = toDisplaySupplier(s);
  const seed = hashString(s.id || s.name);
  const profileScore = suplymateProfileScore(s);
  const googleRating = sourcedGoogleRating(s);
  const googleReviews = sourcedGoogleReviews(s);

  const trust: TrustMetrics = {
    trustScore: profileScore,
    rating: googleRating,
    reviewCount: googleReviews,
    onTimeDelivery: null,
    repeatBuyerRate: null,
    orderCompletion: null,
    riskLevel: null,
    aiConfidence: null,
    responseRate: null,
    responseTime: null,
    deliveryReliability: null,
    qualityConsistency: null,
    trends: null,
  };

  /* --- Company profile: only fields stored on the record. --- */
  const company: CompanyProfile = {
    registrationDate: null,
    yearsInBusiness: s.yearsInBusiness ?? null,
    businessType: s.businessType?.trim() || null,
    factorySize: null,
    employeeCount: s.employees?.trim() || null,
    productionLines: null,
    rdEngineers: null,
    annualOutput: null,
    exportMarkets: [],
    languages: [],
    moq: publicMoq(s.moq, s.category),
    productionCapacity: null,
    address: s.address?.trim() || null,
    openingHours: s.openingHours?.trim() || null,
  };

  /* --- Certifications: collected records only. No placeholder set. --- */
  const realCerts = (s.certificationsDetailed ?? []).filter((c) => c.name && c.name.trim());
  const certifications: Certification[] = realCerts.map((c, i) => ({
    id: `${base.id}-cert-${i}`,
    code: certificationCode(c.name, c.type),
    name: c.name.trim(),
    authority: certificationAuthority(c.name, c.type),
    issued: "",
    expiry: "",
    verified: false,
    imageUrl: c.imageUrl ?? null,
    sourceUrl: c.certificateUrl ?? c.sourceUrl ?? null,
    isReal: true,
  }));

  /* --- Media gallery --- */
  // Image priority: supplier website/Google Places photos (s.imageUrl +
  // s.supplierImages) → category-based factory/warehouse fallback → branded
  // placeholder. Never an empty gallery. Suppliers with no website rely on the
  // Google Places photos (collected at import); we never scrape their site.
  const realSupplierPhotos = [s.imageUrl, ...(s.supplierImages ?? [])]
    .filter((u): u is string => typeof u === "string" && isRealImageUrl(displayImageUrl(u)))
    .map((u) => ({ url: displayImageUrl(u), ...readImageAttribution({ url: u }) }));
  const categoryMediaFallback = getSupplierFallbackImage(
    s.category ?? s.industry,
    s.name
  );
  // Only real photographs. No illustrative factory tiles or fake video.
  const media: MediaItem[] = realSupplierPhotos.map((real, i) => {
    const title = real.aiGenerated ? AI_GENERATED_LABEL : `Photo ${i + 1}`;
    const alibabaCaption = real.photoSource === "alibaba-store" ? "Photo: supplier's Alibaba store" : null;
    return {
      id: `${base.id}-media-${i}`,
      type: "image" as const,
      title,
      caption: alibabaCaption ?? `${base.name} — photo ${i + 1}`,
      gradient: MEDIA_GRADIENTS[(seed + i) % MEDIA_GRADIENTS.length],
      url: real.url,
      fallback: categoryMediaFallback,
      isReal: true,
      photoSource: real.photoSource ?? null,
      aiGenerated: Boolean(real.aiGenerated),
    };
  });

  /* --- Products --- */
  // Real catalogue SKUs (curated packs with local photos) take over the grid
  // entirely — no padding with invented "Series" variants, no fake ratings.
  const realProducts = packProductsForSupplier(s.id);
  const sourcedNames = sourcedProductNames(s);
  const products: ProfileProduct[] = realProducts.length
    ? realProducts.map((p) => {
        const imageFallback = getProductFallbackImage(p.name, p.category);
        const ranked = [...p.images]
          .map((url) => ({ url, ...readImageAttribution({ url }) }))
          .sort((a, b) => Number(a.aiGenerated) - Number(b.aiGenerated));
        const real = ranked.find((image) => !image.aiGenerated);
        const shown = real ?? ranked[0];
        const hasPhoto = Boolean(shown) && !shown.aiGenerated;
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          gradient: PRODUCT_GRADIENTS[hashString(p.id) % PRODUCT_GRADIENTS.length],
          image: shown ? displayImageUrl(shown.url) : imageFallback,
          imageFallback,
          hasRealPhoto: hasPhoto,
          aiGeneratedImage: Boolean(shown?.aiGenerated) && !hasPhoto,
          priceRange:
            p.basePrice != null
              ? `${formatPrice(applyCommission(p.basePrice, p.commissionRate ?? COMMISSION_RATE), p.currency)}${
                  p.priceUnit ? ` / ${p.priceUnit}` : ""
                }`
              : "Contact supplier for pricing",
          moq: publicMoq(p.moq, p.category) ?? "",
          leadTime: "Quoted per order",
          material: p.category,
          certifications: [],
          shipping: "Quoted per order",
          aiRecommended: false,
          rating: 0,
          href: `/products/${p.id}`,
          isReal: true,
        };
      })
    : sourcedNames.map((name, i) => {
    const imageFallback = getProductFallbackImage(name, s.category ?? base.categoryLabel);
    return {
      id: `${base.id}-p-${i}`,
      name,
      category: base.categoryLabel,
      gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
      image: imageFallback,
      imageFallback,
      hasRealPhoto: false,
      aiGeneratedImage: false,
      priceRange: "",
      moq: "",
      leadTime: "",
      material: "",
      certifications: [],
      shipping: "",
      aiRecommended: false,
      rating: 0,
      isReal: false,
    };
  });

  const reviews: Review[] = [];
  const reviewSummary: ReviewSummary = {
    average: googleRating ?? 0,
    total: googleReviews ?? 0,
    distribution: [],
    avgService: 0,
    avgShipping: 0,
    avgQuality: 0,
    aiSummary: "",
  };

  const ai: AiInsights = {
    analysis: "",
    sourcingRecommendations: [],
    negotiationInsights: [],
    riskAnalysis: "",
    pricingCompetitiveness: 0,
    bestMarkets: [],
    deliveryReliabilityPrediction: 0,
    overallConfidence: 0,
    priceTrend: [],
    demandTrend: [],
    cards: [],
  };

  const realDescription =
    typeof s.description === "string" && s.description.trim().length >= 80
      ? s.description.trim()
      : null;
  const productNames = sourcedNames.slice(0, 3);
  const generatedDescription = `${base.name} is a ${base.categoryLabel.toLowerCase()} supplier based in ${
    base.city
  }, ${base.country}${
    productNames.length ? `, with listed products including ${productNames.join(", ")}` : ""
  }.`;
  const companySummary = realDescription ?? generatedDescription;

  const verifiedWord = isCatalogueVerified(s) ? "verified " : "";
  const googleBit =
    googleRating != null
      ? ` Google rating ${googleRating.toFixed(1)}${
          googleReviews != null ? ` from ${googleReviews.toLocaleString()} Google reviews` : ""
        }.`
      : "";
  const metaDescription = `${base.name} — ${verifiedWord}${base.categoryLabel} supplier in ${base.city}, ${base.country}.${googleBit} Suplymate score ${profileScore}/100 measures how complete the public listing is, not delivery or quality.`;

  /* --- completeness / quality flags --- */
  const completeness = calculateSupplierCompleteness({
    verified: base.verified,
    website: s.website,
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    images: s.supplierImages,
    products: s.products,
    productImages: realSupplierPhotos.filter((photo) => !photo.aiGenerated).map((photo) => photo.url),
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
    productImages: realSupplierPhotos.filter((photo) => !photo.aiGenerated).map((photo) => photo.url),
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
  };
}
