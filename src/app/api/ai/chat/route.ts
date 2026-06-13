import { NextResponse } from "next/server";
import { getAiProcurementResponse } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const { response, source } = await getAiProcurementResponse(message.trim());
    return NextResponse.json({ response, source });
  } catch {
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
