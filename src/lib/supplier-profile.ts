// Supplier profile assembly.
//
// This module used to generate a complete "Verified Supplier Profile" from a
// hash of the supplier id: certifications (ISO 9001, CE, FDA, GMP) attributed to
// named auditors like Bureau Veritas and SGS, buyer reviews from invented
// companies, factory size, production lines, R&D headcount, annual output,
// on-time-delivery and quality-consistency percentages, and an "AI analysis"
// asserting the supplier ranked in the top tier of its category.
//
// None of it was true. It was rendered on the public profiles of real,
// identifiable businesses, and the fabricated rating was emitted as schema.org
// AggregateRating for search engines to index.
//
// All of it has been removed. What remains is either collected data or plainly
// derived from it. Real certifications come from the Certification table
// (admin-moderated) and real reviews from the Review table; both are loaded by
// the page rather than invented here, and both are currently empty, so the page
// shows an honest empty state.

import type { Supplier } from "@/data/suppliers";
import { scoreSupplier } from "@/lib/supplier-ranking";
import { toDisplaySupplier, type DisplaySupplier } from "@/lib/supplier-display";
import {
  isRealImageUrl,
  getSupplierFallbackImage,
  getProductFallbackImage,
} from "@/lib/image-fallback";
import {
  calculateSupplierCompleteness,
  mediaQualityFor,
  type MediaQuality,
} from "@/lib/supplier-completeness";

/* ------------------------------------------------------------------ */
/* Deterministic styling seed                                          */
/* ------------------------------------------------------------------ */

// The only remaining use of a hash is choosing a stable gradient per supplier,
// so the same card always looks the same. It no longer drives any factual claim.
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/**
 * Confidence in *our record* of the supplier, not a judgement of the supplier.
 *
 * `trustScore` and `completenessScore` both measure how complete and
 * corroborated the collected data is, which is why they can be published
 * honestly while a delivery or quality metric cannot.
 */
export type DataQuality = {
  trustScore: number;
  completenessScore: number;
  /** High-value signals still missing, e.g. "Website", "Real product photos". */
  missingSignals: string[];
};

/** Facts taken directly from the collected record. */
export type CompanyFacts = {
  categoryLabel: string;
  location: string;
  country: string;
  city: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** Supplier-stated MOQ; null when never provided. */
  moq: string | null;
};

export type MediaItem = {
  id: string;
  type: "image" | "video";
  title: string;
  caption: string;
  gradient: string;
  /** Best image URL — real supplier photo when available, else category tile. */
  url: string;
  /** Category-based fallback used if `url` fails to load. */
  fallback: string;
  /** True when `url` is a genuine supplier photograph (not a category tile). */
  isReal: boolean;
};

/**
 * A product the supplier is recorded as offering.
 *
 * Only the name and image are known. Price, MOQ, lead time, material,
 * certifications and shipping terms were previously generated per product and
 * are gone — a buyer gets those by requesting a quote.
 */
export type ProfileProduct = {
  id: string;
  name: string;
  gradient: string;
  /** Best product image — supplier photo when available, else category tile. */
  image: string;
  /** Category-based fallback used if `image` fails to load. */
  imageFallback: string;
  /** True when `image` is a genuine photograph. */
  hasRealPhoto: boolean;
};

export type SupplierProfile = {
  base: DisplaySupplier;
  slug: string;
  metaDescription: string;
  companySummary: string;
  dataQuality: DataQuality;
  company: CompanyFacts;
  media: MediaItem[];
  products: ProfileProduct[];
  /** True when the supplier has no website (no website scraping is attempted). */
  websiteMissing: boolean;
  /** Coarse media-quality bucket — low/medium suppliers flagged for admin. */
  mediaQuality: MediaQuality;
  /** True when the gallery is backed only by category fallbacks (no real media). */
  mediaIncomplete: boolean;
};

/* ------------------------------------------------------------------ */
/* Presentation constants                                              */
/* ------------------------------------------------------------------ */

const PRODUCT_GRADIENTS = [
  "linear-gradient(135deg, rgba(2,132,199,0.16), rgba(13,148,136,0.18))",
  "linear-gradient(135deg, rgba(13,51,73,0.14), rgba(2,132,199,0.2))",
  "linear-gradient(135deg, rgba(20,184,166,0.18), rgba(16,185,129,0.16))",
  "linear-gradient(135deg, #eef2f7, #f8fafc)",
  "linear-gradient(135deg, rgba(96,165,250,0.16), rgba(2,132,199,0.14))",
  "linear-gradient(135deg, rgba(203,163,81,0.14), rgba(244,234,210,0.5))",
];

const MEDIA_GRADIENTS = [
  "linear-gradient(135deg, #0b1b30, #143a5f 55%, rgba(14,165,183,0.55))",
  "linear-gradient(135deg, #1e293b, #0b1b30 55%, rgba(20,184,166,0.5))",
  "linear-gradient(135deg, #0b1b30, rgba(14,165,183,0.4) 60%, #0f172a)",
  "linear-gradient(135deg, #0f172a, #0b1b30 55%, rgba(20,184,166,0.45))",
  "linear-gradient(135deg, #102a43, #1e5580 60%, rgba(96,165,250,0.4))",
  "linear-gradient(135deg, #0d3349, #0284c7 70%, rgba(20,184,166,0.4))",
];

