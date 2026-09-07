import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { importLanded, runDailyImport, optionsFromBody, type DailyImportOptions } from "@/lib/import/daily-import";
import { mergePacks, parseImportPayload, type ImportPack } from "@/lib/import/pack-formats";
import { isAuthorizedCron } from "@/lib/import/cron-auth";
import { hasPackContent, parsePushRequest, pushMaxBytes, type PushPayload } from "@/lib/import/push-request";
import { dayStatus, recordDayPart, sealRequired, verifySeal } from "@/lib/import/seal";
import { GROK_BOT_ACTOR } from "@/lib/import/media-ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/admin/import/run — run the daily import now.
//
// Auth: an admin session (src/lib/admin.ts) OR `Authorization: Bearer
// ${CRON_SECRET}` (timing-safe; this is how the Grok machine pushes a finished
// day — attributed as "grok-bot").
//
// Payload: see src/lib/import/push-request.ts (multipart/form-data with
// suppliers.json / products.json / seal / enhanced/** files, or a JSON body).
// Gate: unless IMPORT_REQUIRE_SEAL=false, a pushed pack needs a seal with
// researcherOk=true for the same day and matching sha256 hashes → otherwise
// 422 { skipped: "unsealed" }. A day already imported at the same seal digest
// is a no-op → 200 { skipped: "already_imported" }.

type Auth = { actor: string; viaSecret: boolean } | { denied: NextResponse };

async function authenticate(request: Request): Promise<Auth> {
  if (isAuthorizedCron(request)) return { actor: GROK_BOT_ACTOR, viaSecret: true };
  const denied = await adminGuard();
  if (denied) return { denied };
  return { actor: (await checkAdmin()).email ?? "admin", viaSecret: false };
}

