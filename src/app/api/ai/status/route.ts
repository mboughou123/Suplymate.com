import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/openai";

export async function GET() {
  return NextResponse.json({ configured: isOpenAiConfigured() });
}
