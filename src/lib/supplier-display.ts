import type { Supplier } from "@/data/suppliers";
import { extractSupplierCity } from "@/lib/supplier-normalize";
import { isVerified } from "@/lib/verification";

// Presentation shape for a supplier.
//
// Every field here must trace back to collected data: Google Places, the
// supplier's own site, an admin entry, or the database. Fields that cannot be
// known are `null` and the UI omits them.
//
// This file previously invented review counts (up to 1,240), years in business,
// employee counts, factory area, on-time-delivery rates, response times,
// reorder rates and per-product prices, seeded from a hash of the supplier id.
// Those were presented as fact about real companies, so they were removed.
// Operational-performance metrics have no honest source until suppliers
// transact on the platform, so they are absent from the type entirely rather
// than nullable — the compiler then flags any attempt to render them.

export type DisplayProduct = {
  name: string;
  gradient: string;
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
  /** Data-completeness score (0–100) for our own record, not a quality rating. */
  score: number;
  logoText: string;
  logoGradient: string;
  bannerGradient: string;
  logoUrl?: string;
  imageUrl?: string;
  /** Google Places rating. Null when the supplier has none. */
  rating: number | null;
  /** Google Places review count. Null when the supplier has none. */
  reviewCount: number | null;
  verified: boolean;
  products: DisplayProduct[];
  /** Supplier-stated MOQ, or null when never supplied. */
  moq: string | null;
  deliveryRegions: string[];
  /** Alias of `score`; retained for existing call sites. */
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

export function toDisplaySupplier(s: Supplier): DisplaySupplier {
  const seed = hashString(s.id || s.name);
  const country = s.country ?? countryOf(s.location);
  const city =
    extractSupplierCity({
      city: s.city,
      country,
      address: s.address,
      location: s.location,
    }) ?? "";
  const location = [city, country].filter(Boolean).join(", ") || s.location;
  // Only a real Google Places rating counts. There is no defensible way to
  // derive a buyer rating from our own data-completeness score.
  const rating = s.googleRating ?? s.rating ?? null;
  const reviewCount = s.googleReviews ?? s.reviewCount ?? null;
  const verified = isVerified({
    marketplaceStatus: s.marketplaceStatus,
    verifiedBy: s.verifiedBy,
  });

  const products: DisplayProduct[] = s.products.slice(0, 3).map((name, i) => ({
    name,
    gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
  }));

  // The importer defaults MOQ to "Contact for MOQ", which is a prompt rather
  // than a supplier-stated figure, so it is treated as unknown.
  const statedMoq =
    s.moq && s.moq.trim() && !/^contact/i.test(s.moq.trim()) ? s.moq.trim() : null;

  return {
    id: s.id,
    name: s.name,
    industry: s.industry,
    categoryLabel: s.category ?? s.industry,
    location,
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
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    rating,
    reviewCount,
    verified,
    products,
    moq: statedMoq,
    deliveryRegions: s.deliveryRegions,
    reliabilityScore: s.reliabilityScore,
  };
}
