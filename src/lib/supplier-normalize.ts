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
  moq: string | null;
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

export function isBareIsoCode(value: string | null | undefined): boolean {
  return Boolean(value && /^[A-Za-z]{2}$/.test(value.trim()));
}

function addressParts(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/\s+-\s+|,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Lowercase and strip diacritics so "Türkiye" and "turkiye" compare equal. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Endonyms that appear as the final address segment while the country column
 * holds the English exonym. Without these the country name survives filtering
 * and is mistaken for the city — the observed case was six Turkish suppliers
 * whose city read "Türkiye".
 *
 * Keys are folded exonyms; values are folded alternatives.
 */
const COUNTRY_ALIASES: Record<string, readonly string[]> = {
  turkey: ["turkiye"],
  germany: ["deutschland"],
  spain: ["espana"],
  italy: ["italia"],
  morocco: ["maroc"],
  japan: ["nippon", "nihon"],
  china: ["zhongguo"],
  mexico: ["mexico"],
};

function isCountryName(part: string, country: string | null): boolean {
  if (!country) return false;
  const folded = fold(part);
  const target = fold(country);
  if (folded === target) return true;
  return (COUNTRY_ALIASES[target] ?? []).includes(folded);
}

/**
 * Strip artefacts that sit alongside the city inside one address segment:
 * a leading postcode ("47228 Rheinhausen") and Google's district/province
 * pairing ("Çorlu/Tekirdağ"), where the province is the useful half.
 */
function cleanCityCandidate(part: string): string {
  const withoutPostcode = part.replace(/^\d{4,6}\s+/, "").trim();
  const afterSlash = withoutPostcode.split("/").at(-1)?.trim();
  return afterSlash || withoutPostcode;
}

/** A US state + ZIP tail ("TN 37604"), which is never a city. */
const US_STATE_ZIP = /^[A-Za-z]{2}\s+\d{5}(-\d{4})?$/;

export function extractSupplierCity(input: {
  city?: string | null;
  country?: string | null;
  address?: string | null;
  location?: string | null;
}): string | null {
  const direct = input.city?.trim();
  if (direct && !isBareIsoCode(direct)) return direct;

  const country = input.country?.trim() ?? null;
  const candidates = [
    ...addressParts(input.address),
    ...addressParts(input.location),
  ]
    .filter(
      (part) =>
        !isBareIsoCode(part) &&
        !isCountryName(part, country) &&
        !US_STATE_ZIP.test(part) &&
        // Plus codes ("78F5+FH") and bare numbers/coordinates.
        !/^[A-Z0-9]{4,}\+[A-Z0-9]{2,}$/i.test(part) &&
        !/^[\d.\s-]+$/.test(part)
    )
    .map(cleanCityCandidate)
    // Cleaning can empty a segment or reduce it to the country name.
    .filter((part) => part.length > 0 && !isCountryName(part, country));

  return candidates.at(-1) ?? null;
}

/**
 * Indefinite article for a category name ("an industrial parts supplier").
 *
 * A plain vowel test is sufficient because the categories are ordinary nouns
 * ("Industrial Parts", "Agriculture & Agrofood"); none hit the classic
 * pronunciation exceptions like "a university" or "an hour".
 */
function indefiniteArticle(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

function descriptionVariant(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 4;
}

export function generateSupplierDescription(
  input: Pick<
    SupplierInput,
    "name" | "industry" | "category" | "country" | "city" | "address" | "location"
  >,
  variant = descriptionVariant(input.name)
): string {
  const name = input.name.trim();
  const category =
    input.category?.trim() || input.industry?.trim() || "Uncategorized";
  const city = extractSupplierCity(input);
  const country = input.country?.trim() || null;
  const place = [city, country].filter(Boolean).join(", ") || "location not provided";

  const lowerCategory = category.toLowerCase();
  const templates = [
    `${name} is listed as ${indefiniteArticle(lowerCategory)} ${lowerCategory} supplier in ${place}.`,
    `Based in ${place}, ${name} is categorized under ${category}.`,
    `${name} appears in the ${category} directory for ${place}.`,
    `This public-source listing places ${name} in ${place} under ${category}.`,
  ];
  return templates[((variant % templates.length) + templates.length) % templates.length];
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
export function normalizeSupplierInput(
  input: SupplierInput,
  descriptionSequence?: number
): AdminSupplier {
  const name = (input.name ?? "").trim();
  const id = (input.id?.trim() || slugifySupplierId(name)) || `supplier-${Date.now()}`;
  const country = input.country?.trim() || null;
  const city = extractSupplierCity(input);
  const suppliedLocation = input.location?.trim() || null;
  const locationHasIsoCity =
    suppliedLocation !== null &&
    isBareIsoCode(suppliedLocation.split(",")[0]?.trim());
  const location =
    (!locationHasIsoCity ? suppliedLocation : null) ||
    [city, country].filter(Boolean).join(", ") ||
    country ||
    "Global";
  const images = dedupeStrings(input.images ?? []);
  const certificationImages = dedupeStrings(input.certificationImages ?? []);
  const certifications = (input.certifications ?? []).filter((c) => c && c.name);
  const status = normalizeStatus(input.verificationStatus);
  const suppliedDescription = input.description?.trim() || null;
  const description =
    suppliedDescription && !/^.+ supplier in .+\.$/i.test(suppliedDescription)
      ? suppliedDescription
      : generateSupplierDescription(
          { ...input, name, country, city, location },
          descriptionSequence
        );

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
    industry:
      input.industry?.trim() || input.category?.trim() || "Uncategorized",
    category: input.category?.trim() || null,
    location,
    country,
    city,
    address: input.address?.trim() || null,
    website: input.website?.trim() || null,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    description,
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
    // Was defaulted to "Contact for MOQ", which reads as a supplier
    // instruction. Null means we simply do not know.
    moq: input.moq?.trim() || null,
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
