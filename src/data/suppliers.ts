export type Industry =
  | "Metal"
  | "Construction & BTP"
  | "Industrial Equipment"
  | "Electrotechnical & Cabling"
  | "Plastics & Packaging"
  | "Agriculture & Agrofood";

// Primary directory categories (match the verified supplier database search).
export type SupplierCategory =
  | "Steel & Metals"
  | "Cables & Electrical"
  | "Tubes & Pipes"
  | "Packaging"
  | "Construction"
  | "Industrial Parts";

export const supplierCategories: SupplierCategory[] = [
  "Steel & Metals",
  "Cables & Electrical",
  "Tubes & Pipes",
  "Packaging",
  "Construction",
  "Industrial Parts",
];

export type Supplier = {
  id: string;
  name: string;
  industry: Industry;
  location: string;
  products: string[];
  deliveryRegions: string[];
  /** Null when the supplier has not told us a minimum order. */
  moq: string | null;
  reliabilityScore: number;
  // Optional rich marketplace fields (filled deterministically when absent)
  logoUrl?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  yearsInBusiness?: number;
  employees?: string;
  // Verified global supplier directory fields (from Outscraper / public data)
  category?: SupplierCategory;
  country?: string;
  city?: string;
  website?: string;
  phone?: string;
  email?: string;
  googleRating?: number;
  googleReviews?: number;
  description?: string;
  address?: string;
  openingHours?: string;
  sourceUrl?: string;
  score?: number;
  lastUpdated?: string;
  // ----- Supplier import & scraping system (optional, additive) -----
  /** Company / factory gallery image URLs collected via import/scrape. */
  supplierImages?: string[];
  /** Certification badge / certificate image URLs. */
  certificationImages?: string[];
  /** Structured certification details (name/type/links). */
  certificationsDetailed?: {
    name: string;
    type?: string | null;
    imageUrl?: string | null;
    certificateUrl?: string | null;
    sourceUrl?: string | null;
  }[];
  /** Moderation state: pending | verified | rejected | needs_info. */
  verificationStatus?: "pending" | "verified" | "rejected" | "needs_info";
  /** Public marketplace lifecycle; LISTED is not independently verified. */
  marketplaceStatus?: string;
  /** Audit actor recorded when an admin grants VERIFIED status. */
  verifiedBy?: string;
  /** 0–100 data-completeness trust score. */
  trustScore?: number;
};

export const industries: Industry[] = [
  "Metal",
  "Construction & BTP",
  "Industrial Equipment",
  "Electrotechnical & Cabling",
  "Plastics & Packaging",
  "Agriculture & Agrofood",
];

// Intentionally empty.
//
// This array previously held twelve invented companies (Atlas Steel, BuildPro
// Matériaux, VoltLine Cabling and similar) used as demo fixtures. They were
// being served publicly alongside real businesses, listed in the sitemap, and
// counted in the published supplier totals, so they were removed from both this
// file and the database.
//
// Do not add placeholder companies here. The directory must contain only real
// businesses; use the seed script for local development instead.
export const suppliers: Supplier[] = [];

export function getSupplierById(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id);
}
