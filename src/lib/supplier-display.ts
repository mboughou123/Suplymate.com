import type { Supplier } from "@/data/suppliers";
import { getFactoryPhotoUrl, getSupplierLogoUrl } from "@/lib/phase1";

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
  /** Primary factory / mill photograph for the card header (or undefined). */
  factoryPhotoUrl?: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  yearsInBusiness: number;
  employees: string;
  area: string;
  onTimeDelivery: number;
  responseTime: string;
  reorderRate: number;
  products: DisplayProduct[];
  moq: string;
  deliveryRegions: string[];
  reliabilityScore: number;
};

// Inline CSS gradients (rendered via style=) so they never depend on Tailwind's
// JIT picking up dynamically-built class names.
const LOGO_GRADIENTS = [
  "linear-gradient(135deg, #0ea5b7, #14b8a6)",
  "linear-gradient(135deg, #1e3a5f, #0ea5b7)",
  "linear-gradient(135deg, #14b8a6, #10b981)",
  "linear-gradient(135deg, #6366f1, #0ea5b7)",
  "linear-gradient(135deg, #0284c7, #14b8a6)",
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
};

const EMPLOYEE_BUCKETS = ["10+", "50+", "100+", "200+", "500+"];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seeded(seed: number, min: number, max: number): number {
  return min + (seed % (max - min + 1));
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

export function toDisplaySupplier(s: Supplier): DisplaySupplier {
  const seed = hashString(s.id || s.name);
  const country = s.country ?? countryOf(s.location);
  const city = s.city ?? s.location.split(",")[0].trim();
  const rating =
    s.googleRating ??
    s.rating ??
    Math.min(5, Math.max(3.8, Math.round((s.reliabilityScore / 20) * 10) / 10));
  const reviewCount = s.googleReviews ?? s.reviewCount ?? seeded(seed, 18, 1240);
  const verified = s.verified ?? s.reliabilityScore >= 85;
  const yearsInBusiness = s.yearsInBusiness ?? seeded(seed >> 2, 5, 30);
  const employees = s.employees ?? EMPLOYEE_BUCKETS[seed % EMPLOYEE_BUCKETS.length];

  const factoryPhotoUrl = getFactoryPhotoUrl(s);
  const logoUrl = getSupplierLogoUrl(s.logoUrl);

  // Featured products: never invent price bands or MOQ figures.
  // Supplier.products is a string[] of names only — show RFQ for price.
  // MOQ is only shown when the supplier record itself carries a real moq.
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
    factoryPhotoUrl,
    imageUrl: factoryPhotoUrl ?? s.imageUrl,
    rating,
    reviewCount,
    verified,
    yearsInBusiness,
    employees,
    area: `${(seeded(seed, 5, 60) * 100).toLocaleString()}+ m²`,
    onTimeDelivery: seeded(seed, 90, 99),
    responseTime: `≤${[1, 2, 3, 4, 6][seed % 5]}h`,
    reorderRate: seeded(seed >> 1, 12, 46),
    products,
    moq: realMoq,
    deliveryRegions: s.deliveryRegions,
    reliabilityScore: s.reliabilityScore,
  };
}
