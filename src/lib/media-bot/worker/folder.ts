// A media folder on the bot machine:
//
//   <dir>/media-manifest.json            written by the bot (originals + where they came from)
//   <dir>/originals/<target>/<id>/…      untouched downloads from the official sites
//   <dir>/enhanced/<target>/<id>/…       written by `prepare`
//   <dir>/media-manifest.prepared.json   written by `prepare`: only items ready to push
//   <dir>/prepare-report.json            why anything was held back
//   <dir>/push-result.json               written by `push`
//
// `prepare` and `push` are idempotent; re-running skips work already done.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import {
  MEDIA_MANIFEST_FILENAME,
  MEDIA_MANIFEST_VERSION,
  parseMediaManifest,
  type MediaItem,
  type MediaManifest,
} from "../manifest";
import { ALIBABA_PHOTO_CAPTION, AI_GENERATED_LABEL, aiAltText } from "@/lib/image-attribution";
import { allowsAlibabaStorePhoto, checkProvenance, isAlibabaOwnWatermark, isMarketplaceUrl } from "../provenance";
import type { MediaNeed } from "../needs";
import type { MediaPushItemResult, MediaPushSummary } from "../push";
import { MIN_QA_QUALITY } from "../push";
import type { AiCache } from "./ai-cache";
import { enhanceForRole } from "./enhance";
import { reviewImage, type LocalAiConfig } from "./local-ai";

export const PREPARED_MANIFEST_FILENAME = "media-manifest.prepared.json";
export const PREPARE_REPORT_FILENAME = "prepare-report.json";
export const PUSH_RESULT_FILENAME = "push-result.json";
export const DEFAULT_MEDIA_CHUNK_BYTES = 3_500_000;
const PART_OVERHEAD = 512;

export type HeldItem = { index: number; entityId?: string; role?: string; reason: string };
export type PrepareReport = { dir: string; prepared: number; held: HeldItem[]; ai: "on" | "off"; cache: AiCache["kind"] };

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Official domains per `target:entityId`, from a media-needs response (or several). */
export function domainsFromNeeds(needs: { items?: MediaNeed[] }[]): Map<string, { domains: string[]; name: string; alibabaStoreHost: string | null }> {
  const out = new Map<string, { domains: string[]; name: string; alibabaStoreHost: string | null }>();
  for (const n of needs) {
    for (const i of n.items ?? []) {
      out.set(`${i.target}:${i.entityId}`, { domains: i.officialDomains, name: i.name, alibabaStoreHost: i.alibabaStoreHost ?? null });
    }
  }
  return out;
}

