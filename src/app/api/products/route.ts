import { NextResponse } from "next/server";
import { getPublicProductsPage } from "@/lib/public-products";
import { applyCatalogueCap } from "@/lib/catalogue-access";
import { entitlementsForSession } from "@/lib/plan-access";

export const dynamic = "force-dynamic";

// Public catalogue API — returns ONLY published products (DB-paginated) with
// supplier verification gating. pending/rejected/needs_info never appear here.
// Free plans are capped at 10 products; the rest stay locked.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const { entitlements } = await entitlementsForSession();
    const page = Number(searchParams.get("page")) || 1;
    const requestedSize = Number(searchParams.get("pageSize")) || 24;
    const cap = entitlements.catalogueProductLimit;
    const pageSize = cap != null ? Math.min(requestedSize, cap) : requestedSize;
    const result = await getPublicProductsPage({
      page,
      pageSize,
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      verifiedOnly: searchParams.get("verifiedOnly") === "1",
      hasPrice: searchParams.get("hasPrice") === "1",
    });
    const capped = applyCatalogueCap(result.items, result.total, page, pageSize, cap);
    return NextResponse.json({
      ...result,
      items: capped.items,
      hasMore: capped.hasMore,
      visibleLimit: capped.visibleLimit,
      lockedCount: capped.lockedCount,
      canContact: entitlements.supplierMessaging,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}
