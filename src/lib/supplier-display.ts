import type { Supplier } from "@/data/suppliers";
import type { ListingSupplier } from "@/lib/supplier-listing";
import { pickPreferredCardImage } from "@/lib/image-fallback";
import {
  isCatalogueVerified,
  sourcedGoogleRating,
  sourcedGoogleReviews,
  sourcedProductNames,
  suplymateProfileScore,
} from "@/lib/sourced-facts";

export type DisplayProduct = {
  name: string;
  price: string;
  moq: string;
  gradient: string;
  /** Local product photo (curated packs) — cards render it instead of the icon tile. */
  image?: string;
  /** Catalogue detail page for a real listed SKU. */
  href?: string;
  /** True when this is a real catalogue product (no illustrative price / MOQ). */
  isReal?: boolean;
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
  description?: string;
  sourceUrl?: string;
  score: number;
  /** Completeness of public listing fields. Not a delivery or quality score. */
  profileScore: number;
  logoText: string;
  logoGradient: string;
  bannerGradient: string;
  logoUrl?: string;
  imageUrl?: string;
  /** Google Maps rating when the listing has one. Never invented. */
  rating: number | null;
  googleRating: number | null;
  reviewCount: number | null;
  googleReviews: number | null;
  verified: boolean;
  yearsInBusiness: number | null;
  employees: string | null;
  area: string | null;
  onTimeDelivery: number | null;
  responseTime: string | null;
  reorderRate: number | null;
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
  "linear-gradient(135deg, #0b1b30, #143a5f 55%, rgba(14,165,183,0.55))",
  "linear-gradient(135deg, #1e293b, #0b1b30 55%, rgba(20,184,166,0.5))",
  "linear-gradient(135deg, #0b1b30, rgba(14,165,183,0.4) 60%, #0f172a)",
  "linear-gradient(135deg, #0f172a, #0b1b30 55%, rgba(20,184,166,0.45))",
];

const PRODUCT_GRADIENTS = [
  "linear-gradient(135deg, rgba(14,165,183,0.18), rgba(20,184,166,0.18))",
  "linear-gradient(135deg, rgba(30,58,95,0.14), rgba(14,165,183,0.2))",
  "linear-gradient(135deg, rgba(20,184,166,0.18), rgba(16,185,129,0.18))",
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

function hasProfileFields(
  s: Supplier | ListingSupplier,
): s is Supplier {
  return "description" in s || "email" in s || "address" in s || "certificationImages" in s;
}

export function toDisplaySupplier(s: Supplier | ListingSupplier): DisplaySupplier {
  const seed = hashString(s.id || s.name);
  const country = s.country ?? countryOf(s.location);
  const city = s.city ?? s.location.split(",")[0].trim();
  const googleRating = sourcedGoogleRating(s);
  const googleReviews = sourcedGoogleReviews(s);
  const verified = isCatalogueVerified(s);
  const yearsInBusiness = s.yearsInBusiness ?? null;
  const employees = s.employees ?? null;
  const listedScore = "profileScore" in s ? s.profileScore : undefined;
  const profileScore =
    typeof listedScore === "number"
      ? listedScore
      : hasProfileFields(s)
        ? suplymateProfileScore(s)
        : 0;

  // Real photo-bearing catalogue SKUs take the card slots. Category-template
  // product names and invented prices are not shown.
  const featured: DisplayProduct[] = (s.featuredProducts ?? [])
    .filter((p) => p.image)
    .slice(0, 3)
    .map((p, i) => ({
      name: p.name,
      price: "",
      moq: "",
      gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
      image: p.image,
      href: `/products/${p.id}`,
      isReal: true,
    }));
  const named: DisplayProduct[] = sourcedProductNames(s)
    .filter((name) => !featured.some((f) => f.name.toLowerCase() === name.toLowerCase()))
    .slice(0, Math.max(0, 3 - featured.length))
    .map((name, i) => ({
      name,
      price: "",
      moq: "",
      gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
    }));
  const products: DisplayProduct[] = [...featured, ...named];

  return {
    id: s.id,
    name: s.name,
    industry: s.industry,
    categoryLabel: s.category ?? s.industry,
    location: s.location,
    country,
    city,
    flag: flagFor(country),
    website: "website" in s ? s.website : undefined,
    description: "description" in s ? s.description : undefined,
    sourceUrl: "sourceUrl" in s ? s.sourceUrl : undefined,
    score: s.score ?? s.reliabilityScore,
    profileScore,
    logoText: initials(s.name),
    logoGradient: LOGO_GRADIENTS[seed % LOGO_GRADIENTS.length],
    bannerGradient: BANNER_GRADIENTS[seed % BANNER_GRADIENTS.length],
    logoUrl: s.logoUrl,
    imageUrl: pickPreferredCardImage([s.imageUrl, ...(s.supplierImages ?? [])]),
    rating: googleRating,
    googleRating,
    reviewCount: googleReviews,
    googleReviews,
    verified,
    yearsInBusiness,
    employees,
    area: null,
    onTimeDelivery: null,
    responseTime: null,
    reorderRate: null,
    products,
    moq: s.moq,
    deliveryRegions: "deliveryRegions" in s ? s.deliveryRegions : [],
    reliabilityScore: s.reliabilityScore,
  };
}
