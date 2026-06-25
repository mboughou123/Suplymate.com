import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyzeCart } from "@/lib/cart-analysis";

export const dynamic = "force-dynamic";

// AI cart analysis. Output is advisory only — the buyer must approve and submit
// RFQs themselves. Never auto-submits.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const analysis = await analyzeCart(session.user.id, {
    destination: body.destination ?? null,
    deadline: body.deadline ?? null,
    note: body.note ?? null,
  });
  return NextResponse.json({ analysis });
}
