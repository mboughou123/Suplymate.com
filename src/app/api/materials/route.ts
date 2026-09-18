import { NextResponse } from "next/server";
import { getMaterialsWithPricing, pricingStatus } from "@/lib/pricing/pricingService";
import { entitlementsForSession } from "@/lib/plan-access";

export const dynamic = "force-dynamic";

// Catalog materials with price provenance. Never returns materials outside the
// catalog, and every entry states its source (seed vs provider). Live WPI/Metals
// refresh is Premium+ materials price tracking only.
export async function GET() {
  try {
    const { entitlements } = await entitlementsForSession();
    const live = entitlements.materialsPriceTracking;
    const materials = await getMaterialsWithPricing({ live });
    return NextResponse.json({
      materials,
      pricing: pricingStatus(),
      materialsPriceTracking: live,
    });
  } catch {
    return NextResponse.json({ error: "Could not load materials." }, { status: 500 });
  }
}