export function getSupplierProfile(s: Supplier): SupplierProfile {
  const base = toDisplaySupplier(s);
  const seed = hashString(s.id || s.name);

  const trustScore = scoreSupplier({
    name: s.name,
    category: s.category ?? null,
    country: s.country ?? base.country,
    website: s.website ?? null,
    phone: s.phone ?? null,
    email: s.email ?? null,
    description: s.description ?? null,
    address: s.address ?? null,
    verified: base.verified,
    googleRating: base.rating,
    googleReviews: base.reviewCount,
    products: s.products,
  });

  /* --- Company facts (collected only) --- */
  const company: CompanyFacts = {
    categoryLabel: base.categoryLabel,
    location: base.location,
    country: base.country,
    city: base.city,
    website: s.website?.trim() || null,
    phone: s.phone?.trim() || null,
    email: s.email?.trim() || null,
    address: s.address?.trim() || null,
    moq: base.moq,
  };

  /* --- Media gallery --- */
  // Only the photos actually attached to the listing. This used to build a
  // fixed grid of six tiles captioned "Production floor", "Quality control",
  // "Material inspection" and so on, assigned in order to whatever photos
  // existed and padded out with a generic category stock image. The photos come
  // from a Google Maps listing with no indication of what they show, so every
  // one of those captions was a guess presented as a fact — and a supplier with
  // one photo still appeared to have a documented QC lab. Captions are now
  // neutral, and a supplier with no photos gets an empty gallery.
  const realSupplierPhotos = [s.imageUrl, ...(s.supplierImages ?? [])].filter(
    (u): u is string => isRealImageUrl(u)
  );
  const categoryMediaFallback = getSupplierFallbackImage(
    s.category ?? s.industry,
    s.name
  );
  const media: MediaItem[] = realSupplierPhotos.map((url, i) => ({
    id: `${base.id}-media-${i}`,
    type: "image",
    title: `${base.name} — photo ${i + 1}`,
    caption: `Photo from the company's public business listing.`,
    gradient: MEDIA_GRADIENTS[(seed + i) % MEDIA_GRADIENTS.length],
    url,
    fallback: categoryMediaFallback,
    isReal: true,
  }));

  /* --- Products --- */
  // Only genuinely recorded product names. The grid is no longer padded out to
  // six cards with invented "Series 2" variants.
  const productNames = (
    s.products.length ? s.products : base.products.map((p) => p.name)
  ).filter((name) => name && name.trim());

  const products: ProfileProduct[] = productNames.slice(0, 8).map((name, i) => {
    const realPhoto = realSupplierPhotos.length
      ? realSupplierPhotos[i % realSupplierPhotos.length]
      : undefined;
    const imageFallback = getProductFallbackImage(
      name,
      s.category ?? base.categoryLabel
    );
    return {
      id: `${base.id}-p-${i}`,
      name,
      gradient: PRODUCT_GRADIENTS[(seed + i) % PRODUCT_GRADIENTS.length],
      image: realPhoto ?? imageFallback,
      imageFallback,
      hasRealPhoto: Boolean(realPhoto),
    };
  });

  /* --- Summary copy --- */
  // Keeps a real scraped description when substantial; otherwise builds one from
  // available data only (category, location, product names). No capacity,
  // certification or performance claims.
  const realDescription =
    typeof s.description === "string" && s.description.trim().length >= 80
      ? s.description.trim()
      : null;
  const namedProducts = productNames.slice(0, 3);
  const place = [base.city, base.country].filter(Boolean).join(", ");
  const generatedDescription = `${base.name} is a ${base.categoryLabel.toLowerCase()} supplier listed in ${
    place || "an unspecified location"
  }${
    namedProducts.length
      ? `, recorded as offering ${namedProducts.join(", ")}`
      : ""
  }. Contact the company directly for pricing, minimum order quantities and lead times.`;
  const companySummary = realDescription ?? generatedDescription;

  const metaDescription = `${base.name} — ${base.categoryLabel} supplier listed in ${
    place || "location not provided"
  }. Contact details, products and quote requests on Suplymate.`;

  /* --- Data quality flags --- */
  const completeness = calculateSupplierCompleteness({
    verified: base.verified,
    website: s.website,
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    images: s.supplierImages,
    products: s.products,
    productImages: realSupplierPhotos,
    description: realDescription,
    rating: base.rating,
    reviewCount: base.reviewCount,
    // Only genuine, admin-moderated certifications count toward completeness.
    certifications: s.certificationsDetailed ?? [],
    certificationImages: s.certificationImages,
  });

  // Suppliers with no website are NOT scraped (we only have their Google Places
  // photos/URL, used above as the media + provenance source).
  // TODO(website-enrichment): add a future "Find website for supplier" flow
  // (Google Programmable Search or manual admin input in the review queue) that
  // backfills `website` here; do NOT add live web-search scraping inline.
  const websiteMissing = !(s.website && s.website.trim());
  const mediaQuality = mediaQualityFor({
    imageUrl: s.imageUrl,
    images: s.supplierImages,
    productImages: realSupplierPhotos,
  });

  return {
    base,
    slug: base.id,
    metaDescription,
    companySummary,
    dataQuality: {
      trustScore,
      completenessScore: completeness.scorePct,
      missingSignals: completeness.missing,
    },
    company,
    media,
    products,
    websiteMissing,
    mediaQuality,
    mediaIncomplete: realSupplierPhotos.length === 0,
  };
}
