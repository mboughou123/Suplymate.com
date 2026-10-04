// Production wiring for runMediaPush: Prisma, Vercel Blob and the media library.

import { processUploadedBuffer } from "@/lib/media-upload";
import { createMedia, logMediaAudit } from "@/lib/media-store";
import { existingMediaKeys } from "@/lib/import/media-ingest";
import { ensureClaimedCertification, resolveMediaEntity } from "./entities";
import type { MediaPushDeps } from "./push";

export function serverMediaPushDeps(actor: string): MediaPushDeps {
  return {
    resolveEntity: resolveMediaEntity,
    ensureCertification: ensureClaimedCertification,
    existingKeys: existingMediaKeys,
    async storeBytes(buffer, opts) {
      const res = await processUploadedBuffer(buffer, opts.filename, { prefix: opts.prefix, allowSvg: opts.allowSvg });
      if (!res.ok) return { ok: false, reason: res.error };
      // Without a Blob token the bytes would only exist as a data: URL in the
      // DB, which the site cannot serve — report it so the bot pushes again later.
      if (res.stored.provider === "passthrough") return { ok: false, reason: "no storage provider configured for uploaded files" };
      return { ok: true, url: res.stored.url, storageKey: res.stored.storageKey, mimeType: res.mimeType, fileSize: res.fileSize };
    },
    createMedia: (input) => createMedia({ ...input, status: "unpublished", isPrimary: false }, actor),
    audit: (entry) => logMediaAudit({ adminUser: actor, ...entry }),
  };
}
