// Media ingestion for the daily import: download a remote image through the
// existing SSRF-safe pipeline (media-upload → image-storage → Vercel Blob), run
// the pluggable enhancer, and record a `Media` row.
//
// Idempotency: a URL already present for the same entity (matched on `url` or
// `originalUrl`, the same rule scripts/migrate-media.ts uses) is skipped, so
// re-running the job never duplicates media. The URL's SHA-1 is embedded in the
// stored filename for traceability.
//
// "Enhanced" marker: the Media model has no dedicated column (and we avoid a
// schema change), so an enhanced asset is recognisable by
//   • its storageKey living under `<prefix>/enhanced/…`, and
//   • a MediaAuditLog entry `action: "enhance"` with `{ provider, originalStoredUrl }`.
// Every imported row is created UNPUBLISHED for admin review.

import { createHash } from "node:crypto";
import { processImportUrl, processUploadedBuffer } from "@/lib/media-upload";
import { uploadBuffer } from "@/lib/image-storage";
import { createMedia, listMedia, logMediaAudit, type Media, type MediaType, type EntityType } from "@/lib/media-store";
import { enhanceImage, type EnhanceKind, type EnhanceResult } from "./enhance-image";
import { isPackFileRef, type PackFiles } from "./pack-files";

export const IMPORT_ACTOR = "daily-import";
/** Actor recorded for pushes authenticated with CRON_SECRET (the Grok machine). */
export const GROK_BOT_ACTOR = "grok-bot";
/** `provider` written to the audit log for stills the Image Enhancer produced upstream. */
export const PRE_ENHANCED_PROVIDER = "grok-bot-image-enhancer";

export type IngestInput = {
  /** Public http(s) URL, or a `packfile:<relative>` ref resolved via `files`. */
  url: string;
  /** Uploaded pack files (push mode); required to resolve packfile: refs. */
  files?: PackFiles | null;
  entityType: EntityType;
  entityId: string;
  mediaType: MediaType;
  altText?: string | null;
  caption?: string | null;
  isPrimary?: boolean;
  sortOrder?: number;
  kind?: EnhanceKind;
  /** Run the enhancer (default true; logos are never enhanced). */
  enhance?: boolean;
  /** Pre-fetched dedupe keys for the entity (see `existingMediaKeys`). */
  existing?: Set<string>;
  uploadedBy?: string | null;
};

export type IngestResult = {
  url: string;
  /** "deferred": a packfile: ref whose bytes were not part of this upload (another chunk carries it). */
  status: "imported" | "skipped" | "failed" | "deferred";
  media?: Media;
  enhanced: boolean;
  enhancer?: EnhanceResult["provider"] | typeof PRE_ENHANCED_PROVIDER;
  reason?: string;
};

export function urlHash(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

export function prefixForEntity(entityType: EntityType): string {
  switch (entityType) {
    case "SUPPLIER":
      return "suppliers";
    case "PRODUCT":
      return "products";
    case "CERTIFICATION":
      return "certifications";
    case "USER":
      return "profiles";
    default:
      return "media";
  }
}

/** url + originalUrl of every Media row already attached to an entity. */
export async function existingMediaKeys(entityType: EntityType, entityId: string): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    const rows = await listMedia({ entityType, entityId });
    for (const r of rows) {
      if (r.url) set.add(r.url);
      if (r.originalUrl) set.add(r.originalUrl);
    }
  } catch {
    // no DB — nothing to dedupe against
  }
  return set;
}

/**
 * Import one remote image for an entity. Never throws.
 */
