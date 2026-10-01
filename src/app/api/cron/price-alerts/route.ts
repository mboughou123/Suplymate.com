import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/import/cron-auth";
import { checkPriceAlerts } from "@/lib/price-alerts";

// GET /api/cron/price-alerts — invoked by Vercel Cron (see vercel.json). Sends
// the email / SMS for every alert whose material reached its target price.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await checkPriceAlerts();
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[price-alerts] cron run crashed:", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
