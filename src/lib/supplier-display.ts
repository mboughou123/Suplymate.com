import type { Supplier } from "@/data/suppliers";
import {
  getFactoryPhotoUrl,
  getSupplierLogoUrl,
  isPhase1Supplier,
  logoNeedsDarkChip,
} from "@/lib/phase1";

export type DisplayProduct = {
  name: string;
  /** Real price string, or "RFQ" when no sourced commercial price exists. */
  price: string;
  /** Real MOQ when present; empty string means omit from the card. */
  moq: string;
  gradient: string;
  /** True when price is a sourced value (never a fabricated band). */
  hasRealPrice: boolean;
  /** True when moq is a sourced supplier value. */
  hasRealMoq: boolean;
};

export type DisplaySupplier = {
  id: string;
  name: string;
  industry: string;
  categoryLabel: string;
  location: string;
  country: string;
  city: string;
  flag: string;
  website?: string;
  phone?: string;
  email?: string;
  description?: string;
  sourceUrl?: string;
  score: number;
  logoText: string;
  logoGradient: string;
  bannerGradient: string;
  logoUrl?: string;
  /** White-on-dark reverse logos need a dark avatar chip. */
  logoDarkChip: boolean;
  /** Primary factory / mill photograph for the card header (or undefined). */
  factoryPhotoUrl?: string;
  imageUrl?: string;
  rating: number | null;
  reviewCount: number | null;
  hasRealRating: boolean;
  hasRealReviews: boolean;
  verified: boolean;
  yearsInBusiness: number | null;
  employees: string | null;
  /** Name-heuristic only — the directory has no manufacturer/trader column. */
  likelyTrader: boolean;
  businessTypeLabel: string;
  products: DisplayProduct[];
  moq: string;
  deliveryRegions: string[];
  reliabilityScore: number;
};

const LOGO_GRADIENTS = [
  "linear-gradient(135deg, #0ea5b7, #14b8a6)",
  "linear-gradient(135deg, #1e3a5f, #0ea5b7)",
  "linear-gradient(135deg, #14b8a6, #10b981)",
  "linear-gradient(135deg, #0284c7, #14b8a6)",
  "linear-gradient(135deg, #0D3349, #0284c7)",
  "linear-gradient(135deg, #10b981, #0ea5b7)",
];

const BANNER_GRADIENTS = [
  "linear-gradient(135deg, #061018, #0d3349 55%, rgba(3,105,161,0.55))",
  "linear-gradient(135deg, #0d3349, #061018 55%, rgba(26,74,107,0.55))",
  "linear-gradient(135deg, #061018, rgba(3,105,161,0.4) 60%, #0d3349)",
  "linear-gradient(135deg, #0d3349, #1a4a6b 55%, rgba(3,105,161,0.45))",
];

const PRODUCT_GRADIENTS = [
  "linear-gradient(135deg, rgba(3,105,161,0.12), rgba(14,165,183,0.16))",
  "linear-gradient(135deg, rgba(13,51,73,0.10), rgba(3,105,161,0.14))",
  "linear-gradient(135deg, rgba(20,184,166,0.14), rgba(16,185,129,0.12))",
  "linear-gradient(135deg, #eef2f7, #f8fafc)",
];

const FLAGS: Record<string, string> = {
  usa: "🇺🇸",
  "united states": "🇺🇸",
  france: "🇫🇷",
  germany: "🇩🇪",
  norway: "🇳🇴",
  italy: "🇮🇹",
  china: "🇨🇳",
  netherlands: "🇳🇱",
  uae: "🇦🇪",
  "united arab emirates": "🇦🇪",
  spain: "🇪🇸",
  morocco: "🇲🇦",
  greece: "🇬🇷",
  india: "🇮🇳",
  turkey: "🇹🇷",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  mexico: "🇲🇽",
  brazil: "🇧🇷",
  "south korea": "🇰🇷",
  "saudi arabia": "🇸🇦",
  poland: "🇵🇱",
  vietnam: "🇻🇳",
  oman: "🇴🇲",
  qatar: "🇶🇦",
  egypt: "🇪🇬",
};

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function countryOf(location: string): string {
  const parts = location.split(",");
  return parts[parts.length - 1].trim();
}

function flagFor(country: string): string {
  return FLAGS[country.toLowerCase()] ?? "🌍";
}

/** True when the legal name reads as a trader/distributor, not a mill. */
export function looksLikeTrader(name: string): boolean {
  return /\b(trading|trader|traders)\b/i.test(name);
}

/**
 * Public label for mill vs trader. Phase-1 pack rows are mills; names that
 * include Trading/Trader are labeled as traders so they are never presented
 * as verified manufacturers. Everyone else is a generic supplier.
 */
export function inferBusinessType(
  supplier: Pick<Supplier, "id" | "name">
): string {
  if (looksLikeTrader(supplier.name)) return "Trader / distributor";
  if (isPhase1Supplier(supplier)) return "Manufacturer";
  return "Supplier";
}

export function toDisplaySupplier(s: Supplier): DisplaySupplier {
  const seed = hashString(s.id || s.name);
  const country = s.country ?? countryOf(s.location);
  const city = s.city ?? s.location.split(",")[0].trim();

  // Ratings / reviews: only sourced fields — never invent demo junk.
  const rating = s.googleRating ?? s.rating ?? null;
  const reviewCount = s.googleReviews ?? s.reviewCount ?? null;
  const verified = s.verified ?? false;

  const factoryPhotoUrl = getFactoryPhotoUrl(s);
  const logoUrl = getSupplierLogoUrl(s);

  const realMoq = (s.moq ?? "").trim();
  const products: DisplayProduct[] = s.products.slice(0, 3).map((name, i) => ({
    name,
    price: "RFQ",
    moq: realMoq,
    gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
    hasRealPrice: false,
    hasRealMoq: Boolean(realMoq),
  }));

  return {
    id: s.id,
    name: s.name,
    industry: s.industry,
    categoryLabel: s.category ?? s.industry,
    location: s.location,
    country,
    city,
    flag: flagFor(country),
    website: s.website,
    phone: s.phone,
    email: s.email,
    description: s.description,
    sourceUrl: s.sourceUrl,
    score: s.score ?? s.reliabilityScore,
    logoText: initials(s.name),
    logoGradient: LOGO_GRADIENTS[seed % LOGO_GRADIENTS.length],
    bannerGradient: BANNER_GRADIENTS[seed % BANNER_GRADIENTS.length],
    logoUrl,
    logoDarkChip: logoNeedsDarkChip(s.id),
    factoryPhotoUrl,
    imageUrl: factoryPhotoUrl,
    rating,
    reviewCount,
    hasRealRating: rating != null,
    hasRealReviews: reviewCount != null,
    verified,
    yearsInBusiness: s.yearsInBusiness ?? null,
    employees: s.employees ?? null,
    likelyTrader: looksLikeTrader(s.name),
    businessTypeLabel: inferBusinessType(s),
    products,
    moq: realMoq,
    deliveryRegions: s.deliveryRegions,
    reliabilityScore: s.reliabilityScore,
  };
}
