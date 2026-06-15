import type { Supplier } from "@/data/suppliers";

export type DisplayProduct = {
  name: string;
  price: string;
  moq: string;
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
  score: number;
  logoText: string;
  logoGradient: string;
  bannerGradient: string;
  logoUrl?: string;
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

function priceFor(seed: number, industry: string): string {
  // Rough per-industry price bands to feel realistic.
  const bands: Record<string, [number, number]> = {
    Metal: [12, 980],
    "Construction & BTP": [8, 140],
    "Industrial Equipment": [1200, 85000],
    "Electrotechnical & Cabling": [1, 45],
    "Plastics & Packaging": [1, 12],
    "Agriculture & Agrofood": [10, 120],
  };
  const [lo, hi] = bands[industry] ?? [5, 200];
  const low = lo + (seed % Math.max(1, Math.floor((hi - lo) * 0.3)));
  const high = low + Math.max(1, Math.floor((hi - low) * 0.5));
  const fmt = (n: number) =>
    n >= 1 ? `$${n.toLocaleString()}` : `$${n.toFixed(2)}`;
  return `${fmt(low)} – ${fmt(high)}`;
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

  const moqList = [s.moq];
  const products: DisplayProduct[] = s.products.slice(0, 3).map((name, i) => ({
    name,
    price: priceFor(seed + i * 7, s.industry),
    moq: moqList[i] ?? `${seeded(seed + i, 1, 500)} pcs`,
    gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
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
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
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
    moq: s.moq,
    deliveryRegions: s.deliveryRegions,
    reliabilityScore: s.reliabilityScore,
  };
}
