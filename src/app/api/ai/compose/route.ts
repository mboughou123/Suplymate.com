import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { compose, type ComposeMode } from "@/lib/ai-compose";
import { usesLiveAi } from "@/lib/permissions";
import { entitlementsForUserId } from "@/lib/plan-access";

const MODES: ComposeMode[] = [
  "message",
  "rfq",
  "negotiate",
  "summarize",
  "translate",
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const mode = String(body.mode || "message") as ComposeMode;
  if (!MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const result = await compose(
    mode,
    {
      supplierName: body.supplierName,
      buyerName: session.user.name ?? undefined,
      product: body.product,
      quantity: body.quantity,
      destination: body.destination,
      targetPrice: body.targetPrice,
      deadline: body.deadline,
      prompt: body.prompt,
      text: body.text,
      targetLanguage: body.targetLanguage,
    },
    { forceDemo: !usesLiveAi(await entitlementsForUserId(session.user.id)) },
  );

  return NextResponse.json(result);
}