export async function prepareFolder(opts: {
  dir: string;
  cache: AiCache;
  ai: LocalAiConfig | null;
  /** From media-needs: lets the bot check provenance before uploading. */
  needs?: Map<string, { domains: string[]; name: string; alibabaStoreHost: string | null }>;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}): Promise<PrepareReport> {
  const log = opts.log ?? (() => undefined);
  const manifestPath = join(opts.dir, MEDIA_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) throw new Error(`${manifestPath} not found`);
  const parsed = parseMediaManifest(readJson(manifestPath), { requireFile: false });
  if (!parsed.ok) throw new Error(`${manifestPath}: ${parsed.error}`);

  const held: HeldItem[] = [];
  const ready: MediaItem[] = [];
  for (const { index, item, error } of parsed.items) {
    if (!item) {
      held.push({ index, reason: error ?? "invalid item" });
      continue;
    }
    const hold = (reason: string) => held.push({ index, entityId: item.entityId, role: item.role, reason });
    const known = opts.needs?.get(`${item.target}:${item.entityId}`);
    const store = known?.alibabaStoreHost ?? null;
    const alibabaPhoto = allowsAlibabaStorePhoto({ sourceUrl: item.sourceUrl, imageUrl: item.imageUrl, alibabaStoreHost: store });
    if ((isMarketplaceUrl(item.sourceUrl) || isMarketplaceUrl(item.imageUrl)) && !alibabaPhoto) {
      hold("images from marketplaces or competing directories are not accepted");
      continue;
    }
    if (known) {
      const verdict = checkProvenance({
        sourceUrl: item.sourceUrl,
        imageUrl: item.imageUrl,
        officialDomains: known.domains,
        alibabaStoreHost: store,
      });
      if (!verdict.ok) {
        hold(verdict.reason);
        continue;
      }
    }

    const srcRel = item.original ?? item.file!;
    const srcAbs = join(opts.dir, srcRel);
    if (!existsSync(srcAbs) || !statSync(srcAbs).isFile()) {
      hold(`${srcRel} not found`);
      continue;
    }
    const srcBuf = readFileSync(srcAbs);
    let out: MediaItem = { ...item };
    let outBuf: Buffer = srcBuf;
    let mimeType = mimeFor(srcRel);
    if (item.original) {
      try {
        const enhanced = await enhanceForRole(srcBuf, item.role);
        const stem = basename(item.original, extname(item.original));
        const rel = `enhanced/${item.target}/${item.entityId}/${stem}-${sha256(srcBuf).slice(0, 8)}.${enhanced.ext}`;
        const abs = join(opts.dir, rel);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, enhanced.buffer);
        const keepAi = item.enhancement === "ai-generated" || item.aiGenerated === true;
        out = { ...out, file: rel, enhancement: keepAi ? "ai-generated" : enhanced.enhancement };
        if (keepAi) out.aiGenerated = true;
        if (enhanced.width) out.width = enhanced.width;
        if (enhanced.height) out.height = enhanced.height;
        outBuf = enhanced.buffer;
        mimeType = enhanced.mimeType;
      } catch (err) {
        hold(`could not read ${srcRel} as an image (${(err as Error).message})`);
        continue;
      }
    }
    out.sha256 = sha256(outBuf);

    if (opts.ai) {
      const review = await reviewImage({
        buffer: outBuf,
        mimeType,
        sha256: out.sha256,
        role: item.role,
        entityName: known?.name ?? item.entityId,
        config: opts.ai,
        cache: opts.cache,
        fetchImpl: opts.fetchImpl,
      });
      if (review.ok) {
        out.qa = review.qa;
        const alibabaWatermark = alibabaPhoto && isAlibabaOwnWatermark(review.qa);
        if ((review.qa.marketplaceWatermark && !alibabaWatermark) || !review.qa.matchesRole || review.qa.quality < MIN_QA_QUALITY) {
          hold(`local AI: ${review.qa.marketplaceWatermark && !alibabaWatermark ? "marketplace watermark" : !review.qa.matchesRole ? `not a ${item.role}` : `quality ${review.qa.quality}/5`}${review.qa.notes ? ` (${review.qa.notes})` : ""}`);
          continue;
        }
      } else {
        log(`  item ${index}: QA skipped — ${review.error}`);
      }
    }
    if (alibabaPhoto) {
      out.photoSource = "alibaba-store";
      if (!out.caption) out.caption = ALIBABA_PHOTO_CAPTION;
    }
    if (out.aiGenerated || out.enhancement === "ai-generated") {
      out.aiGenerated = true;
      out.enhancement = "ai-generated";
      out.altText = aiAltText(known?.name ?? item.entityId, out.altText ?? AI_GENERATED_LABEL);
    }
    ready.push(out);
  }

  const prepared: MediaManifest = { ...parsed.manifest, version: MEDIA_MANIFEST_VERSION, items: ready };
  writeJson(join(opts.dir, PREPARED_MANIFEST_FILENAME), prepared);
  const report: PrepareReport = { dir: opts.dir, prepared: ready.length, held, ai: opts.ai ? "on" : "off", cache: opts.cache.kind };
  writeJson(join(opts.dir, PREPARE_REPORT_FILENAME), report);
  log(`prepared ${ready.length} item(s), held ${held.length} — ${opts.dir}`);
  return report;
}

export type MediaChunk = { part: number; items: { index: number; item: MediaItem; size: number }[]; bytes: number };

export function planMediaChunks(dir: string, items: MediaItem[], maxBytes = DEFAULT_MEDIA_CHUNK_BYTES): { chunks: MediaChunk[]; tooLarge: number[] } {
  const chunks: MediaChunk[] = [];
  const tooLarge: number[] = [];
  const room = maxBytes - 64_000;
  let cur: MediaChunk = { part: 1, items: [], bytes: 0 };
  items.forEach((item, index) => {
    const size = statSync(join(dir, item.file!)).size + PART_OVERHEAD + 1_000;
    if (size > room) {
      tooLarge.push(index);
      return;
    }
    if (cur.bytes + size > room && cur.items.length) {
      chunks.push(cur);
      cur = { part: chunks.length + 1, items: [], bytes: 0 };
    }
    cur.items.push({ index, item, size });
    cur.bytes += size;
  });
  if (cur.items.length) chunks.push(cur);
  return { chunks, tooLarge };
}

function mimeFor(rel: string): string {
  const ext = extname(rel).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".gif") return "image/gif";
  if (ext === ".avif") return "image/avif";
  return "image/jpeg";
}

