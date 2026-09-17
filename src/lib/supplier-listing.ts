import type { Supplier, SupplierCategory, Industry } from "@/data/suppliers";

/** Fields the directory card + client-side filters actually need. */
export type ListingSupplier = {
  id: string;
  name: string;
  industry: Industry;
  category?: SupplierCategory;
  location: string;
  country?: string;
  city?: string;
  products: string[];
  featuredProducts?: { id: string; name: string; image?: string }[];
  moq: string;
  reliabilityScore: number;
  score?: number;
  logoUrl?: string;
  imageUrl?: string;
  supplierImages?: string[];
  verified?: boolean;
  businessType?: string;
  yearsInBusiness?: number;
  employees?: string;
  googleRating?: number;
  googleReviews?: number;
  rating?: number;
  reviewCount?: number;
  /** Lowercased description tokens not already present on the card fields. */
  searchExtra?: string;
};

function fieldHaystack(s: Pick<ListingSupplier, "name" | "industry" | "location" | "products" | "featuredProducts"> & {
  category?: string;
  country?: string;
  city?: string;
}): string {
  return [
    s.name,
    s.category,
    s.industry,
    s.location,
    s.country,
    s.city,
    ...(s.products ?? []),
    ...(s.featuredProducts ?? []).map((p) => p.name),
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .toLowerCase();
}

function extraSearchText(s: Supplier, already: string): string {
  const seen = new Set(already.split(/\s+/).filter(Boolean));
  const extra = (s.description ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length > 3 && !seen.has(w));
  return [...new Set(extra)].join(" ");
}

/**
 * Drop profile-only weight (long descriptions, cert scans, galleries, contact)
 * before the suppliers page serializes the directory into the RSC payload.
 * Search still matches name, category, location, products and description. Catalogue ids are unchanged.
 */
export function toListingSupplier(s: Supplier): ListingSupplier {
  const featuredProducts = (s.featuredProducts ?? []).slice(0, 3);
  const products = (s.products ?? []).slice(0, Math.max(0, 3 - featuredProducts.length));
  const listing: ListingSupplier = {
    id: s.id,
    name: s.name,
    industry: s.industry,
    category: s.category,
    location: s.location,
    country: s.country,
    city: s.city,
    products,
    featuredProducts: featuredProducts.length ? featuredProducts : undefined,
    moq: s.moq,
    reliabilityScore: s.reliabilityScore,
    score: s.score,
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    verified: s.verified,
    businessType: s.businessType,
    yearsInBusiness: s.yearsInBusiness,
    employees: s.employees,
    googleRating: s.googleRating,
    googleReviews: s.googleReviews,
    rating: s.rating,
    reviewCount: s.reviewCount,
  };
  // Banner already has imageUrl; don't ship a second gallery URL for every mill.
  if (!listing.imageUrl) {
    const images = (s.supplierImages ?? []).filter(Boolean).slice(0, 1);
    if (images.length) listing.supplierImages = images;
  }
  const extra = extraSearchText(s, fieldHaystack(listing));
  if (extra) listing.searchExtra = extra;
  return listing;
}

export function listingSupplierMatches(s: ListingSupplier, query: string): boolean {
  const needle = query.toLowerCase().trim();
  if (!needle) return true;
  const hay = `${fieldHaystack(s)} ${s.searchExtra ?? ""}`;
  if (hay.includes(needle)) return true;
  const compact = needle.replace(/[^a-z0-9]+/g, " ").trim();
  return compact.length > 0 && hay.includes(compact);
}
