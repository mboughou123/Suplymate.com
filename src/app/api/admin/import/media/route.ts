import { NextResponse } from "next/server";
import { authenticatePush } from "@/lib/import/push-auth";
import { parsePushRequest, pushMaxBytes } from "@/lib/import/push-request";
import { storageProviderStatus } from "@/lib/image-storage";
import { logMediaAudit } from "@/lib/media-store";
import {
  ENHANCEMENTS,
  MAX_MANIFEST_ITEMS,
  MEDIA_MANIFEST_FILENAME,
  MEDIA_MANIFEST_VERSION,
  MEDIA_TARGETS,
  enhancementsForRole,
  looksLikeMediaManifest,
  rolesForTarget,
  MEDIA_ROLES,
} from "@/lib/media-bot/manifest";
import { MARKETPLACE_DOMAINS } from "@/lib/media-bot/provenance";
import { AI_GENERATED_LABEL, ALIBABA_PHOTO_CAPTION } from "@/lib/image-attribution";
import { runMediaPush } from "@/lib/media-bot/push";
import { serverMediaPushDeps } from "@/lib/media-bot/server-deps";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/admin/import/media — the Grok media bots push logos, photos,
// product images and certificate scans they collected and enhanced on their
// own machines. Same auth, multipart encoding and per-request cap as
// /api/admin/import/run; the payload is a media manifest (field `manifest`,
// see src/lib/media-bot/manifest.ts) plus one part per image whose field name
// is its pack-relative path. Everything lands UNPUBLISHED for admin review.
// See docs/grok-media-bot.md.

function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === "1";
}

export async function POST(request: Request) {
  const auth = await authenticatePush(request);
  if ("denied" in auth) return auth.denied;

  const parsed = await parsePushRequest(request, { maxBytes: pushMaxBytes() });
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  const payload = parsed.payload;
  const manifest = payload.manifests.find(looksLikeMediaManifest);
  if (!manifest) {
    return NextResponse.json(
      { ok: false, error: `No media manifest (version ${MEDIA_MANIFEST_VERSION}) in the request. Send ${MEDIA_MANIFEST_FILENAME} as the "manifest" field.` },
      { status: 400 }
    );
  }

  try {
    const summary = await runMediaPush({
      manifest,
      files: payload.files,
      actor: auth.actor,
      dryRun: truthy(payload.options.dryRun),
      deps: serverMediaPushDeps(auth.actor),
    });
    if (!("counts" in summary)) return NextResponse.json(summary, { status: 400 });
    if (!summary.dryRun) {
      await logMediaAudit({
        adminUser: auth.actor,
        action: "media_push",
        detail: { bot: summary.bot, industry: summary.industry, counts: summary.counts, files: payload.files.size, bytes: payload.bytes },
      });
    }
    return NextResponse.json({ ...summary, warnings: payload.warnings });
  } catch (err) {
    console.error("[media-push] crashed:", (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// GET /api/admin/import/media — the push contract, for the bots to self-check.
export async function GET(request: Request) {
  const auth = await authenticatePush(request);
  if ("denied" in auth) return auth.denied;
  return NextResponse.json({
    actor: auth.actor,
    endpoint: "/api/admin/import/media",
    needsEndpoint: "/api/admin/import/media-needs",
    manifest: { filename: MEDIA_MANIFEST_FILENAME, version: MEDIA_MANIFEST_VERSION, maxItems: MAX_MANIFEST_ITEMS },
    targets: Object.fromEntries(MEDIA_TARGETS.map((t) => [t, rolesForTarget(t)])),
    enhancements: Object.fromEntries(MEDIA_ROLES.map((r) => [r, enhancementsForRole(r)])),
    allEnhancements: ENHANCEMENTS,
    blockedSources: MARKETPLACE_DOMAINS,
    alibabaStorePhotos: {
      allowedWhen:
        "alibaba.com is allowed as sourceUrl only when the supplier record's website, sourceUrl or alibabaUrl is that same storefront and the image comes from that store's listings (alicdn.com files included). Every other marketplace stays blocked.",
      photoSource: "alibaba-store",
      caption: ALIBABA_PHOTO_CAPTION,
      watermark: "Alibaba's own store watermark is accepted only for that matching-store photo.",
    },
    aiGeneratedProductImages: {
      enhancement: "ai-generated",
      requiresAiGenerated: true,
      allowedWhen: "target=product and role=product only. Never logos, factory/cover, gallery or certificates.",
      label: AI_GENERATED_LABEL,
    },
    maxBytesPerRequest: pushMaxBytes(),
    storage: storageProviderStatus(),
  });
}
