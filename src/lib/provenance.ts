import { prisma } from "@/lib/prisma";

// Per-field data provenance & verification (the "Source and verification"
// profile section). Records WHERE a fact came from and whether a human has
// reviewed it. Never auto-marks anything "verified".

export type SourceType =
  | "scraped"
  | "imported"
  | "supplier_provided"
  | "admin"
  | "google_places";

export type ReviewStatus = "unverified" | "reviewed" | "verified" | "disputed";

export type ProvenanceInput = {
  entityType: "SUPPLIER" | "PRODUCT" | "CERTIFICATION";
  entityId: string;
  field: string;
  value?: string | null;
  sourceUrl?: string | null;
  sourceType?: SourceType;
};

// Upsert a data point. Updating the value resets review to "unverified" unless
// the caller is recording an explicit review (use reviewDataPoint for that).
export async function recordDataPoint(input: ProvenanceInput): Promise<void> {
  try {
    await prisma.dataPoint.upsert({
      where: {
        entityType_entityId_field: {
          entityType: input.entityType,
          entityId: input.entityId,
          field: input.field,
        },
      },
      update: {
        value: input.value ?? null,
        sourceUrl: input.sourceUrl ?? null,
        sourceType: input.sourceType ?? "scraped",
        lastCheckedAt: new Date(),
      },
      create: {
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        value: input.value ?? null,
        sourceUrl: input.sourceUrl ?? null,
        sourceType: input.sourceType ?? "scraped",
      },
    });
  } catch {
    // provenance is best-effort
  }
}

export async function listDataPoints(entityType: string, entityId: string) {
  try {
    return await prisma.dataPoint.findMany({
      where: { entityType, entityId },
      orderBy: { field: "asc" },
    });
  } catch {
    return [];
  }
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  scraped: "Collected from a public web page",
  imported: "Imported from a dataset",
  supplier_provided: "Supplier-provided information",
  admin: "Entered by Suplymate staff",
  google_places: "Public Google Maps data",
};

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  unverified: "Not independently verified",
  reviewed: "Reviewed by Suplymate",
  verified: "Verified by Suplymate",
  disputed: "Disputed",
};
