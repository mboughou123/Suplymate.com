import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { runDailyImport, optionsFromBody } from "@/lib/import/daily-import";
import { parseImportPayload } from "@/lib/import/pack-formats";
import { isAuthorizedCron } from "@/lib/import/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/admin/import/run — manually trigger the daily import (same job as
// the Vercel Cron). Admin session required (src/lib/admin.ts); alternatively a
// `Authorization: Bearer ${CRON_SECRET}` header is accepted so the Grok Bot can
// push its finished pack without a browser session.
//
// Body (JSON, all optional):
//   { limit, productLimit, dryRun, enhance, grok, outscraper,
//     bundleUrl | bundleUrls: [...],          // fetch pack(s) from URL(s)
//     pack: { … } | csv: "name,country,…" }  // inline Lister pack / SupplierBundle / CSV
// Without bundleUrl/pack the job falls back to IMPORT_BUNDLE_URL / Outscraper.
export async function POST(request: Request) {
  let actor: string | null = null;
  if (isAuthorizedCron(request)) {
    actor = "cron-secret";
  } else {
    const denied = await adminGuard();
    if (denied) return denied;
    actor = (await checkAdmin()).email ?? "admin";
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const opts = optionsFromBody(body);

  let inline = null;
  try {
    if (body.pack && typeof body.pack === "object") {
      inline = parseImportPayload(body.pack, { label: typeof body.label === "string" ? body.label : "admin-inline" });
    } else if (typeof body.csv === "string" && body.csv.trim()) {
      inline = parseImportPayload(body.csv, { label: typeof body.label === "string" ? body.label : "admin-csv" });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  try {
    const summary = await runDailyImport({ ...opts, inline, trigger: "admin", actor });
    return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
  } catch (err) {
    console.error("[daily-import] admin run crashed:", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// GET /api/admin/import/run — show the current configuration (no secrets).
export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;
  const { configuredSources } = await import("@/lib/import/sources");
  const { enhancerStatus } = await import("@/lib/import/enhance-image");
  const { isXaiConfigured, xaiModel, xaiVisionModel } = await import("@/lib/xai");
  const { storageProviderStatus } = await import("@/lib/image-storage");
  const cfg = configuredSources();
  return NextResponse.json({
    cronSecretSet: Boolean(process.env.CRON_SECRET?.trim()),
    sources: {
      bundleUrls: cfg.bundleUrls.map((u) => {
        try {
          return new URL(u).host + new URL(u).pathname;
        } catch {
          return "(invalid url)";
        }
      }),
      outscraper: cfg.outscraper,
    },
    grok: { configured: isXaiConfigured(), model: isXaiConfigured() ? xaiModel() : null, visionModel: isXaiConfigured() ? xaiVisionModel() : null },
    enhancer: enhancerStatus(),
    storage: storageProviderStatus(),
    limits: {
      dailyLimit: Number(process.env.IMPORT_DAILY_LIMIT ?? 25),
      productLimit: Number(process.env.IMPORT_DAILY_PRODUCT_LIMIT ?? 150),
    },
  });
}
