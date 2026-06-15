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
import { toDisplaySupplier, type DisplaySupplier } from "@/lib/supplier-display";

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

function trend(rng: () => number, points: number, base: number, spread: number): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < points; i++) {
    v += (rng() - 0.42) * spread;
    out.push(Math.round(Math.max(0, v) * 10) / 10);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Country flags (extends the card flag map for review authors)        */
/* ------------------------------------------------------------------ */

const FLAGS: Record<string, string> = {
  "united states": "🇺🇸",
  usa: "🇺🇸",
  germany: "🇩🇪",
  france: "🇫🇷",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
  italy: "🇮🇹",
  spain: "🇪🇸",
  netherlands: "🇳🇱",
  china: "🇨🇳",
  india: "🇮🇳",
  japan: "🇯🇵",
  "south korea": "🇰🇷",
  "united arab emirates": "🇦🇪",
  uae: "🇦🇪",
  "saudi arabia": "🇸🇦",
  turkey: "🇹🇷",
  morocco: "🇲🇦",
  mexico: "🇲🇽",
  brazil: "🇧🇷",
  canada: "🇨🇦",
  australia: "🇦🇺",
  poland: "🇵🇱",
  vietnam: "🇻🇳",
  singapore: "🇸🇬",
  belgium: "🇧🇪",
  sweden: "🇸🇪",
  switzerland: "🇨🇭",
};

function flagFor(country: string): string {
  return FLAGS[country.trim().toLowerCase()] ?? "🌍";
}

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

export type RiskLevel = "Low" | "Moderate" | "Elevated";

export type TrustMetrics = {
  trustScore: number;
  rating: number;
  reviewCount: number;
  onTimeDelivery: number;
  repeatBuyerRate: number;
  orderCompletion: number;
  riskLevel: RiskLevel;
  aiConfidence: number;
  responseRate: number;
  responseTime: string;
  deliveryReliability: number;
  qualityConsistency: number;
  trends: {
    onTime: number[];
    quality: number[];
    response: number[];
  };
};

export type CompanyProfile = {
  registrationDate: string;
  yearsInBusiness: number;
  businessType: string;
  factorySize: string;
  employeeCount: string;
  productionLines: number;
  rdEngineers: number;
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
};

export type ProfileProduct = {
  id: string;
  name: string;
  category: string;
  gradient: string;
  priceRange: string;
  moq: string;
  leadTime: string;
  material: string;
  certifications: string[];
  shipping: string;
  aiRecommended: boolean;
  rating: number;
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

const LANGUAGES = ["English", "Mandarin", "German", "French", "Spanish", "Arabic", "Italian", "Portuguese"];
const EXPORT_MARKETS = [
  "North America",
  "European Union",
  "Middle East",
  "Southeast Asia",
  "Latin America",
  "Africa",
  "United Kingdom",
  "Oceania",
];
const BUSINESS_TYPES = [
  "Manufacturer",
  "Manufacturer & Exporter",
  "Verified Factory",
  "Industrial Supplier",
  "OEM / ODM Manufacturer",
];
const MATERIALS = [
  "Carbon steel",
  "Stainless steel 304/316",
  "Aluminum alloy",
  "HDPE polymer",
  "Copper grade A",
  "Galvanized steel",
  "Reinforced composite",
  "PVC compound",
];
const LEAD_TIMES = ["7–12 days", "10–15 days", "15–20 days", "20–30 days", "3–6 weeks"];
const SHIPPING_TERMS = ["FOB", "CIF", "EXW", "DDP", "FOB / CIF"];

const REVIEW_AUTHORS = [
  "Procurement Director",
  "Sourcing Manager",
  "Operations Lead",
  "Supply Chain Manager",
  "Category Buyer",
  "Plant Manager",
  "Head of Purchasing",
];
const REVIEW_COMPANIES = [
  "Meridian Industries",
  "Vortex Manufacturing",
  "Northwind Trading",
  "Apex Build Group",
  "BlueHarbor Logistics",
  "Cardinal Components",
  "Stratos Engineering",
  "Lumen Fabrication",
  "Orion Procurement",
  "Halcyon Supplies",
];
const REVIEW_COUNTRIES = [
  "United States",
  "Germany",
  "France",
  "United Kingdom",
  "Netherlands",
  "United Arab Emirates",
  "Spain",
  "Italy",
  "Canada",
  "Mexico",
  "Saudi Arabia",
  "Singapore",
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
  const onTimeDelivery = base.onTimeDelivery;
  const repeatBuyerRate = base.reorderRate;
  const orderCompletion = intBetween(rng, 94, 99);
  const responseRate = intBetween(rng, 84, 99);
  const deliveryReliability = intBetween(rng, 88, 99);
  const qualityConsistency = intBetween(rng, 90, 99);
  const aiConfidence = Math.min(98, Math.round((trustScore + base.rating * 10) / 1.5));

  const trust: TrustMetrics = {
    trustScore,
    rating: base.rating,
    reviewCount: base.reviewCount,
    onTimeDelivery,
    repeatBuyerRate,
    orderCompletion,
    riskLevel: riskFromScore(trustScore),
    aiConfidence,
    responseRate,
    responseTime: base.responseTime,
    deliveryReliability,
    qualityConsistency,
    trends: {
      onTime: trend(rng, 8, onTimeDelivery - 4, 4),
      quality: trend(rng, 8, qualityConsistency - 4, 4),
      response: trend(rng, 8, responseRate - 6, 6),
    },
  };

  /* --- Company profile --- */
  const years = base.yearsInBusiness;
  const regYear = 2026 - years;
  const company: CompanyProfile = {
    registrationDate: `${["Jan", "Mar", "Apr", "Jun", "Sep", "Nov"][seed % 6]} ${regYear}`,
    yearsInBusiness: years,
    businessType: pick(rng, BUSINESS_TYPES),
    factorySize: `${(intBetween(rng, 8, 85) * 1000).toLocaleString()} m²`,
    employeeCount: base.employees,
    productionLines: intBetween(rng, 4, 24),
    rdEngineers: intBetween(rng, 6, 60),
    annualOutput: `${intBetween(rng, 12, 240)}k units / yr`,
    exportMarkets: pickSome(rng, EXPORT_MARKETS, 3, 6),
    languages: ["English", ...pickSome(rng, LANGUAGES.filter((l) => l !== "English"), 1, 3)],
    moq: base.moq,
    productionCapacity: `${intBetween(rng, 5, 60)},000 ${pick(rng, ["units", "tons", "pcs", "m"])}/month`,
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
  const mediaTitles = [
    "Production floor",
    "Quality control lab",
    "Warehouse & logistics",
    "Automated assembly line",
    "Factory tour",
    "Material inspection",
    "Packaging & dispatch",
    "Head office",
  ];
  const media: MediaItem[] = mediaTitles.slice(0, 6).map((title, i) => ({
    id: `${base.id}-media-${i}`,
    type: i === 3 ? "video" : "image",
    title,
    caption: `${base.name} — ${title.toLowerCase()}`,
    gradient: MEDIA_GRADIENTS[(seed + i) % MEDIA_GRADIENTS.length],
  }));

  /* --- Products --- */
  const productCats = ["Featured", "Best seller", "New", "Bulk", "Custom"];
  const baseProducts = s.products.length ? s.products : base.products.map((p) => p.name);
  const expanded = [...baseProducts];
  // pad to at least 6 product cards so the grid feels complete
  while (expanded.length < 6) {
    expanded.push(`${baseProducts[expanded.length % baseProducts.length]} — Series ${expanded.length}`);
  }
  const products: ProfileProduct[] = expanded.slice(0, 8).map((name, i) => {
    const pr = makeRng(hashString(`${s.id}-product-${i}`));
    const lo = intBetween(pr, 8, 480);
    const hi = lo + intBetween(pr, 12, 600);
    return {
      id: `${base.id}-p-${i}`,
      name,
      category: pick(pr, productCats),
      gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
      priceRange: `$${lo.toLocaleString()} – $${hi.toLocaleString()}`,
      moq: i % 2 === 0 ? base.moq : `${intBetween(pr, 1, 500)} units`,
      leadTime: pick(pr, LEAD_TIMES),
      material: pick(pr, MATERIALS),
      certifications: certPool.slice(0, intBetween(pr, 1, 3)).map((c) => c.code),
      shipping: pick(pr, SHIPPING_TERMS),
      aiRecommended: pr() > 0.62,
      rating: Math.min(5, Math.round((4.2 + pr() * 0.8) * 10) / 10),
    };
  });

  /* --- Reviews --- */
  const reviewCount = intBetween(rng, 5, 8);
  const reviewTitles = [
    "Reliable partner for recurring orders",
    "Excellent quality and communication",
    "Fast turnaround, competitive pricing",
    "Consistent and professional",
    "Great export experience",
    "Solid supplier, would reorder",
    "Strong QC and documentation",
    "Smooth negotiation and delivery",
  ];
  const reviewBodies = [
    "Delivered on spec and on time. Documentation and certificates were complete, and their team responded within hours throughout the process.",
    "We've placed several bulk orders and quality has been consistent. Packaging held up well for international freight.",
    "Pricing was competitive versus three other quotes and the lead time was shorter than promised. Will source again.",
    "Responsive sales team, transparent on MOQ and Incoterms. Samples matched the production batch.",
    "Handled a custom spec without issues. QC photos were shared before dispatch which gave us confidence.",
    "Professional from RFQ to delivery. Minor delay on one shipment but they communicated proactively.",
  ];
  const reviews: Review[] = Array.from({ length: reviewCount }).map((_, i) => {
    const rr = makeRng(hashString(`${s.id}-review-${i}`));
    const country = pick(rr, REVIEW_COUNTRIES);
    const rating = Math.min(5, 4 + Math.round(rr())); // 4 or 5 mostly
    return {
      id: `${base.id}-r-${i}`,
      author: pick(rr, REVIEW_AUTHORS),
      company: pick(rr, REVIEW_COMPANIES),
      country,
      flag: flagFor(country),
      rating: rr() > 0.85 ? 3 : rating,
      date: `${pick(rr, ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Sep", "Oct", "Nov"])} 202${intBetween(rr, 4, 6)}`,
      verifiedPurchase: rr() > 0.2,
      title: pick(rr, reviewTitles),
      body: pick(rr, reviewBodies),
      service: intBetween(rr, 4, 5),
      shipping: intBetween(rr, 4, 5),
      quality: intBetween(rr, 4, 5),
      helpful: intBetween(rr, 0, 34),
    };
  });

  const avg = (fn: (r: Review) => number) =>
    Math.round((reviews.reduce((a, r) => a + fn(r), 0) / reviews.length) * 10) / 10;
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    return { stars, count, pct: Math.round((count / reviews.length) * 100) };
  });

  const reviewSummary: ReviewSummary = {
    average: base.rating,
    total: base.reviewCount,
    distribution,
    avgService: avg((r) => r.service),
    avgShipping: avg((r) => r.shipping),
    avgQuality: avg((r) => r.quality),
    aiSummary: `Across ${base.reviewCount.toLocaleString()} verified buyer reviews, ${base.name} is consistently rated for ${
      trust.qualityConsistency >= 95 ? "outstanding" : "strong"
    } product quality and responsive communication. Buyers most frequently highlight on-time delivery (${onTimeDelivery}%) and reliable documentation, with a ${repeatBuyerRate}% reorder rate signalling durable supplier relationships.`,
  };

  /* --- AI insights --- */
  const pricingCompetitiveness = intBetween(rng, 68, 94);
  const deliveryReliabilityPrediction = deliveryReliability;
  const bestMarkets = company.exportMarkets.slice(0, 3);
  const overallConfidence = aiConfidence;

  const ai: AiInsights = {
    analysis: `${base.name} ranks in the top tier of ${base.categoryLabel.toLowerCase()} suppliers in ${
      base.country
    } based on Suplymate's composite trust model. With a ${trustScore}/100 trust score, ${base.rating.toFixed(
      1
    )}★ rating across ${base.reviewCount.toLocaleString()} reviews, and ${onTimeDelivery}% on-time delivery, the supplier presents ${
      trust.riskLevel === "Low" ? "low" : trust.riskLevel.toLowerCase()
    } sourcing risk for recurring B2B procurement.`,
    sourcingRecommendations: [
      `Best fit for buyers needing ${base.products[0]?.name ?? "core products"} with ${company.moq}+ volumes.`,
      `Negotiate tiered pricing above ${intBetween(rng, 2, 5)}x MOQ to unlock an estimated ${intBetween(
        rng,
        4,
        12
      )}% discount.`,
      `Request a paid sample (refundable against first order) to validate spec before bulk commitment.`,
    ],
    negotiationInsights: [
      `Pricing is ${pricingCompetitiveness}% competitive vs. regional peers — room to anchor on volume.`,
      `Response time of ${base.responseTime} suggests fast quote cycles; push for a 24h RFQ SLA.`,
      `Trade ${intBetween(rng, 20, 40)}% deposit for improved Incoterms (FOB → CIF) to offset freight.`,
    ],
    riskAnalysis: `Risk level: ${trust.riskLevel}. Financial and operational signals (verification status, ${
      base.reviewCount
    } reviews, ${company.yearsInBusiness} years in business) indicate ${
      trust.riskLevel === "Low" ? "a stable, well-established" : "a developing"
    } supplier. Recommended safeguards: milestone payments and pre-shipment QC inspection.`,
    pricingCompetitiveness,
    bestMarkets,
    deliveryReliabilityPrediction,
    overallConfidence,
    priceTrend: trend(rng, 10, 100, 8),
    demandTrend: trend(rng, 10, 60, 14),
    cards: [
      {
        id: "pricing",
        title: "Pricing competitiveness",
        body: `Quotes trend ${pricingCompetitiveness >= 80 ? "below" : "near"} the category median for comparable specs.`,
        confidence: intBetween(rng, 78, 95),
        trend: trend(rng, 7, 50, 10),
        tone: pricingCompetitiveness >= 80 ? "positive" : "neutral",
      },
      {
        id: "delivery",
        title: "Delivery reliability forecast",
        body: `Predicted ${deliveryReliabilityPrediction}% on-time performance for the next 2 quarters.`,
        confidence: intBetween(rng, 80, 96),
        trend: trust.trends.onTime,
        tone: deliveryReliabilityPrediction >= 92 ? "positive" : "neutral",
      },
      {
        id: "quality",
        title: "Quality consistency",
        body: `Defect-rate signals remain ${trust.qualityConsistency >= 95 ? "very low" : "low"} across recent batches.`,
        confidence: intBetween(rng, 82, 97),
        trend: trust.trends.quality,
        tone: "positive",
      },
      {
        id: "risk",
        title: "Sourcing risk",
        body: `${trust.riskLevel} risk profile. ${
          trust.riskLevel === "Low" ? "Suitable for strategic, recurring contracts." : "Use milestone payments."
        }`,
        confidence: aiConfidence,
        trend: trend(rng, 7, 40, 8),
        tone: trust.riskLevel === "Low" ? "positive" : "watch",
      },
    ],
  };

  const companySummary = `${base.name} is a ${company.businessType.toLowerCase()} based in ${
    base.city
  }, ${base.country}, serving B2B buyers across ${company.exportMarkets.slice(0, 3).join(", ")}. With ${
    company.yearsInBusiness
  } years in business, a ${company.factorySize} facility and ${company.employeeCount} staff, they specialize in ${base.products
    .map((p) => p.name)
    .slice(0, 2)
    .join(" and ")
    .toLowerCase()} with export-ready logistics and competitive MOQs from ${company.moq}.`;

  const metaDescription = `${base.name} — verified ${base.categoryLabel} supplier in ${base.city}, ${base.country}. Trust score ${trustScore}/100, ${base.rating.toFixed(
    1
  )}★ (${base.reviewCount.toLocaleString()} reviews), ${onTimeDelivery}% on-time delivery. Contact, RFQ, pricing & certifications on Suplymate.`;

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
  };
}