export function buildMediaChunkForm(dir: string, manifest: Omit<MediaManifest, "items">, chunk: MediaChunk, opts: { dryRun?: boolean } = {}): FormData {
  const form = new FormData();
  const body: MediaManifest = { ...manifest, version: MEDIA_MANIFEST_VERSION, items: chunk.items.map((c) => c.item) };
  form.set("manifest", new Blob([JSON.stringify(body)], { type: "application/json" }), MEDIA_MANIFEST_FILENAME);
  if (opts.dryRun) form.set("dryRun", "true");
  for (const { item } of chunk.items) {
    const rel = item.file!;
    form.append(rel, new Blob([new Uint8Array(readFileSync(join(dir, rel)))], { type: mimeFor(rel) }), basename(rel));
  }
  return form;
}

export type FolderPushResult = {
  dir: string;
  endpoint: string;
  ok: boolean;
  alreadyPushed: number;
  tooLarge: number;
  parts: { part: number; status: number; counts?: MediaPushSummary["counts"]; error?: string }[];
  items: (MediaPushItemResult & { manifestIndex: number })[];
};

export async function pushFolder(opts: {
  dir: string;
  baseUrl: string;
  secret: string;
  cache: AiCache;
  dryRun?: boolean;
  force?: boolean;
  chunkBytes?: number;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
}): Promise<FolderPushResult> {
  const log = opts.log ?? (() => undefined);
  const fetchImpl = opts.fetchImpl ?? fetch;
  const path = join(opts.dir, PREPARED_MANIFEST_FILENAME);
  if (!existsSync(path)) throw new Error(`${path} not found — run \`media-bot prepare\` first`);
  const parsed = parseMediaManifest(readJson(path), { requireFile: true });
  if (!parsed.ok) throw new Error(`${path}: ${parsed.error}`);

  const endpoint = `${opts.baseUrl.replace(/\/+$/, "")}/api/admin/import/media`;
  const pending: MediaItem[] = [];
  const indexMap: number[] = [];
  let alreadyPushed = 0;
  for (const { index, item } of parsed.items) {
    if (!item) continue;
    if (!opts.force && !opts.dryRun && item.sha256 && (await opts.cache.wasPushed(item.sha256, item.target, item.entityId))) {
      alreadyPushed++;
      continue;
    }
    pending.push(item);
    indexMap.push(index);
  }

  const { chunks, tooLarge } = planMediaChunks(opts.dir, pending, opts.chunkBytes);
  const result: FolderPushResult = { dir: opts.dir, endpoint, ok: tooLarge.length === 0, alreadyPushed, tooLarge: tooLarge.length, parts: [], items: [] };
  log(`push ${opts.dir}: ${pending.length} item(s) in ${chunks.length} request(s), ${alreadyPushed} already pushed, ${tooLarge.length} too large`);

  for (const chunk of chunks) {
    const form = buildMediaChunkForm(opts.dir, parsed.manifest, chunk, { dryRun: opts.dryRun });
    let status = 0;
    let body: Partial<MediaPushSummary> & { error?: string } = {};
    try {
      const res = await fetchImpl(endpoint, { method: "POST", headers: { authorization: `Bearer ${opts.secret}` }, body: form });
      status = res.status;
      const text = await res.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = { error: text.slice(0, 500) };
      }
    } catch (err) {
      body = { error: (err as Error).message };
    }
    result.parts.push({ part: chunk.part, status, counts: body.counts, error: body.error });
    log(`  part ${chunk.part}/${chunks.length} → ${status}${body.counts ? ` ${JSON.stringify(body.counts)}` : ""}${body.error ? ` ${body.error}` : ""}`);
    if (status < 200 || status >= 300 || !Array.isArray(body.items)) {
      result.ok = false;
      if (status === 401 || status === 403 || status === 400 || status === 413) break;
      continue;
    }
    for (const r of body.items) {
      const local = chunk.items[r.index];
      if (!local) continue;
      result.items.push({ ...r, manifestIndex: indexMap[local.index] });
      if (r.status === "failed") result.ok = false;
      if (!opts.dryRun && (r.status === "imported" || r.status === "skipped") && local.item.sha256) {
        await opts.cache.markPushed({
          sha256: local.item.sha256,
          target: local.item.target,
          entityId: local.item.entityId,
          role: local.item.role,
          sourceUrl: local.item.sourceUrl,
          mediaId: r.mediaId ?? null,
        });
      }
    }
  }
  if (!opts.dryRun) writeJson(join(opts.dir, PUSH_RESULT_FILENAME), { ...result, pushedAt: new Date().toISOString() });
  return result;
}
