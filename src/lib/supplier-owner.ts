// Supplier-owned company profiles.
//
// A supplier account manages exactly one Supplier row: the one whose
// `claimedByUserId` is the account. New profiles created from the supplier
// dashboard start as CLAIMED / pending — they are visible to the owner
// immediately but only appear in the public directory after admin review
// (never auto-verified).

import { prisma } from "@/lib/prisma";
import { trustScore } from "@/lib/trust-score";
import { slugifySupplierId } from "@/lib/supplier-normalize";
import { INDUSTRIES, getIndustry, type IndustryId } from "@/data/industries";

export type OwnedSupplierProfile = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  imageUrl: string;
  images: string[];
  website: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  country: string;
  city: string;
  industriesServed: IndustryId[];
  materials: string[];
  products: string[];
  deliveryRegions: string[];
  moq: string;
  pricingNotes: string;
  leadTime: string;
  yearsInBusiness: number | null;
  employees: string;
  certifications: { name: string; type?: string | null; certificateUrl?: string | null }[];
  marketplaceStatus: string;
  verificationStatus: string;
  verified: boolean;
  trustScore: number | null;
  updatedAt: string;
};

export type OwnedSupplierInput = Partial<
  Omit<
    OwnedSupplierProfile,
    "id" | "marketplaceStatus" | "verificationStatus" | "verified" | "trustScore" | "updatedAt"
  >
>;

