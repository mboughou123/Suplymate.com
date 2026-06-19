// CSV → SupplierInput mapping + validation, shared by the import script and the
// admin upload API so both apply identical rules.
//
// Required: `name`. Recommended: at least one contact channel (website / email /
// phone) — rows without any are flagged but still importable (admin can fix).
// Invalid rows are returned as structured errors for a clean log / UI preview.

import { parseSupplierCsv, splitList, type CsvParseResult } from "./csv";
import type { SupplierInput, CertificationDetail } from "./supplier-normalize";

export type RowError = {
  line: number;
  field?: string;
  message: string;
  raw: Record<string, string>;
};

export type CsvImportResult = {
  headers: string[];
  recognized: string[];
  valid: SupplierInput[];
  errors: RowError[];
  /** Rows that parsed but lack any contact channel (importable with a warning). */
  warnings: { line: number; message: string }[];
};

function looksLikeUrl(v: string): boolean {
  return /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+/i.test(v);
}

function looksLikeEmail(v: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v);
}

function parseCertifications(value: string): CertificationDetail[] {
  // Accept JSON array, or a simple "|"-separated list of cert names.
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) {
        return arr
          .map((c): CertificationDetail | null => {
            if (typeof c === "string") return { name: c };
            if (c && typeof c === "object" && typeof c.name === "string") {
              return {
                name: c.name,
                type: c.type ?? null,
                imageUrl: c.imageUrl ?? null,
                certificateUrl: c.certificateUrl ?? null,
                sourceUrl: c.sourceUrl ?? null,
              };
            }
            return null;
          })
          .filter((c): c is CertificationDetail => !!c);
      }
    } catch {
      // fall through to list parsing
    }
  }
  return splitList(value).map((name) => ({ name }));
}

export function mapRowsToSupplierInputs(parsed: CsvParseResult): CsvImportResult {
  const valid: SupplierInput[] = [];
  const errors: RowError[] = [];
  const warnings: { line: number; message: string }[] = [];

  for (const row of parsed.rows) {
    const v = row.values;
    const name = (v.name ?? "").trim();

    if (!name) {
      errors.push({ line: row.line, field: "name", message: "Missing required field: name", raw: row.raw });
      continue;
    }
    if (name.length < 2) {
      errors.push({ line: row.line, field: "name", message: "Name is too short", raw: row.raw });
      continue;
    }

    if (v.website && !looksLikeUrl(v.website)) {
      errors.push({ line: row.line, field: "website", message: `Invalid website URL: "${v.website}"`, raw: row.raw });
      continue;
    }
    if (v.email && !looksLikeEmail(v.email)) {
      errors.push({ line: row.line, field: "email", message: `Invalid email: "${v.email}"`, raw: row.raw });
      continue;
    }

    const rating = v.rating ? Number(v.rating) : undefined;
    const reviewCount = v.reviewCount ? parseInt(v.reviewCount.replace(/[^\d]/g, ""), 10) : undefined;

    const input: SupplierInput = {
      name,
      industry: v.industry || null,
      category: v.category || null,
      location: v.location || null,
      country: v.country || null,
      city: v.city || null,
      address: v.address || null,
      website: v.website || null,
      phone: v.phone || null,
      email: v.email || null,
      description: v.description || null,
      logoUrl: v.logoUrl || null,
      imageUrl: v.imageUrl || null,
      images: v.images ? splitList(v.images) : [],
      certificationImages: v.certificationImages ? splitList(v.certificationImages) : [],
      certifications: v.certifications ? parseCertifications(v.certifications) : [],
      products: v.products ? splitList(v.products) : [],
      moq: v.moq || null,
      rating: rating !== undefined && Number.isFinite(rating) ? rating : null,
      reviewCount: reviewCount !== undefined && Number.isFinite(reviewCount) ? reviewCount : null,
      sourceUrl: v.sourceUrl || v.website || null,
      // Imported rows are always pending review.
      verificationStatus: "pending",
    };

    if (!input.website && !input.email && !input.phone) {
      warnings.push({ line: row.line, message: `Row ${row.line} (${name}) has no website/email/phone` });
    }

    valid.push(input);
  }

  return {
    headers: parsed.headers,
    recognized: parsed.recognized,
    valid,
    errors,
    warnings,
  };
}

/** Convenience: parse raw CSV text straight to a validated import result. */
export function importSuppliersFromCsv(text: string): CsvImportResult {
  return mapRowsToSupplierInputs(parseSupplierCsv(text));
}
