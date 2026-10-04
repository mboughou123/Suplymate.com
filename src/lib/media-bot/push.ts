// Server half of the media push: every item in a bot's media manifest is
// re-validated (contract, file integrity, entity, provenance, QA flags), then
// stored UNPUBLISHED for admin review. Never throws per item; one bad image
// never blocks the rest of the batch.

import { createHash } from "node:crypto";
import type { EntityType, Media, MediaType } from "@/lib/media-types";
import { storagePrefixForEntity } from "@/lib/media-types";
import { packFileRef, type PackFiles } from "@/lib/import/pack-files";
import { checkProvenance } from "./provenance";
import { parseMediaManifest, storageTarget, type MediaCertificationMeta, type MediaItem, type MediaTarget } from "./manifest";
import type { ResolvedEntity } from "./entities";

/** Provider name recorded on enhance audit entries for bot-enhanced stills. */
export const MEDIA_BOT_PROVIDER = "grok-media-bot";
/** Lowest local-AI quality score the server still accepts when the bot sends one. */
export const MIN_QA_QUALITY = 2;

export type StoredBytes = { ok: true; url: string; storageKey: string | null; mimeType: string; fileSize: number } | { ok: false; reason: string };

export type MediaPushDeps = {
  resolveEntity(target: MediaTarget, id: string): Promise<ResolvedEntity | null>;
  ensureCertification(supplierId: string, meta: MediaCertificationMeta, sourceUrl: string): Promise<{ id: string; created: boolean }>;
  existingKeys(entityType: EntityType, entityId: string): Promise<Set<string>>;
  storeBytes(buffer: Buffer, opts: { prefix: string; filename: string; allowSvg: boolean }): Promise<StoredBytes>;
  createMedia(input: {
    url: string;
    storageKey: string | null;
    originalUrl: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    width: number | null;
    height: number | null;
    mediaType: MediaType;
    entityType: EntityType;
    entityId: string;
    altText: string | null;
    caption: string | null;
    uploadedBy: string;
  }): Promise<Media>;
  audit(entry: { action: string; mediaId?: string | null; entityType?: string | null; entityId?: string | null; detail: Record<string, unknown> }): Promise<void>;
};

export type MediaPushItemStatus = "imported" | "would-import" | "skipped" | "rejected" | "failed" | "deferred";

export type MediaPushItemResult = {
  index: number;
  status: MediaPushItemStatus;
  target?: MediaTarget;
  entityId?: string;
  role?: string;
  file?: string;
  reason?: string;
  mediaId?: string;
  certificationId?: string;
  certificationCreated?: boolean;
};

export type MediaPushSummary = {
  ok: boolean;
  dryRun: boolean;
  actor: string;
  bot: string | null;
  industry: string | null;
  counts: Record<MediaPushItemStatus, number>;
  items: MediaPushItemResult[];
};

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * `originalUrl` for a pushed image: where it came from, tagged with a content
 * hash so the same bytes are never stored twice for an entity (the media
 * library dedupes on url / originalUrl).
 */
export function mediaOriginalUrl(item: Pick<MediaItem, "sourceUrl" | "imageUrl">, sha256: string): string {
  const base = (item.imageUrl ?? item.sourceUrl).split("#")[0];
  return `${base}#sha256=${sha256.slice(0, 16)}`;
}

function hasContentHash(keys: Set<string>, sha256: string): boolean {
  const tag = `#sha256=${sha256.slice(0, 16)}`;
  for (const k of keys) if (k.endsWith(tag)) return true;
  return false;
}

function qaRejection(item: MediaItem): string | null {
  if (!item.qa) return null;
  if (item.qa.marketplaceWatermark) return `the bot's QA (${item.qa.model}) saw a marketplace watermark`;
  if (!item.qa.matchesRole) return `the bot's QA (${item.qa.model}) says the image is not a ${item.role}`;
  if (item.qa.quality < MIN_QA_QUALITY) return `the bot's QA (${item.qa.model}) rated quality ${item.qa.quality}/5`;
  return null;
}

function emptyCounts(): Record<MediaPushItemStatus, number> {
  return { imported: 0, "would-import": 0, skipped: 0, rejected: 0, failed: 0, deferred: 0 };
}

