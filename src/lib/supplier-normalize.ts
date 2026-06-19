// Pure (DB-free) supplier types + normalization helpers.
//
// Kept separate from `suppliers-store.ts` so scripts can import it under tsx via
// a relative path WITHOUT pulling in Prisma (which the `@/` alias + DB client
// would otherwise drag into the module graph). `suppliers-store.ts` re-exports
// everything here, so app code can keep importing from a single place.

import { computeTrustScore } from "./trust-score";

export type VerificationStatus = "pending" | "verified" | "rejected" | "needs_info";

export const VERIFICATION_STATUSES: VerificationStatus[] = [
  "pending",
  "verified",
  "rejected",
  "needs_info",
];

export type CertificationDetail = {
  name: string;
  type?: string | null;
  imageUrl?: string | null;
  certificateUrl?: string | null;
  sourceUrl?: string | null;
};

export type AdminSupplier = {
  id: string;
  name: string;
  industry: string;
  category: string | null;
  location: string;
  country: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  logoUrl: string | null;
  /** Banner / hero image. */
  imageUrl: string | null;
  /** Company / factory gallery image URLs. */
  images: string[];
  /** Certification badge / certificate image URLs. */
  certificationImages: string[];
  /** Denormalised certification details. */
  certifications: CertificationDetail[];
  products: string[];
  deliveryRegions: string[];
  moq: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  trustScore: number | null;
  rating: number | null;
  reviewCount: number | null;
  sourceUrl: string | null;
  reliabilityScore: number;
  score: number | null;
  createdAt: string;
  updatedAt: string;
};

/** Fields accepted when creating/importing a supplier (the rest are derived). */
export type SupplierInput = {
  id?: string;
  name: string;
  industry?: string | null;
  category?: string | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  images?: string[];
  certificationImages?: string[];
  certifications?: CertificationDetail[];
  products?: string[];
  deliveryRegions?: string[];
  moq?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  sourceUrl?: string | null;
  verificationStatus?: VerificationStatus;
};

export function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string" || !value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function slugifySupplierId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function dedupeStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const v = (raw ?? "").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function regionFor(country: string | null): string[] {
  const c = (country ?? "").toLowerCase();
  if (/(usa|united states|mexico|canada)/.test(c)) return ["North America", "EU"];
  if (/(china|india|vietnam|korea|japan)/.test(c)) return ["Asia", "EU", "Africa"];
  if (/(uae|emirates|saudi|qatar)/.test(c)) return ["MENA", "Asia"];
  if (/(morocco|egypt|tunisia)/.test(c)) return ["North Africa", "EU"];
  return ["EU", "MENA", "Global"];
}

export function normalizeStatus(v: unknown): VerificationStatus {
  return VERIFICATION_STATUSES.includes(v as VerificationStatus)
    ? (v as VerificationStatus)
    : "pending";
}

/** Build a full AdminSupplier from partial input, computing derived fields. */
export function normalizeSupplierInput(input: SupplierInput): AdminSupplier {
  const name = (input.name ?? "").trim();
  const id = (input.id?.trim() || slugifySupplierId(name)) || `supplier-${Date.now()}`;
  const country = input.country?.trim() || null;
  const city = input.city?.trim() || null;
  const location =
    input.location?.trim() ||
    [city, country].filter(Boolean).join(", ") ||
    country ||
    "Global";
  const images = dedupeStrings(input.images ?? []);
  const certificationImages = dedupeStrings(input.certificationImages ?? []);
  const certifications = (input.certifications ?? []).filter((c) => c && c.name);
  const status = normalizeStatus(input.verificationStatus);

  const trust = computeTrustScore({
    website: input.website,
    email: input.email,
    phone: input.phone,
    address: input.address,
    description: input.description,
    sourceUrl: input.sourceUrl,
    productImages: images,
    certificationImages,
  });

  return {
    id,
    name,
    industry: input.industry?.trim() || "Industrial Equipment",
    category: input.category?.trim() || null,
    location,
    country,
    city,
    address: input.address?.trim() || null,
    website: input.website?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    description: input.description?.trim() || null,
    logoUrl: input.logoUrl?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    images,
    certificationImages,
    certifications,
    products: dedupeStrings(input.products ?? []),
    deliveryRegions:
      input.deliveryRegions && input.deliveryRegions.length
        ? dedupeStrings(input.deliveryRegions)
        : regionFor(country),
    moq: input.moq?.trim() || "Contact for MOQ",
    // Imported/scraped suppliers are never auto-verified.
    verified: status === "verified",
    verificationStatus: status,
    trustScore: trust.score,
    rating: input.rating ?? null,
    reviewCount: input.reviewCount ?? null,
    sourceUrl: input.sourceUrl?.trim() || null,
    reliabilityScore: trust.score,
    score: trust.score,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* ---- Duplicate-detection key helpers (pure) ---- */

export function normKey(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.trim().toLowerCase().replace(/\s+/g, " ") || null;
}

export function websiteKey(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    const url = v.includes("://") ? v : `https://${v}`;
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return normKey(v);
  }
}

export function phoneKey(v: string | null | undefined): string | null {
  if (!v) return null;
  const digits = v.replace(/[^\d]/g, "");
  return digits.length >= 7 ? digits : null;
}
