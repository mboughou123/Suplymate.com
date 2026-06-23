import { NextResponse } from "next/server";
import { getPublicProductsPage } from "@/lib/public-products";

export const dynamic = "force-dynamic";

// Public catalogue API — returns ONLY published products (DB-paginated) with
// supplier verification gating. pending/rejected/needs_info never appear here.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const result = await getPublicProductsPage({
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 24,
      search: searchParams.get("search") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      supplierId: searchParams.get("supplierId") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      verifiedOnly: searchParams.get("verifiedOnly") === "1",
      hasPrice: searchParams.get("hasPrice") === "1",
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}
