// Supplier "profile completeness" score.
//
// Distinct from the two existing scores:
//   - `supplier-ranking.ts`  → scores PUBLIC Google-Maps listings by rating/reviews.
//   - `trust-score.ts`       → scores DATA COMPLETENESS for the admin review queue.
//
// This score answers a product question: "does this supplier FEEL complete to a
// buyer browsing the catalogue?" It powers the /products priority tiers and the
// admin completeness warnings. It is intentionally weighted toward the visible
// signals a buyer cares about (verification, website, photos, real product
// photos) so image-rich, verified suppliers surface first.
//
// Weights (sum to 140; not clamped — used as a sort key, higher = better):
//   verified            +30
//   website exists      +20
//   logo                +10
//   supplier photos     +15
//   products listed     +15
//   real product photos +20
//   description         +10
//   reviews / rating    +10
//   certifications      +10

import { isRealImageUrl } from "@/lib/image-fallback";

export type SupplierCompletenessInput = {
  verified?: boolean | null;
  website?: string | null;
  logoUrl?: string | null;
  /** Banner / hero photo. */
  imageUrl?: string | null;
  /** Supplier / factory gallery photos (Google Maps, website media, …). */
  images?: (string | null | undefined)[] | null;
  /** Alias accepted from the public `Supplier` shape. */
  supplierImages?: (string | null | undefined)[] | null;
  /** Product names listed for the supplier. */
  products?: (string | null | undefined)[] | null;
  /** Real product photo URLs linked to this supplier (catalogue products). */
  productImages?: (string | null | undefined)[] | null;
  description?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  /** Certifications (names or detail objects) — length is all that matters. */
  certifications?: unknown[] | null;
  certificationImages?: (string | null | undefined)[] | null;
};

export type CompletenessSignal = {
  key: string;
  label: string;
  points: number;
  earned: boolean;
};

export type SupplierCompleteness = {
  /** Raw weighted score (0–140). Higher is better. */
  score: number;
  /** Same score expressed on a 0–100 scale for display. */
  scorePct: number;
  signals: CompletenessSignal[];
  /** Human-readable labels of the high-value signals that are missing. */
  missing: string[];
};

function nonEmpty(v?: string | null): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function anyReal(arr?: (string | null | undefined)[] | null): boolean {
  return Boolean(arr && arr.some((u) => isRealImageUrl(u)));
}

/**
 * Compute the completeness score + a per-signal breakdown. Pure and resilient:
 * never throws on missing/garbage data, safe to call on the client.
 */
export function calculateSupplierCompleteness(
  input: SupplierCompletenessInput
): SupplierCompleteness {
  const galleryPhotos = [
    input.imageUrl,
    ...(input.images ?? []),
    ...(input.supplierImages ?? []),
  ];

  const hasVerified = Boolean(input.verified);
  const hasWebsite = nonEmpty(input.website);
  const hasLogo = nonEmpty(input.logoUrl);
  const hasSupplierPhotos = anyReal(galleryPhotos);
  const hasProducts = Boolean(input.products && input.products.filter(nonEmpty).length > 0);
  const hasRealProductPhotos = anyReal(input.productImages);
  const hasDescription = nonEmpty(input.description) && (input.description as string).trim().length >= 24;
  const hasReviews =
    (input.reviewCount ?? 0) > 0 || (input.rating ?? 0) > 0;
  const hasCerts =
    Boolean(input.certifications && input.certifications.length > 0) ||
    anyReal(input.certificationImages);

  const signals: CompletenessSignal[] = [
    { key: "verified", label: "Verified", points: 30, earned: hasVerified },
    { key: "website", label: "Website", points: 20, earned: hasWebsite },
    { key: "logo", label: "Logo", points: 10, earned: hasLogo },
    { key: "supplierPhotos", label: "Supplier photos", points: 15, earned: hasSupplierPhotos },
    { key: "products", label: "Products listed", points: 15, earned: hasProducts },
    { key: "productPhotos", label: "Real product photos", points: 20, earned: hasRealProductPhotos },
    { key: "description", label: "Description", points: 10, earned: hasDescription },
    { key: "reviews", label: "Reviews / rating", points: 10, earned: hasReviews },
    { key: "certifications", label: "Certifications", points: 10, earned: hasCerts },
  ];

  const score = signals.reduce((sum, s) => sum + (s.earned ? s.points : 0), 0);
  const maxScore = signals.reduce((sum, s) => sum + s.points, 0);
  const scorePct = Math.round((score / maxScore) * 100);
  const missing = signals.filter((s) => !s.earned).map((s) => s.label);

  return { score, scorePct, signals, missing };
}

/** Convenience: just the raw numeric score (used as a sort key). */
export function calculateSupplierCompletenessScore(
  input: SupplierCompletenessInput
): number {
  return calculateSupplierCompleteness(input).score;
}

export type MediaQuality = "high" | "medium" | "low";

/**
 * Coarse media-quality bucket for a supplier, used to flag profiles for admin
 * follow-up and to group website-less suppliers lower in listings.
 */
export function mediaQualityFor(input: SupplierCompletenessInput): MediaQuality {
  const galleryPhotos = [
    input.imageUrl,
    ...(input.images ?? []),
    ...(input.supplierImages ?? []),
  ].filter((u) => isRealImageUrl(u));
  const count = galleryPhotos.length + (anyReal(input.productImages) ? 2 : 0);
  if (count >= 3) return "high";
  if (count >= 1) return "medium";
  return "low";
}
