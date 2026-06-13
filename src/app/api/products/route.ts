import { NextResponse } from "next/server";
import { getProductsFromDb } from "@/lib/data-service";

export async function GET() {
  const products = await getProductsFromDb();
  return NextResponse.json({ products });
}
