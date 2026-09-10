import { NextResponse } from "next/server";
import { isAiConfigured, resolveAiProvider } from "@/lib/openai";

export async function GET() {
  const provider = resolveAiProvider();
  return NextResponse.json({
    configured: isAiConfigured(),
    provider,
  });
}