export async function runMediaPush(input: {
  manifest: unknown;
  files: PackFiles;
  actor: string;
  dryRun?: boolean;
  deps: MediaPushDeps;
}): Promise<{ ok: false; error: string } | MediaPushSummary> {
  const parsed = parseMediaManifest(input.manifest, { requireFile: true });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { deps, files, actor } = input;
  const dryRun = Boolean(input.dryRun);
  const results: MediaPushItemResult[] = [];
  const keyCache = new Map<string, Set<string>>();
  const entityCache = new Map<string, ResolvedEntity | null>();

  const keysFor = async (entityType: EntityType, entityId: string) => {
    const k = `${entityType}:${entityId}`;
    let set = keyCache.get(k);
    if (!set) {
      set = await deps.existingKeys(entityType, entityId);
      keyCache.set(k, set);
    }
    return set;
  };
  const entityFor = async (target: MediaTarget, id: string) => {
    const k = `${target}:${id}`;
    if (!entityCache.has(k)) entityCache.set(k, await deps.resolveEntity(target, id));
    return entityCache.get(k) ?? null;
  };

  for (const { index, item, error } of parsed.items) {
    if (!item) {
      results.push({ index, status: "rejected", reason: error ?? "invalid item" });
      continue;
    }
    const base: MediaPushItemResult = { index, status: "rejected", target: item.target, entityId: item.entityId, role: item.role, file: item.file };
    try {
      results.push({ ...base, ...(await pushOne(item)) });
    } catch (err) {
      results.push({ ...base, status: "failed", reason: (err as Error).message.slice(0, 300) });
    }
  }

  async function pushOne(item: MediaItem): Promise<Partial<MediaPushItemResult>> {
    const resolved = files.resolve(packFileRef(item.file!));
    if (!resolved || resolved.file.path !== item.file) return { status: "deferred", reason: "file not included in this upload" };
    const buffer = resolved.file.buffer;
    const sha = sha256Hex(buffer);
    if (item.sha256 && item.sha256 !== sha) return { status: "rejected", reason: "sha256 does not match the uploaded bytes" };

    const qa = qaRejection(item);
    if (qa) return { status: "rejected", reason: qa };

    const entity = await entityFor(item.target, item.entityId);
    if (!entity) return { status: "rejected", reason: `unknown ${item.target} "${item.entityId}"` };

    const provenance = checkProvenance({ sourceUrl: item.sourceUrl, imageUrl: item.imageUrl, officialDomains: entity.officialDomains });
    if (!provenance.ok) return { status: "rejected", reason: provenance.reason };

    const { entityType, mediaType } = storageTarget(item.target, item.role);
    let entityId = entity.id;
    let certificationId: string | undefined;
    let certificationCreated: boolean | undefined;
    if (item.target === "supplier" && item.role === "certificate") {
      if (!entity.supplierInDatabase) return { status: "rejected", reason: "supplier is not in the database yet, so its certificate cannot be attached" };
      if (dryRun) {
        entityId = `dry-run:${entity.id}`;
      } else {
        const cert = await deps.ensureCertification(entity.id, item.certification!, item.sourceUrl);
        entityId = cert.id;
        certificationId = cert.id;
        certificationCreated = cert.created;
      }
    }

    const originalUrl = mediaOriginalUrl(item, sha);
    if (!dryRun) {
      const keys = await keysFor(entityType, entityId);
      if (keys.has(originalUrl) || hasContentHash(keys, sha)) return { status: "skipped", reason: "same image already stored", certificationId, certificationCreated };
    }
    if (dryRun) return { status: "would-import" };

    const enhanced = item.enhancement !== "none";
    const prefix = storagePrefixForEntity(entityType);
    const stored = await deps.storeBytes(buffer, {
      prefix: (enhanced ? `${prefix}/enhanced/${entityId}` : `${prefix}/${entityId}`).slice(0, 120),
      filename: `${sha.slice(0, 16)}-${resolved.file.filename}`,
      allowSvg: item.role === "logo",
    });
    if (!stored.ok) return { status: "failed", reason: stored.reason, certificationId, certificationCreated };

    const media = await deps.createMedia({
      url: stored.url,
      storageKey: stored.storageKey,
      originalUrl,
      originalFilename: resolved.file.filename,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
      width: item.width ?? null,
      height: item.height ?? null,
      mediaType,
      entityType,
      entityId,
      altText: item.altText ?? `${entity.name} ${item.role === "certificate" ? item.certification?.name ?? "certificate" : item.role}`.slice(0, 300),
      caption: item.caption ?? null,
      uploadedBy: actor,
    });
    const keys = await keysFor(entityType, entityId);
    keys.add(originalUrl);
    keys.add(stored.url);

    await deps.audit({
      action: enhanced ? "enhance" : "bot_media",
      mediaId: media.id,
      entityType,
      entityId,
      detail: {
        enhanced,
        provider: MEDIA_BOT_PROVIDER,
        enhancement: item.enhancement,
        sourceUrl: item.sourceUrl,
        imageUrl: item.imageUrl ?? null,
        sha256: sha,
        packFile: item.file,
        qa: item.qa ?? null,
        target: item.target,
        targetId: item.entityId,
      },
    });
    return { status: "imported", mediaId: media.id, certificationId, certificationCreated };
  }

  const counts = emptyCounts();
  for (const r of results) counts[r.status]++;
  return {
    ok: counts.failed === 0,
    dryRun,
    actor,
    bot: parsed.manifest.bot ?? null,
    industry: parsed.manifest.industry ?? null,
    counts,
    items: results,
  };
}