function buildInlinePack(p: PushPayload): ImportPack | null {
  const packs: ImportPack[] = [];
  const localFiles = true;
  if (p.suppliersText) packs.push(parseImportPayload(p.suppliersText, { label: "suppliers.json", localFiles }));
  else if (p.suppliersObj) packs.push(parseImportPayload(p.suppliersObj, { label: "suppliers.json", localFiles }));
  if (p.productsText) packs.push(parseImportPayload(p.productsText, { label: "products.json", localFiles }));
  else if (p.productsObj) packs.push(parseImportPayload(p.productsObj, { label: "products.json", localFiles }));
  if (p.pack) packs.push(parseImportPayload(p.pack, { label: typeof p.options.label === "string" ? p.options.label : "admin-inline", localFiles }));
  if (p.csv) packs.push(parseImportPayload(p.csv, { label: typeof p.options.label === "string" ? p.options.label : "admin-csv", localFiles }));
  if (!packs.length) return null;
  const label = p.day ? `push:${p.day}${p.of > 1 ? ` (${p.part}/${p.of})` : ""}` : "admin-inline";
  return packs.length === 1 ? { ...packs[0], label } : mergePacks(packs, label);
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ("denied" in auth) return auth.denied;
  const { actor } = auth;

  const parsed = await parsePushRequest(request, { maxBytes: pushMaxBytes() });
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  const payload = parsed.payload;
  for (const m of payload.manifests) payload.files.addManifest(m);
  const opts = optionsFromBody(payload.options);

  let inline: ImportPack | null = null;
  try {
    inline = buildInlinePack(payload);
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }

  // ---- Seal gate (only for pushed packs; the env-source fallback has no seal) ----
  const pushed = hasPackContent(payload) || payload.files.size > 0;
  const requireSeal = sealRequired();
  let seal: DailyImportOptions["seal"] = null;
  if (pushed && (payload.seal != null || requireSeal)) {
    const check = verifySeal(payload.seal, {
      day: payload.day,
      files: {
        "suppliers.json": payload.suppliersText ?? undefined,
        "products.json": payload.productsText ?? undefined,
      },
    });
    if (!check.ok) {
      if (requireSeal) {
        return NextResponse.json(
          {
            ok: false,
            skipped: "unsealed",
            error: check.reason,
            day: payload.day ?? check.seal?.day ?? null,
            hint: "Push the day again once seal.json exists with researcherOk=true and matching sha256 hashes.",
          },
          { status: 422 }
        );
      }
      payload.warnings.push(`Seal not verified (${check.reason}) — accepted because IMPORT_REQUIRE_SEAL=false.`);
    } else {
      seal = check.seal;
    }
  } else if (pushed && !requireSeal) {
    payload.warnings.push("No seal supplied — accepted because IMPORT_REQUIRE_SEAL=false.");
  }
  const day = payload.day ?? seal?.day ?? null;

  // ---- Per-day idempotency ----
  if (seal && !opts.dryRun) {
    const status = await dayStatus(seal.day, seal.digest);
    if (status.complete || status.partsDone.includes(payload.part)) {
      return NextResponse.json({
        ok: true,
        skipped: "already_imported",
        day: seal.day,
        chunk: { part: payload.part, of: payload.of },
        seal: { digest: seal.digest, approvedBy: seal.approvedBy, approvedAt: seal.approvedAt },
        importedParts: status.partsDone,
        complete: status.complete,
        lastImportedAt: status.lastImportedAt,
        hint: "Bump the seal (new sha256 / approvedAt) to re-import a revised pack.",
      });
    }
  }

  try {
    const summary = await runDailyImport({
      ...opts,
      inline,
      files: payload.files,
      seal,
      day,
      chunk: payload.of > 1 || payload.day ? { part: payload.part, of: payload.of } : null,
      trigger: "admin",
      actor,
    });
    summary.warnings.push(...payload.warnings);
    // Only a chunk that fully landed is recorded; a chunk with failed uploads
    // (e.g. no Blob token yet) or a deadline cut-off stays re-pushable — every
    // write dedupes, so retrying is cheap and safe.
    const landed = importLanded(summary);
    if (!landed && seal && !summary.dryRun && !summary.skipped) {
      summary.warnings.push("Chunk not recorded in the import ledger (failed media or partial run) — push it again once fixed.");
    }
    if (landed && seal) {
      await recordDayPart({
        day: seal.day,
        digest: seal.digest,
        part: payload.part,
        of: payload.of,
        actor,
        summary: {
          suppliers: summary.suppliers,
          products: summary.products,
          media: summary.media,
          partial: summary.partial,
          held: summary.held.length,
        },
      });
    }
    return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
  } catch (err) {
    console.error("[daily-import] admin run crashed:", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// GET /api/admin/import/run — current configuration (no secrets) and, with
// ?day=YYYY-MM-DD&digest=…, the import ledger for that pack revision.
export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ("denied" in auth) return auth.denied;

  const { configuredSources } = await import("@/lib/import/sources");
  const { enhancerStatus } = await import("@/lib/import/enhance-image");
  const { isXaiConfigured, xaiModel, xaiVisionModel } = await import("@/lib/xai");
  const { storageProviderStatus } = await import("@/lib/image-storage");
  const cfg = configuredSources();

  const url = new URL(request.url);
  const day = url.searchParams.get("day");
  const digest = url.searchParams.get("digest");
  const ledger = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && digest ? await dayStatus(day, digest) : undefined;

  return NextResponse.json({
    actor: auth.actor,
    cronSecretSet: Boolean(process.env.CRON_SECRET?.trim()),
    push: {
      endpoint: "/api/admin/import/run",
      auth: "Authorization: Bearer <CRON_SECRET> or admin session",
      maxBytesPerRequest: pushMaxBytes(),
      sealRequired: sealRequired(),
    },
    ledger,
    sources: {
      bundleUrls: cfg.bundleUrls.map((u) => {
        try {
          return new URL(u).host + new URL(u).pathname;
        } catch {
          return "(invalid url)";
        }
      }),
      outscraper: cfg.outscraper,
      githubPack: cfg.githubPack ? `${cfg.githubPack.owner}/${cfg.githubPack.repo}@${cfg.githubPack.ref}:${cfg.githubPack.path}` : null,
      githubTokenSet: Boolean(process.env.GITHUB_TOKEN?.trim()),
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
