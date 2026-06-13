import { NextResponse } from "next/server";
import { getMaterialsFromDb } from "@/lib/data-service";

export async function GET() {
  const materials = await getMaterialsFromDb();
  return NextResponse.json({ materials });
}
