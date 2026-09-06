import { NextResponse } from "next/server";
import { runDailyImport, optionsFromBody } from "@/lib/import/daily-import";
import { isAuthorizedCron } from "@/lib/import/cron-auth";

// GET /api/cron/daily-import — invoked by Vercel Cron (see vercel.json,
// "0 3 * * *"). Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the
// CRON_SECRET env var is set on the project; anything else is rejected (401).
//
// Query params (all optional): ?limit=25&dryRun=1&enhance=0&grok=0
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    if (!process.env.CRON_SECRET?.trim()) {
      console.warn("[daily-import] CRON_SECRET is not set — cron endpoint refuses all requests.");
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q: Record<string, unknown> = {};
  for (const [k, v] of url.searchParams.entries()) q[k] = /^\d+$/.test(v) ? Number(v) : v;
  const opts = optionsFromBody(q);

  try {
    const summary = await runDailyImport({ ...opts, trigger: "cron", actor: "vercel-cron" });
    return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
  } catch (err) {
    console.error("[daily-import] cron run crashed:", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
