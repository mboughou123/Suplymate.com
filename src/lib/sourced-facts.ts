import type { Supplier } from "@/data/suppliers";
import { countSupplierCountries } from "@/lib/home-benefits";
import { CATEGORY_QUERIES } from "@/lib/import/outscraper/queries";
import { computeTrustScore } from "@/lib/trust-score";

const TEMPLATE_MOQ = new Map<string, string>(
  CATEGORY_QUERIES.map((c) => [c.category, c.moq]),
);
const TEMPLATE_PRODUCTS = new Map<string, string>(
  CATEGORY_QUERIES.map((c) => [c.category, c.defaultProducts.join("|")]),
);

/**
 * Suplymate "verified" means the catalogue record was marked verified
 * (curated mill / admin). The Outscraper `verified` boolean is a Google or
 * rating-threshold flag and is not this status.
 */
export function isCatalogueVerified(s: {
  verificationStatus?: string | null;
}): boolean {
  return s.verificationStatus === "verified";
}

export function sourcedGoogleRating(s: {
  googleRating?: number | null;
}): number | null {
  return typeof s.googleRating === "number" && Number.isFinite(s.googleRating)
    ? s.googleRating
    : null;
}

export function sourcedGoogleReviews(s: {
  googleReviews?: number | null;
}): number | null {
  return typeof s.googleReviews === "number" && Number.isFinite(s.googleReviews)
    ? s.googleReviews
    : null;
}

/** Category-default MOQs and "not published" placeholders are not sourced order minimums. */
export function isTemplateMoq(
  moq: string | null | undefined,
  category?: string | null,
): boolean {
  if (!moq) return true;
  const trimmed = moq.trim();
  if (!trimmed) return true;
  if (/not published|contact for moq|contact supplier|do not invent/i.test(trimmed)) {
    return true;
  }
  if (category && TEMPLATE_MOQ.get(category) === trimmed) return true;
  return false;
}

export function publicMoq(
  moq: string | null | undefined,
  category?: string | null,
): string | null {
  if (!moq || isTemplateMoq(moq, category)) return null;
  return moq.trim();
}

/** True when the product list is the category template assigned at import, not a mill's own lines. */
export function isTemplateProductList(
  products: string[] | null | undefined,
  category?: string | null,
): boolean {
  if (!products?.length || !category) return false;
  return TEMPLATE_PRODUCTS.get(category) === products.join("|");
}

export function sourcedProductNames(
  s: Pick<Supplier, "products" | "category">,
): string[] {
  if (isTemplateProductList(s.products, s.category)) return [];
  return (s.products ?? []).map((p) => p.trim()).filter(Boolean);
}

/**
 * Suplymate score: completeness of public listing fields we actually hold.
 * Inputs are website, email, phone, address, photos, certification images,
 * description, source URL, and whether the email domain matches the site.
 * No delivery, review, or on-time inputs.
 */
export function suplymateProfileScore(
  s: Pick<
    Supplier,
    | "website"
    | "email"
    | "phone"
    | "address"
    | "description"
    | "sourceUrl"
    | "imageUrl"
    | "supplierImages"
    | "certificationImages"
    | "certificationsDetailed"
  >,
): number {
  const certImages = [
    ...(s.certificationImages ?? []),
    ...(s.certificationsDetailed ?? [])
      .map((c) => c.imageUrl)
      .filter((u): u is string => Boolean(u)),
  ];
  return computeTrustScore({
    website: s.website,
    email: s.email,
    phone: s.phone,
    address: s.address,
    description: s.description,
    sourceUrl: s.sourceUrl,
    productImages: [s.imageUrl, ...(s.supplierImages ?? [])].filter(
      (u): u is string => Boolean(u),
    ),
    certificationImages: certImages,
  }).score;
}

export function publicSupplierStats(suppliers: Supplier[]): {
  supplierCount: number;
  countryCount: number;
  verifiedCount: number;
} {
  return {
    supplierCount: suppliers.length,
    countryCount: countSupplierCountries(suppliers),
    verifiedCount: suppliers.filter(isCatalogueVerified).length,
  };
}
