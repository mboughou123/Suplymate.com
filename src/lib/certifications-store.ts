// CRUD for relational supplier certifications (the richer, queryable model).
//
// Honest verification: a certification is NEVER "verified" just because an image
// exists. Status is admin-controlled and defaults to "claimed". Public surfaces
// show "Certification displayed by the supplier. Verification status: [status]."
// and only render the Suplymate verified badge when status === "verified".
//
// Resilient like the other stores: Prisma is the source of truth; an in-memory
// overlay keeps edits alive when the table/columns aren't provisioned.

import { prisma } from "@/lib/prisma";

export const CERT_STATUSES = [
  "claimed",
  "pending",
  "reviewed",
  "verified",
  "expired",
  "rejected",
] as const;
export type CertStatus = (typeof CERT_STATUSES)[number];

export function isCertStatus(v: unknown): v is CertStatus {
  return typeof v === "string" && (CERT_STATUSES as readonly string[]).includes(v);
}

export type Certification = {
  id: string;
  supplierId: string;
  name: string;
  type: string | null;
  imageUrl: string | null;
  certificateUrl: string | null;
  sourceUrl: string | null;
  issuingOrg: string | null;
  certificateNumber: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  verificationUrl: string | null;
  notes: string | null;
  status: CertStatus;
  createdAt: string;
  updatedAt: string;
};

export type CertificationInput = {
  supplierId: string;
  name: string;
  type?: string | null;
  imageUrl?: string | null;
  certificateUrl?: string | null;
  sourceUrl?: string | null;
  issuingOrg?: string | null;
  certificateNumber?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  verificationUrl?: string | null;
  notes?: string | null;
  status?: CertStatus;
};

export type CertificationPatch = Partial<Omit<CertificationInput, "supplierId">>;

const overlay = new Map<string, Certification>();

function cuid(): string {
  return `cert_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

type Row = Record<string, unknown>;
function mapRow(row: Row): Certification {
  const s = (v: unknown): string | null => (typeof v === "string" && v.length ? v : null);
  const d = (v: unknown): string | null =>
    v instanceof Date ? v.toISOString() : typeof v === "string" && v ? v : null;
  const dt = (v: unknown): string =>
    v instanceof Date ? v.toISOString() : typeof v === "string" ? v : new Date().toISOString();
  return {
    id: String(row.id),
    supplierId: String(row.supplierId ?? ""),
    name: String(row.name ?? ""),
    type: s(row.type),
    imageUrl: s(row.imageUrl),
    certificateUrl: s(row.certificateUrl),
    sourceUrl: s(row.sourceUrl),
    issuingOrg: s(row.issuingOrg),
    certificateNumber: s(row.certificateNumber),
    issueDate: d(row.issueDate),
    expirationDate: d(row.expirationDate),
    verificationUrl: s(row.verificationUrl),
    notes: s(row.notes),
    status: isCertStatus(row.status) ? row.status : "claimed",
    createdAt: dt(row.createdAt),
    updatedAt: dt(row.updatedAt),
  };
}

function toDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function listCertifications(supplierId?: string): Promise<Certification[]> {
  try {
    const rows = await prisma.certification.findMany({
      where: supplierId ? { supplierId } : undefined,
      orderBy: { createdAt: "desc" },
    });
    const mapped = rows.map((r) => mapRow(r as Row));
    const byId = new Map(mapped.map((c) => [c.id, c]));
    for (const [id, c] of overlay) {
      if ((!supplierId || c.supplierId === supplierId) && !byId.has(id)) byId.set(id, c);
    }
    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [...overlay.values()]
      .filter((c) => !supplierId || c.supplierId === supplierId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export async function getCertification(id: string): Promise<Certification | null> {
  try {
    const row = await prisma.certification.findUnique({ where: { id } });
    if (row) return mapRow(row as Row);
  } catch {
    // ignore
  }
  return overlay.get(id) ?? null;
}

export async function createCertification(input: CertificationInput): Promise<Certification> {
  const now = new Date().toISOString();
  const cert: Certification = {
    id: cuid(),
    supplierId: input.supplierId,
    name: input.name,
    type: input.type ?? null,
    imageUrl: input.imageUrl ?? null,
    certificateUrl: input.certificateUrl ?? null,
    sourceUrl: input.sourceUrl ?? null,
    issuingOrg: input.issuingOrg ?? null,
    certificateNumber: input.certificateNumber ?? null,
    issueDate: input.issueDate ?? null,
    expirationDate: input.expirationDate ?? null,
    verificationUrl: input.verificationUrl ?? null,
    notes: input.notes ?? null,
    status: input.status ?? "claimed",
    createdAt: now,
    updatedAt: now,
  };
  overlay.set(cert.id, cert);
  try {
    const row = await prisma.certification.create({
      data: {
        supplierId: cert.supplierId,
        name: cert.name,
        type: cert.type,
        imageUrl: cert.imageUrl,
        certificateUrl: cert.certificateUrl,
        sourceUrl: cert.sourceUrl,
        issuingOrg: cert.issuingOrg,
        certificateNumber: cert.certificateNumber,
        issueDate: toDate(cert.issueDate),
        expirationDate: toDate(cert.expirationDate),
        verificationUrl: cert.verificationUrl,
        notes: cert.notes,
        status: cert.status,
      },
    });
    const mapped = mapRow(row as Row);
    overlay.delete(cert.id);
    overlay.set(mapped.id, mapped);
    return mapped;
  } catch {
    return cert;
  }
}

export async function updateCertification(
  id: string,
  patch: CertificationPatch
): Promise<Certification | null> {
  const current = await getCertification(id);
  if (!current) return null;
  const merged: Certification = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
  overlay.set(id, merged);
  try {
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(patch) as (keyof CertificationPatch)[]) {
      if (key === "issueDate" || key === "expirationDate") {
        data[key] = toDate(patch[key] as string | null);
      } else {
        data[key] = patch[key];
      }
    }
    if (Object.keys(data).length) await prisma.certification.update({ where: { id }, data });
  } catch {
    // overlay
  }
  return merged;
}

export async function deleteCertification(id: string): Promise<boolean> {
  const had = overlay.delete(id);
  try {
    await prisma.certification.delete({ where: { id } });
    return true;
  } catch {
    return had;
  }
}
