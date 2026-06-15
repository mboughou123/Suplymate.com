import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";
import { listScrapedProducts } from "@/lib/scraped-products-store";

export async function GET() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const products = await listScrapedProducts();
  return NextResponse.json({ products });
}
