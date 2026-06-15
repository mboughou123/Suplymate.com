// Cleans + normalizes raw Outscraper places into supplier records, deduplicates,
// applies the quality gate, and computes the Suplymate score.

import { scoreSupplier, rejectionReason } from "../../src/lib/supplier-ranking";
import { CATEGORY_QUERIES } from "./queries";

export type SupplierRecord = {
  id: string;
  name: string;
  industry: string;
  category: string;
  location: string;
  country: string | null;
  city: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  googleRating: number | null;
  googleReviews: number | null;
  description: string | null;
  products: string[];
  deliveryRegions: string[];
  moq: string;
  verified: boolean;
  address: string | null;
  openingHours: string | null;
  sourceUrl: string | null;
  reliabilityScore: number;
  score: number;
};

type RawPlace = Record<string, unknown>;
type CacheEntry = { category: string; query: string; places: RawPlace[] };

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.]/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function regionFor(country: string | null): string[] {
  const c = (country ?? "").toLowerCase();
  if (/(usa|united states|mexico|canada)/.test(c)) return ["North America", "EU"];
  if (/(china|india|vietnam|korea|japan)/.test(c)) return ["Asia", "EU", "Africa"];
  if (/(uae|emirates|saudi|qatar)/.test(c)) return ["MENA", "Asia"];
  if (/(morocco|egypt|tunisia)/.test(c)) return ["North Africa", "EU"];
  return ["EU", "MENA"];
}

function specFor(category: string) {
  return CATEGORY_QUERIES.find((c) => c.category === category);
}

function openingHours(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.slice(0, 200);
  if (typeof v === "object") {
    try {
      const obj = v as Record<string, string>;
      const days = Object.entries(obj)
        .map(([d, h]) => `${d}: ${h}`)
        .slice(0, 7)
        .join(" · ");
      return days.slice(0, 200) || null;
    } catch {
      return null;
    }
  }
  return null;
}

function toRecord(place: RawPlace, category: string): SupplierRecord | null {
  const spec = specFor(category);
  const name = str(place.name);
  if (!name) return null;

  const country = str(place.country);
  const city = str(place.city) ?? str(place.borough);
  const website = str(place.site) ?? str(place.website);
  const rating = num(place.rating);
  const reviews = num(place.reviews) ?? num(place.reviews_count);
  const fullAddress = str(place.full_address) ?? str(place.address);
  const location = [city, country].filter(Boolean).join(", ") || (fullAddress ?? "—");

  const record: SupplierRecord = {
    id: slugify(`${name}-${city ?? country ?? ""}`),
    name,
    industry: spec?.industry ?? "Industrial Equipment",
    category,
    location,
    country,
    city,
    website,
    phone: str(place.phone) ?? str(place.phone_1),
    email: str(place.email_1) ?? str(place.email),
    googleRating: rating,
    googleReviews: reviews,
    description:
      str(place.description) ??
      str(place.about) ??
      (spec ? `${category} supplier in ${location}.` : null),
    products: spec?.defaultProducts ?? [],
    deliveryRegions: regionFor(country),
    moq: spec?.moq ?? "Contact for MOQ",
    verified: Boolean(place.verified) || (rating !== null && rating >= 4.5 && (reviews ?? 0) >= 100),
    address: fullAddress,
    openingHours: openingHours(place.working_hours ?? place.working_hours_old_format),
    sourceUrl:
      str(place.location_link) ??
      str(place.place_id_link) ??
      (str(place.place_id)
        ? `https://www.google.com/maps/place/?q=place_id:${str(place.place_id)}`
        : null),
    reliabilityScore: rating ? Math.round((rating / 5) * 100) : 70,
    score: 0,
  };

  record.score = scoreSupplier(record);
  return record;
}

export function normalizeCache(entries: CacheEntry[]): {
  records: SupplierRecord[];
  stats: { found: number; rejected: number; deduped: number };
} {
  const seen = new Map<string, SupplierRecord>();
  let found = 0;
  let rejected = 0;
  let deduped = 0;

  for (const entry of entries) {
    for (const place of entry.places) {
      found++;
      const record = toRecord(place, entry.category);
      if (!record) {
        rejected++;
        continue;
      }
      const reason = rejectionReason(record);
      if (reason) {
        rejected++;
        continue;
      }
      const existing = seen.get(record.id);
      if (existing) {
        deduped++;
        // Keep the higher-scoring duplicate.
        if (record.score > existing.score) seen.set(record.id, record);
        continue;
      }
      seen.set(record.id, record);
    }
  }

  const records = Array.from(seen.values()).sort((a, b) => b.score - a.score);
  return { records, stats: { found, rejected, deduped } };
}
