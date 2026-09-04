// Supplier matching engine.
//
// Scores real Suplymate suppliers against a parsed requirement. Every component
// is derived only from data we actually hold — when a signal is missing the
// component is `null` ("no data") rather than an invented number, and the
// overall score is the weighted mean of the components we could compute.

import type { Supplier } from "@/data/suppliers";
import { industryForLegacyCategory } from "@/data/industries";
import type { ParsedRequirement } from "@/lib/ai/requirement-parser";

export type MatchComponent = "price" | "delivery" | "quality" | "location" | "trust";

export type MatchBreakdown = Record<MatchComponent, number | null>;

export type SupplierMatch = {
  supplier: {
    id: string;
    name: string;
    location: string;
    country: string | null;
    category: string | null;
    industry: string | null;
    logoUrl: string | null;
    imageUrl: string | null;
    verified: boolean;
    trustScore: number | null;
    rating: number | null;
    reviews: number | null;
    moq: string | null;
    products: string[];
    website: string | null;
  };
  relevance: number;
  overall: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  gaps: string[];
};

const WEIGHTS: Record<MatchComponent, number> = {
  price: 0.2,
  delivery: 0.2,
  quality: 0.2,
  location: 0.2,
  trust: 0.2,
};

const REGIONS: Record<string, string[]> = {
  europe: ["germany", "france", "italy", "spain", "netherlands", "belgium", "poland", "united kingdom", "uk", "turkey", "sweden", "austria", "czech", "portugal", "romania", "greece"],
  "north america": ["united states", "usa", "us", "canada", "mexico", "california", "texas", "new york", "san diego", "ohio", "michigan", "illinois", "florida"],
  "middle east": ["united arab emirates", "uae", "dubai", "saudi arabia", "qatar", "oman", "bahrain", "kuwait", "egypt", "jordan"],
  asia: ["china", "india", "vietnam", "japan", "korea", "south korea", "taiwan", "thailand", "indonesia", "malaysia", "singapore", "bangladesh", "pakistan"],
  africa: ["morocco", "south africa", "nigeria", "kenya", "algeria", "tunisia", "egypt", "ghana"],
  "south america": ["brazil", "argentina", "chile", "colombia", "peru"],
};

