// Shared supplier scoring used by the import pipeline AND the website, so the
// score shown to buyers is identical to the one computed at ingest time.
//
//   score = ratingScore + reviewScore + verifiedBonus + websiteBonus
//           + categoryMatchBonus + completenessBonus + countryRelevance
//
// Result is clamped to 0–100.

export type RankableSupplier = {
  name?: string | null;
  category?: string | null;
  country?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  address?: string | null;
  verified?: boolean | null;
  googleRating?: number | null;
  googleReviews?: number | null;
  products?: string[] | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  images?: string[] | null;
};

// A supplier "has an image" if it carries a primary photo or any gallery image.
// Empty-image cards look untrustworthy, so this is both a scoring signal and the
// primary sort tiebreaker used across the pipeline and the public directory.
export function hasSupplierImage(s: RankableSupplier): boolean {
  return Boolean(s.imageUrl) || Boolean(s.images && s.images.length > 0);
}

const KNOWN_CATEGORIES = new Set([
  "Steel & Metals",
  "Cables & Electrical",
  "Tubes & Pipes",
  "Packaging",
  "Construction",
  "Industrial Parts",
]);

// Sourcing hubs that are especially relevant for global B2B procurement.
const RELEVANT_COUNTRIES = new Set([
  "China",
  "Germany",
  "United States",
  "USA",
  "India",
  "Italy",
  "Turkey",
  "United Arab Emirates",
  "UAE",
  "Spain",
  "France",
  "Mexico",
  "Morocco",
  "Netherlands",
  "United Kingdom",
  "UK",
  "Poland",
  "Vietnam",
  "Brazil",
]);

export function scoreSupplier(s: RankableSupplier): number {
  const rating = s.googleRating ?? 0;
  const reviews = s.googleReviews ?? 0;

  // Rating: up to 40 points (4.5★ ≈ 36, 5★ = 40).
  const ratingScore = Math.max(0, Math.min(40, (rating / 5) * 40));

  // Reviews: up to 20 points, logarithmic so 1000+ reviews caps out.
  const reviewScore =
    reviews <= 0 ? 0 : Math.min(20, (Math.log10(reviews + 1) / 3) * 20);

  const verifiedBonus = s.verified ? 15 : 0;
  const websiteBonus = s.website ? 10 : 0;
  const categoryMatchBonus =
    s.category && KNOWN_CATEGORIES.has(s.category) ? 8 : 0;
  const countryRelevance =
    s.country && RELEVANT_COUNTRIES.has(s.country) ? 4 : 0;

  // Completeness: up to 3 points across key contact/profile fields.
  const fields = [
    s.phone,
    s.email,
    s.description,
    s.address,
    s.products && s.products.length > 0 ? "products" : null,
  ];
  const filled = fields.filter(Boolean).length;
  const completenessBonus = (filled / fields.length) * 3;

  // Has-image bonus: photos make a profile look credible, so image-bearing
  // suppliers rank above otherwise-identical ones with empty cards.
  const imageBonus = hasSupplierImage(s) ? 6 : 0;

  const total =
    ratingScore +
    reviewScore +
    verifiedBonus +
    websiteBonus +
    categoryMatchBonus +
    countryRelevance +
    completenessBonus +
    imageBonus;

  return Math.round(Math.max(0, Math.min(100, total)));
}

// Quality gate for the verified directory. Returns null reason if it passes.
export function rejectionReason(s: RankableSupplier): string | null {
  const name = (s.name ?? "").trim();
  if (name.length < 3) return "missing or too-short name";
  if (/^(test|n\/a|unknown|sample)$/i.test(name)) return "placeholder name";
  if ((s.googleRating ?? 0) < 4.0) return "rating below 4.0";
  if ((s.googleReviews ?? 0) < 20) return "fewer than 20 reviews";
  // Looks like a retail/repair shop rather than a B2B supplier.
  if (/\b(repair|car wash|barber|salon|restaurant|cafe)\b/i.test(name)) {
    return "not a B2B supplier";
  }
  return null;
}
