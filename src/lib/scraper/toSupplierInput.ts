// Adapter: convert a ScrapedSupplier (raw scrape result) into the SupplierInput
// the suppliers-store understands, so a scraped site can be saved as a PENDING
// supplier for admin review.

import type { ScrapedSupplier } from "./types";
import type { SupplierInput, CertificationDetail } from "@/lib/suppliers-store";

export function scrapedToSupplierInput(s: ScrapedSupplier): SupplierInput {
  const certifications: CertificationDetail[] = s.certifications.map((c) => ({
    name: c.name,
    type: c.type,
    imageUrl: c.imageUrl,
    certificateUrl: c.certificateUrl,
    sourceUrl: c.sourceUrl,
  }));

  // Product names feed the supplier's product list; full product records are
  // handled separately by the product import path.
  const productNames = s.products.map((p) => p.name).filter(Boolean);

  // Product images contribute to the supplier gallery + trust score.
  const productImages = s.products.flatMap((p) => p.images);

  return {
    name: s.name ?? s.website ?? s.sourceUrl,
    website: s.website,
    phone: s.phone,
    email: s.email,
    address: s.address,
    description: s.description,
    logoUrl: s.logoUrl,
    images: [...s.images, ...productImages],
    certificationImages: s.certificationImages,
    certifications,
    products: productNames,
    sourceUrl: s.sourceUrl,
    verificationStatus: "pending",
  };
}