function parseArray<T = string>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function cleanList(values: unknown, max = 40, maxLen = 80): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    const s = v.trim().slice(0, maxLen);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function httpUrl(v: unknown): string {
  const s = str(v, 500);
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

type Row = NonNullable<Awaited<ReturnType<typeof prisma.supplier.findFirst>>>;

export function toOwnedProfile(row: Row): OwnedSupplierProfile {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    logoUrl: row.logoUrl ?? "",
    imageUrl: row.imageUrl ?? "",
    images: parseArray(row.images),
    website: row.website ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    location: row.location,
    country: row.country ?? "",
    city: row.city ?? "",
    industriesServed: parseArray<string>(row.industriesServed).filter((id) =>
      Boolean(getIndustry(id)),
    ) as IndustryId[],
    materials: parseArray(row.materials),
    products: parseArray(row.products),
    deliveryRegions: parseArray(row.deliveryRegions),
    moq: row.moq,
    pricingNotes: row.pricingNotes ?? "",
    leadTime: row.leadTime ?? "",
    yearsInBusiness: row.yearsInBusiness ?? null,
    employees: row.employees ?? "",
    certifications: parseArray(row.certifications),
    marketplaceStatus: row.marketplaceStatus,
    verificationStatus: row.verificationStatus,
    verified: row.verified,
    trustScore: row.trustScore ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getOwnedSupplier(userId: string): Promise<OwnedSupplierProfile | null> {
  try {
    const row = await prisma.supplier.findFirst({
      where: { claimedByUserId: userId },
      orderBy: { updatedAt: "desc" },
    });
    return row ? toOwnedProfile(row) : null;
  } catch {
    return null;
  }
}

async function uniqueSupplierId(name: string): Promise<string> {
  const base = slugifySupplierId(name) || `supplier-${Date.now()}`;
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const exists = await prisma.supplier.findUnique({ where: { id: candidate }, select: { id: true } });
    if (!exists) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

export function sanitizeOwnedInput(body: Record<string, unknown>): OwnedSupplierInput {
  const industriesServed = cleanList(body.industriesServed, 7, 40).filter((id) =>
    INDUSTRIES.some((i) => i.id === id),
  ) as IndustryId[];
  const certifications = Array.isArray(body.certifications)
    ? (body.certifications as unknown[])
        .map((c) => {
          if (typeof c === "string") return { name: str(c, 80) };
          if (c && typeof c === "object") {
            const o = c as Record<string, unknown>;
            return {
              name: str(o.name, 80),
              type: str(o.type, 40) || null,
              certificateUrl: httpUrl(o.certificateUrl) || null,
            };
          }
          return { name: "" };
        })
        .filter((c) => c.name)
        .slice(0, 20)
    : undefined;

  const years = Number(body.yearsInBusiness);

  return {
    name: str(body.name, 120) || undefined,
    description: str(body.description, 2000),
    logoUrl: httpUrl(body.logoUrl),
    imageUrl: httpUrl(body.imageUrl),
    images: cleanList(body.images, 12, 500).map(httpUrl),
    website: httpUrl(body.website),
    email: str(body.email, 120),
    phone: str(body.phone, 40),
    address: str(body.address, 200),
    location: str(body.location, 120),
    country: str(body.country, 80),
    city: str(body.city, 80),
    industriesServed,
    materials: cleanList(body.materials, 40),
    products: cleanList(body.products, 60),
    deliveryRegions: cleanList(body.deliveryRegions, 20),
    moq: str(body.moq, 120),
    pricingNotes: str(body.pricingNotes, 500),
    leadTime: str(body.leadTime, 80),
    yearsInBusiness: Number.isFinite(years) && years > 0 && years < 300 ? Math.round(years) : null,
    employees: str(body.employees, 40),
    certifications,
  };
}

/** Create the account's profile or update the one it already owns. */
export async function upsertOwnedSupplier(
  userId: string,
  input: OwnedSupplierInput,
): Promise<OwnedSupplierProfile> {
  const existing = await prisma.supplier.findFirst({
    where: { claimedByUserId: userId },
    orderBy: { updatedAt: "desc" },
  });

  const name = input.name ?? existing?.name ?? "";
  if (!name) throw new Error("Company name is required.");

  const primaryIndustry =
    (input.industriesServed?.[0] && getIndustry(input.industriesServed[0])?.name) ||
    existing?.industry ||
    "Industrial";
  const location =
    input.location ||
    [input.city, input.country].filter(Boolean).join(", ") ||
    existing?.location ||
    "Not specified";

  const score = trustScore({
    website: input.website ?? existing?.website,
    email: input.email ?? existing?.email,
    phone: input.phone ?? existing?.phone,
    address: input.address ?? existing?.address,
    description: input.description ?? existing?.description,
    sourceUrl: input.website ?? existing?.website,
    productImages: input.images ?? parseArray(existing?.images),
    certificationImages: [],
  });

  const data = {
    name,
    industry: primaryIndustry,
    category: existing?.category ?? null,
    location,
    country: input.country || existing?.country || null,
    city: input.city || existing?.city || null,
    website: input.website || existing?.website || null,
    phone: input.phone || existing?.phone || null,
    email: input.email || existing?.email || null,
    logoUrl: input.logoUrl || existing?.logoUrl || null,
    imageUrl: input.imageUrl || input.images?.[0] || existing?.imageUrl || null,
    images: JSON.stringify(input.images ?? parseArray(existing?.images)),
    description: input.description || existing?.description || null,
    address: input.address || existing?.address || null,
    products: JSON.stringify(input.products ?? parseArray(existing?.products)),
    deliveryRegions: JSON.stringify(input.deliveryRegions ?? parseArray(existing?.deliveryRegions)),
    moq: input.moq || existing?.moq || "Contact supplier",
    industriesServed: JSON.stringify(input.industriesServed ?? parseArray(existing?.industriesServed)),
    materials: JSON.stringify(input.materials ?? parseArray(existing?.materials)),
    pricingNotes: input.pricingNotes || existing?.pricingNotes || null,
    leadTime: input.leadTime || existing?.leadTime || null,
    yearsInBusiness: input.yearsInBusiness ?? existing?.yearsInBusiness ?? null,
    employees: input.employees || existing?.employees || null,
    certifications: JSON.stringify(input.certifications ?? parseArray(existing?.certifications)),
    trustScore: score,
    reliabilityScore: existing?.reliabilityScore ?? score,
    sourceUrl: existing?.sourceUrl ?? "supplier:portal",
  };

  if (existing) {
    const row = await prisma.supplier.update({ where: { id: existing.id }, data });
    return toOwnedProfile(row);
  }

  const id = await uniqueSupplierId(name);
  const row = await prisma.supplier.create({
    data: {
      id,
      ...data,
      verified: false,
      verificationStatus: "pending",
      marketplaceStatus: "CLAIMED",
      claimedByUserId: userId,
      claimedAt: new Date(),
    },
  });
  return toOwnedProfile(row);
}
