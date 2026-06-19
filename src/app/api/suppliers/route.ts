import { NextResponse } from "next/server";
import { listAdminSuppliers } from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

// GET /api/suppliers — public list. Only VERIFIED suppliers are exposed;
// pending/rejected/needs_info records stay in the admin review queue.
export async function GET() {
  const all = await listAdminSuppliers();
  const suppliers = all
    .filter((s) => s.verificationStatus === "verified")
    .map((s) => ({
      id: s.id,
      name: s.name,
      industry: s.industry,
      category: s.category,
      location: s.location,
      country: s.country,
      city: s.city,
      website: s.website,
      description: s.description,
      logoUrl: s.logoUrl,
      imageUrl: s.imageUrl,
      images: s.images,
      certificationImages: s.certificationImages,
      certifications: s.certifications,
      products: s.products,
      rating: s.rating,
      reviewCount: s.reviewCount,
      trustScore: s.trustScore,
      verified: s.verified,
      sourceUrl: s.sourceUrl,
    }));
  return NextResponse.json({ suppliers });
}
