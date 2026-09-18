import { NextResponse } from "next/server";
import { entitlementsForSession } from "@/lib/plan-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const { entitlements } = await entitlementsForSession();
  return NextResponse.json({ entitlements });
}
