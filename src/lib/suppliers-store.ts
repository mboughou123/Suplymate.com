// Persistence + lifecycle for imported/scraped suppliers.
//
// Mirrors the resilient pattern in `scraped-products-store.ts`: Prisma is the
// source of truth when the table is provisioned, with an in-memory overlay that
// keeps admin edits alive for the lifetime of the running server when the DB is
// unavailable (local dev / demo / DB lacking the new columns). Reads merge both;
// writes are best-effort to the DB and always recorded in the overlay.
//
// Verification workflow: imported/scraped suppliers default to "pending" and
// must be manually approved by an admin. Only "verified" suppliers are surfaced
// publicly (see data-service consumers).
//
// Pure types + normalization live in `supplier-normalize.ts` and are re-exported
// here so app code has a single import site.

import { prisma } from "@/lib/prisma";
import { computeTrustScore } from "@/lib/trust-score";
import {
  type AdminSupplier,
  type SupplierInput,
  type CertificationDetail,
  type VerificationStatus,
  VERIFICATION_STATUSES,
  parseJsonArray,
  dedupeStrings,
  normalizeStatus,
  normalizeSupplierInput,
  slugifySupplierId,
  normKey,
  websiteKey,
  phoneKey,
} from "@/lib/supplier-normalize";

export type {
  AdminSupplier,
  SupplierInput,
  CertificationDetail,
  VerificationStatus,
};
export { VERIFICATION_STATUSES, normalizeSupplierInput, slugifySupplierId };

/* ------------------------------------------------------------------ */
/* In-memory overlay                                                   */
/* ------------------------------------------------------------------ */

const overlay = new Map<string, AdminSupplier>();

/* ------------------------------------------------------------------ */
/* DB row mapping                                                      */
/* ------------------------------------------------------------------ */

type SupplierRow = Record<string, unknown>;

function mapRow(row: SupplierRow): AdminSupplier {
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v : null;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const date = (v: unknown): string =>
    v instanceof Date ? v.toISOString() : typeof v === "string" ? v : new Date().toISOString();

  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    industry: String(row.industry ?? "Industrial Equipment"),
    category: str(row.category),
    location: String(row.location ?? "Global"),
    country: str(row.country),
    city: str(row.city),
    address: str(row.address),
    website: str(row.website),
    phone: str(row.phone),
    email: str(row.email),
    description: str(row.description),
    logoUrl: str(row.logoUrl),
    imageUrl: str(row.imageUrl),
    images: parseJsonArray<string>(row.images, []),
    certificationImages: parseJsonArray<string>(row.certificationImages, []),
    certifications: parseJsonArray<CertificationDetail>(row.certifications, []),
    products: parseJsonArray<string>(row.products, []),
    deliveryRegions: parseJsonArray<string>(row.deliveryRegions, []),
    moq: String(row.moq ?? "Contact for MOQ"),
    verified: Boolean(row.verified),
    verificationStatus: normalizeStatus(row.verificationStatus),
    trustScore: num(row.trustScore),
    rating: num(row.googleRating),
    reviewCount: num(row.googleReviews),
    sourceUrl: str(row.sourceUrl),
    reliabilityScore: num(row.reliabilityScore) ?? 0,
    score: num(row.score),
    createdAt: date(row.createdAt ?? row.lastUpdated),
    updatedAt: date(row.updatedAt ?? row.lastUpdated),
  };
}

