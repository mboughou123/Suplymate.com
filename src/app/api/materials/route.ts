import { NextResponse } from "next/server";
import { getMaterialsWithPricing, pricingStatus } from "@/lib/pricing/pricingService";

export const dynamic = "force-dynamic";

// Catalog materials with price provenance. Never returns materials outside the
// catalog, and every entry states its source (seed vs provider).
export async function GET() {
  try {
    const materials = await getMaterialsWithPricing();
    return NextResponse.json({ materials, pricing: pricingStatus() });
  } catch {
    return NextResponse.json({ error: "Could not load materials." }, { status: 500 });
  }
}