export async function ingestRemoteImage(input: IngestInput): Promise<IngestResult> {
  const url = input.url.trim();
  if (input.existing?.has(url)) return { url, status: "skipped", enhanced: false, reason: "already imported" };
  if (isPackFileRef(url)) return ingestUploadedImage(input, url);
  if (!/^https?:\/\//i.test(url)) return { url, status: "failed", enhanced: false, reason: "not a public http(s) url" };

  const prefix = prefixForEntity(input.entityType);
  const kind: EnhanceKind = input.kind ?? (input.mediaType === "CERTIFICATION" ? "certificate" : input.mediaType === "SUPPLIER_LOGO" ? "logo" : "photo");
  const allowSvg = input.mediaType === "SUPPLIER_LOGO";

  const fetched = await processImportUrl(url, { prefix: `${prefix}/${input.entityId}`.slice(0, 120), allowSvg });
  if (!fetched.ok) return { url, status: "failed", enhanced: false, reason: fetched.error };

  // In passthrough mode (no Blob token) the stored URL is a data: URL; keep the
  // public source URL instead so the DB never fills with base64 blobs.
  const passthrough = fetched.stored.provider === "passthrough";
  let servingUrl = passthrough ? url : fetched.stored.url;
  let storageKey = passthrough ? null : fetched.stored.storageKey;
  let mimeType = fetched.mimeType;
  let fileSize = fetched.fileSize;
  let enhanced = false;
  let enhancer: EnhanceResult["provider"] | undefined;
  let enhanceNote: string | undefined;

  if (input.enhance !== false && kind !== "logo") {
    // Only attempt when we can actually persist the result (Blob configured);
    // otherwise an enhanced buffer would have nowhere to live.
    if (passthrough) {
      enhanceNote = "no storage provider — enhancement skipped";
    } else {
      // The enhancer receives the public source URL (the webhook fetches it
      // itself; the OpenAI provider re-downloads through the SSRF-safe fetcher).
      const res = await enhanceImage({
        imageUrl: url,
        contentType: mimeType,
        kind,
        entity: { type: input.entityType, id: input.entityId },
        requestId: `${input.entityId}-${urlHash(url)}`,
      });
      enhancer = res.provider;
      if (res.enhanced) {
        const stored = await uploadBuffer(res.buffer, {
          contentType: res.contentType,
          prefix: `${prefix}/enhanced/${input.entityId}`.slice(0, 120),
          filename: `${urlHash(url)}-${fetched.filename}`,
        });
        if (stored.provider !== "passthrough") {
          servingUrl = stored.url;
          storageKey = stored.storageKey;
          mimeType = res.contentType;
          fileSize = res.buffer.byteLength;
          enhanced = true;
        } else {
          enhanceNote = "enhanced bytes could not be stored — kept original";
        }
      } else {
        enhanceNote = res.reason;
      }
    }
  }

  const media = await createMedia(
    {
      url: servingUrl,
      storageKey,
      originalUrl: url,
      originalFilename: fetched.filename,
      mimeType,
      fileSize,
      mediaType: input.mediaType,
      entityType: input.entityType,
      entityId: input.entityId,
      altText: input.altText ?? null,
      caption: input.caption ?? null,
      sortOrder: input.sortOrder,
      isPrimary: input.isPrimary ?? false,
      status: "unpublished",
      uploadedBy: input.uploadedBy ?? IMPORT_ACTOR,
    },
    input.uploadedBy ?? IMPORT_ACTOR
  );

  if (enhanced) {
    await logMediaAudit({
      adminUser: input.uploadedBy ?? IMPORT_ACTOR,
      action: "enhance",
      mediaId: media.id,
      entityType: input.entityType,
      entityId: input.entityId,
      detail: { enhanced: true, provider: enhancer, originalStoredUrl: fetched.stored.url, sourceUrl: url },
    });
  }

  input.existing?.add(url);
  if (servingUrl) input.existing?.add(servingUrl);
  return { url, status: "imported", media, enhanced, enhancer, reason: enhanceNote };
}

/**
 * Bytes source: the image was uploaded with the pack (multipart part or data:
 * URL) instead of being fetched. No enhancer runs — the Grok machine's
 * `enhanced/` stills are already the enhanced output, so they are stored under
 * the `enhanced/` prefix and logged as enhanced with the pre-enhanced provider.
 * The `packfile:` ref is kept as `originalUrl` so re-posting the same day (or
 * the same file in another chunk) dedupes on it.
 */
async function ingestUploadedImage(input: IngestInput, ref: string): Promise<IngestResult> {
  const resolved = input.files?.resolve(ref) ?? null;
  if (!resolved) {
    return { url: ref, status: "deferred", enhanced: false, reason: "file not included in this upload" };
  }
  const { file, preEnhanced } = resolved;
  const prefix = prefixForEntity(input.entityType);
  const allowSvg = input.mediaType === "SUPPLIER_LOGO";
  const dir = preEnhanced ? `${prefix}/enhanced/${input.entityId}` : `${prefix}/${input.entityId}`;

  const stored = await processUploadedBuffer(file.buffer, `${urlHash(ref)}-${file.filename}`, { prefix: dir.slice(0, 120), allowSvg });
  if (!stored.ok) return { url: ref, status: "failed", enhanced: false, reason: `${file.path}: ${stored.error}` };
  if (stored.stored.provider === "passthrough") {
    // Nowhere to persist bytes (no Blob token): a data: URL in the DB would be
    // useless for the site, so report instead of storing.
    return { url: ref, status: "failed", enhanced: false, reason: "no storage provider configured for uploaded files" };
  }

  const media = await createMedia(
    {
      url: stored.stored.url,
      storageKey: stored.stored.storageKey,
      originalUrl: ref,
      originalFilename: file.filename,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      mediaType: input.mediaType,
      entityType: input.entityType,
      entityId: input.entityId,
      altText: input.altText ?? null,
      caption: input.caption ?? null,
      sortOrder: input.sortOrder,
      isPrimary: input.isPrimary ?? false,
      status: "unpublished",
      uploadedBy: input.uploadedBy ?? IMPORT_ACTOR,
    },
    input.uploadedBy ?? IMPORT_ACTOR
  );

  if (preEnhanced) {
    await logMediaAudit({
      adminUser: input.uploadedBy ?? IMPORT_ACTOR,
      action: "enhance",
      mediaId: media.id,
      entityType: input.entityType,
      entityId: input.entityId,
      detail: { enhanced: true, preEnhanced: true, provider: PRE_ENHANCED_PROVIDER, packFile: file.path, requested: resolved.requested },
    });
  }

  input.existing?.add(ref);
  input.existing?.add(stored.stored.url);
  return { url: ref, status: "imported", media, enhanced: preEnhanced, enhancer: preEnhanced ? PRE_ENHANCED_PROVIDER : undefined };
}