function regionOf(place: string): string | null {
  const p = place.toLowerCase();
  for (const [region, names] of Object.entries(REGIONS)) {
    if (p.includes(region) || names.some((n) => p.includes(n))) return region;
  }
  return null;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function isVerified(s: Supplier): boolean {
  return s.verified === true || s.verificationStatus === "verified";
}

function haystack(s: Supplier): string {
  return [
    s.name,
    s.category,
    s.industry,
    s.description,
    s.country,
    s.city,
    s.location,
    ...(s.products ?? []),
    ...(s.deliveryRegions ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function relevanceScore(s: Supplier, req: ParsedRequirement): { score: number; hits: string[] } {
  const hay = haystack(s);
  const hits: string[] = [];
  let score = 0;

  for (const m of req.materials) {
    const terms = [m.name.toLowerCase(), ...m.aliases];
    if (terms.some((t) => hay.includes(t))) {
      score += 40;
      hits.push(m.name);
    }
  }
  for (const ind of req.industries) {
    const legacy = industryForLegacyCategory(s.category ?? s.industry);
    if (legacy?.id === ind.id) {
      score += 30;
      hits.push(ind.name);
    } else if (ind.keywords.some((k) => hay.includes(k))) {
      score += 15;
      hits.push(ind.name);
    }
  }
  const kwHits = req.keywords.filter((k) => hay.includes(k));
  score += Math.min(30, kwHits.length * 8);
  hits.push(...kwHits.slice(0, 3));

  return { score: clamp(score), hits: Array.from(new Set(hits)) };
}

export function scoreSupplierMatch(s: Supplier, req: ParsedRequirement): SupplierMatch | null {
  const { score: relevance, hits } = relevanceScore(s, req);
  const specific = req.materials.length > 0 || req.industries.length > 0 || req.keywords.length > 0;
  if (specific && relevance === 0) return null;

  const reasons: string[] = [];
  const gaps: string[] = [];

  // Quality — public rating / reviews.
  let quality: number | null = null;
  const rating = s.googleRating ?? s.rating ?? null;
  const reviews = s.googleReviews ?? s.reviewCount ?? null;
  if (rating != null) {
    quality = clamp((rating / 5) * 100 - (reviews != null && reviews < 5 ? 10 : 0));
    reasons.push(`Rated ${rating.toFixed(1)}/5${reviews ? ` from ${reviews} public reviews` : ""}`);
  } else {
    gaps.push("No public rating yet");
  }

  // Trust — data completeness + verification.
  let trust: number | null = null;
  const base = s.trustScore ?? s.score ?? s.reliabilityScore ?? null;
  if (base != null) {
    trust = clamp(base + (isVerified(s) ? 10 : 0));
    reasons.push(isVerified(s) ? "Verified by Suplymate" : "Listed — not yet independently verified");
  } else {
    gaps.push("No trust data");
  }

  // Location — only when the buyer stated one.
  let location: number | null = null;
  if (req.location) {
    const want = req.location.toLowerCase();
    const where = [s.country, s.city, s.location].filter(Boolean).join(" ").toLowerCase();
    if (where && (where.includes(want) || want.includes(where))) {
      location = 98;
      reasons.push(`Based in ${s.city ? `${s.city}, ` : ""}${s.country ?? s.location}`);
    } else {
      const wr = regionOf(want);
      const sr = where ? regionOf(where) : null;
      const ships = (s.deliveryRegions ?? []).some((r) => {
        const rl = r.toLowerCase();
        return rl.includes(want) || (wr && rl.includes(wr)) || rl.includes("worldwide") || rl.includes("global");
      });
      if (ships) {
        location = 80;
        reasons.push(`Ships to ${req.location}`);
      } else if (wr && sr && wr === sr) {
        location = 65;
        reasons.push(`Same region (${wr})`);
      } else {
        location = 30;
        gaps.push(`Not located in or listed as shipping to ${req.location}`);
      }
    }
  }

  // Delivery — regions declared or lead time stated.
  let delivery: number | null = null;
  const regions = s.deliveryRegions ?? [];
  if (regions.length > 0) {
    const global = regions.some((r) => /world|global|international/i.test(r));
    delivery = global ? 85 : clamp(55 + regions.length * 8);
    reasons.push(`Delivers to ${regions.slice(0, 3).join(", ")}${regions.length > 3 ? "…" : ""}`);
  } else {
    gaps.push("Lead time not published — ask in an RFQ");
  }

  // Price — we never invent prices; only signal that pricing basis exists.
  let price: number | null = null;
  if (s.moq && s.moq.toLowerCase() !== "contact supplier") {
    price = 60;
    reasons.push(`MOQ ${s.moq}`);
  } else {
    gaps.push("No public pricing — request a quote");
  }

  const breakdown: MatchBreakdown = { price, delivery, quality, location, trust };
  let weight = 0;
  let sum = 0;
  for (const key of Object.keys(WEIGHTS) as MatchComponent[]) {
    const v = breakdown[key];
    if (v != null) {
      sum += v * WEIGHTS[key];
      weight += WEIGHTS[key];
    }
  }
  const componentScore = weight > 0 ? sum / weight : 50;
  // Relevance carries the most weight: a great supplier for the wrong material is not a match.
  const overall = clamp(specific ? relevance * 0.55 + componentScore * 0.45 : componentScore);

  if (hits.length) reasons.unshift(`Matches: ${hits.slice(0, 4).join(", ")}`);

  return {
    supplier: {
      id: s.id,
      name: s.name,
      location: s.location,
      country: s.country ?? null,
      category: s.category ?? null,
      industry: s.industry ?? null,
      logoUrl: s.logoUrl ?? null,
      imageUrl: s.imageUrl ?? null,
      verified: isVerified(s),
      trustScore: s.trustScore ?? s.score ?? null,
      rating,
      reviews,
      moq: s.moq ?? null,
      products: (s.products ?? []).slice(0, 6),
      website: s.website ?? null,
    },
    relevance,
    overall,
    breakdown,
    reasons: Array.from(new Set(reasons)).slice(0, 5),
    gaps: Array.from(new Set(gaps)).slice(0, 3),
  };
}

export function matchSuppliers(
  suppliers: Supplier[],
  req: ParsedRequirement,
  limit = 5,
): SupplierMatch[] {
  return suppliers
    .map((s) => scoreSupplierMatch(s, req))
    .filter((m): m is SupplierMatch => m !== null)
    .sort((a, b) => b.overall - a.overall || b.relevance - a.relevance)
    .slice(0, limit);
}
