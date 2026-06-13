import { NextResponse } from "next/server";
import { getSuppliersFromDb } from "@/lib/data-service";

export async function GET() {
  const suppliers = await getSuppliersFromDb();
  return NextResponse.json({ suppliers });
}