/** Map an AdminSupplier to the Prisma `Supplier` write payload. */
function toDbData(s: AdminSupplier) {
  return {
    name: s.name,
    industry: s.industry,
    category: s.category,
    location: s.location,
    country: s.country,
    city: s.city,
    address: s.address,
    website: s.website,
    phone: s.phone,
    email: s.email,
    description: s.description,
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    images: JSON.stringify(s.images),
    certificationImages: JSON.stringify(s.certificationImages),
    certifications: JSON.stringify(s.certifications),
    products: JSON.stringify(s.products),
    deliveryRegions: JSON.stringify(s.deliveryRegions),
    moq: s.moq,
    verified: s.verified,
    verificationStatus: s.verificationStatus,
    trustScore: s.trustScore,
    googleRating: s.rating,
    googleReviews: s.reviewCount,
    sourceUrl: s.sourceUrl,
    reliabilityScore: s.reliabilityScore,
    score: s.score,
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

/** List all suppliers (DB rows merged with any overlay-only records). */
export async function listAdminSuppliers(): Promise<AdminSupplier[]> {
  try {
    const rows = await prisma.supplier.findMany({
      orderBy: [{ createdAt: "desc" }],
    });
    const mapped = rows.map((r) => mapRow(r as SupplierRow));
    const byId = new Map(mapped.map((s) => [s.id, s]));
    for (const [id, s] of overlay) if (!byId.has(id)) byId.set(id, s);
    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [...overlay.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function getAdminSupplier(id: string): Promise<AdminSupplier | null> {
  const slug = (id ?? "").trim();
  if (!slug) return null;
  try {
    const row = await prisma.supplier.findUnique({ where: { id: slug } });
    if (row) return mapRow(row as SupplierRow);
  } catch {
    // ignore
  }
  return overlay.get(slug) ?? null;
}

/* ------------------------------------------------------------------ */
/* Duplicate detection                                                 */
/* ------------------------------------------------------------------ */

export type DuplicateMatch = {
  candidate: AdminSupplier;
  existingId: string;
  reason: "id" | "website" | "email" | "phone" | "name";
};

/**
 * Detect duplicates of `candidates` against the existing set (DB+overlay) AND
 * within the candidate batch itself. Matches by id, website host, email, phone
 * (digits only), and normalised name.
 */
export async function findDuplicates(
  candidates: AdminSupplier[]
): Promise<Map<string, DuplicateMatch>> {
  const existing = await listAdminSuppliers();
  const idIndex = new Map<string, string>();
  const siteIndex = new Map<string, string>();
  const emailIndex = new Map<string, string>();
  const phoneIndex = new Map<string, string>();
  const nameIndex = new Map<string, string>();

  const index = (s: AdminSupplier) => {
    idIndex.set(s.id, s.id);
    const site = websiteKey(s.website);
    if (site) siteIndex.set(site, s.id);
    const email = normKey(s.email);
    if (email) emailIndex.set(email, s.id);
    const phone = phoneKey(s.phone);
    if (phone) phoneIndex.set(phone, s.id);
    const name = normKey(s.name);
    if (name) nameIndex.set(name, s.id);
  };
  existing.forEach(index);

  const result = new Map<string, DuplicateMatch>();
  for (const c of candidates) {
    const site = websiteKey(c.website);
    const email = normKey(c.email);
    const phone = phoneKey(c.phone);
    const name = normKey(c.name);

    let match: DuplicateMatch | null = null;
    if (idIndex.has(c.id)) match = { candidate: c, existingId: idIndex.get(c.id)!, reason: "id" };
    else if (site && siteIndex.has(site)) match = { candidate: c, existingId: siteIndex.get(site)!, reason: "website" };
    else if (email && emailIndex.has(email)) match = { candidate: c, existingId: emailIndex.get(email)!, reason: "email" };
    else if (phone && phoneIndex.has(phone)) match = { candidate: c, existingId: phoneIndex.get(phone)!, reason: "phone" };
    else if (name && nameIndex.has(name)) match = { candidate: c, existingId: nameIndex.get(name)!, reason: "name" };

    if (match) result.set(c.id, match);
    index(c); // so later candidates dedupe against this one too
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

async function persist(s: AdminSupplier): Promise<void> {
  overlay.set(s.id, s);
  try {
    const data = toDbData(s);
    await prisma.supplier.upsert({
      where: { id: s.id },
      create: { id: s.id, ...data },
      update: data,
    });
  } catch (err) {
    // DB unavailable / column missing — overlay holds the record this session.
    // Log the failure (id + message only, never connection/secret details) so
    // the issue is visible in server logs while staying resilient.
    console.warn(
      `[suppliers-store] DB write failed for "${s.id}"; using in-memory overlay. ` +
        `Reason: ${(err as Error).message}`
    );
  }
}

export type SaveResult = {
  saved: AdminSupplier[];
  skippedDuplicates: DuplicateMatch[];
};

/**
 * Save a batch of suppliers as PENDING (unless they specify another status),
 * skipping duplicates by default. Returns saved records and skipped duplicates.
 */
export async function saveSuppliers(
  inputs: SupplierInput[],
  opts: { skipDuplicates?: boolean } = {}
): Promise<SaveResult> {
  const skipDuplicates = opts.skipDuplicates ?? true;
  const normalized = inputs.map(normalizeSupplierInput).filter((s) => s.name);
  const dupes = await findDuplicates(normalized);

  const saved: AdminSupplier[] = [];
  const skippedDuplicates: DuplicateMatch[] = [];
  for (const s of normalized) {
    const dup = dupes.get(s.id);
    if (dup && skipDuplicates) {
      skippedDuplicates.push(dup);
      continue;
    }
    await persist(s);
    saved.push(s);
  }
  return { saved, skippedDuplicates };
}

export type SupplierPatch = Partial<
  Pick<
    AdminSupplier,
    | "name"
    | "industry"
    | "category"
    | "location"
    | "country"
    | "city"
    | "address"
    | "website"
    | "phone"
    | "email"
    | "description"
    | "logoUrl"
    | "imageUrl"
    | "images"
    | "certificationImages"
    | "certifications"
    | "products"
    | "deliveryRegions"
    | "moq"
    | "rating"
    | "reviewCount"
    | "sourceUrl"
    | "verificationStatus"
  >
>;

export async function updateSupplier(
  id: string,
  patch: SupplierPatch
): Promise<AdminSupplier | null> {
  const current = await getAdminSupplier(id);
  if (!current) return null;

  const merged: AdminSupplier = {
    ...current,
    ...patch,
    images: patch.images ? dedupeStrings(patch.images) : current.images,
    certificationImages: patch.certificationImages
      ? dedupeStrings(patch.certificationImages)
      : current.certificationImages,
    products: patch.products ? dedupeStrings(patch.products) : current.products,
    id,
  };

  if (patch.verificationStatus) {
    merged.verificationStatus = patch.verificationStatus;
    merged.verified = patch.verificationStatus === "verified";
  }

  // Recompute trust score whenever a contributing field could have changed.
  const trust = computeTrustScore({
    website: merged.website,
    email: merged.email,
    phone: merged.phone,
    address: merged.address,
    description: merged.description,
    sourceUrl: merged.sourceUrl,
    productImages: merged.images,
    certificationImages: merged.certificationImages,
  });
  merged.trustScore = trust.score;
  merged.score = trust.score;
  merged.updatedAt = new Date().toISOString();

  await persist(merged);
  return merged;
}

export async function setVerification(
  id: string,
  status: VerificationStatus
): Promise<AdminSupplier | null> {
  return updateSupplier(id, { verificationStatus: status });
}

export async function addCertificationImages(
  id: string,
  urls: string[]
): Promise<AdminSupplier | null> {
  const current = await getAdminSupplier(id);
  if (!current) return null;
  return updateSupplier(id, {
    certificationImages: dedupeStrings([...current.certificationImages, ...urls]),
  });
}

export async function addProductImages(
  id: string,
  urls: string[]
): Promise<AdminSupplier | null> {
  const current = await getAdminSupplier(id);
  if (!current) return null;
  return updateSupplier(id, {
    images: dedupeStrings([...current.images, ...urls]),
  });
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const slug = (id ?? "").trim();
  if (!slug) return false;
  const had = overlay.delete(slug);
  let dbDeleted = false;
  try {
    await prisma.supplier.delete({ where: { id: slug } });
    dbDeleted = true;
  } catch {
    // not in DB — overlay deletion (if any) is enough
  }
  return had || dbDeleted;
}
