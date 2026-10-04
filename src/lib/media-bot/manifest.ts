// `media-manifest.json` — the contract between the Grok media bots (which
// collect and enhance images on their own machines) and Suplymate's push
// endpoint (POST /api/admin/import/media). See docs/grok-media-bot.md.
//
// Pure module (no Node / DB imports): the worker validates with it before
// uploading, the server validates again on receipt.

import type { EntityType, MediaType } from "@/lib/media-types";
import { toPackRelative } from "@/lib/import/pack-files";

export const MEDIA_MANIFEST_VERSION = 1;
export const MEDIA_MANIFEST_FILENAME = "media-manifest.json";
export const MAX_MANIFEST_ITEMS = 500;

export const MEDIA_TARGETS = ["supplier", "product", "certification", "logistics-provider"] as const;
export type MediaTarget = (typeof MEDIA_TARGETS)[number];

export const MEDIA_ROLES = ["logo", "cover", "factory", "gallery", "product", "certificate"] as const;
export type MediaRole = (typeof MEDIA_ROLES)[number];

/**
 * What the bot did to the pixels. Generative edits (inpainting, AI redraws,
 * "improved" logos) are not in this list on purpose: a buyer must see the real
 * factory, product and certificate.
 */
export const ENHANCEMENTS = ["none", "resize", "restore", "upscale", "background-removed"] as const;
export type Enhancement = (typeof ENHANCEMENTS)[number];

export type MediaCertificationMeta = {
  name: string;
  type?: string;
  issuingOrg?: string;
  certificateNumber?: string;
  issueDate?: string;
  expirationDate?: string;
  verificationUrl?: string;
};

export type MediaQa = {
  model: string;
  quality: number;
  matchesRole: boolean;
  marketplaceWatermark: boolean;
  notes?: string;
};

export type MediaItem = {
  target: MediaTarget;
  entityId: string;
  role: MediaRole;
  /** Pack-relative path of the bytes to upload (`enhanced/…` after prepare). */
  file?: string;
  /** Pack-relative path of the untouched download (`originals/…`). */
  original?: string;
  /** Page on the entity's official website where the image appears. */
  sourceUrl: string;
  /** Direct image URL, when known (may be on the site's CDN). */
  imageUrl?: string;
  enhancement: Enhancement;
  sha256?: string;
  width?: number;
  height?: number;
  altText?: string;
  caption?: string;
  certification?: MediaCertificationMeta;
  qa?: MediaQa;
};

export type MediaManifest = {
  version: typeof MEDIA_MANIFEST_VERSION;
  bot?: string;
  industry?: string;
  generatedAt?: string;
  items: MediaItem[];
};

export type ParsedItem = { index: number; item: MediaItem | null; error: string | null };

export type ManifestParseResult =
  | { ok: true; manifest: Omit<MediaManifest, "items">; items: ParsedItem[] }
  | { ok: false; error: string };

const IMAGE_FILE_RE = /\.(jpe?g|png|webp|gif|avif|svg)$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function includes<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

export function rolesForTarget(target: MediaTarget): readonly MediaRole[] {
  switch (target) {
    case "supplier":
      return ["logo", "cover", "factory", "gallery", "certificate"];
    case "product":
      return ["product"];
    case "certification":
      return ["certificate"];
    case "logistics-provider":
      return ["logo"];
    default: {
      const unreachable: never = target;
      throw new Error(`unknown media target ${String(unreachable)}`);
    }
  }
}

/** Logos and certificates are documents: only lossless-in-meaning edits. */
export function enhancementsForRole(role: MediaRole): readonly Enhancement[] {
  switch (role) {
    case "logo":
      return ["none", "resize", "background-removed"];
    case "certificate":
      return ["none", "resize"];
    case "cover":
    case "factory":
    case "gallery":
    case "product":
      return ENHANCEMENTS;
    default: {
      const unreachable: never = role;
      throw new Error(`unknown media role ${String(unreachable)}`);
    }
  }
}

/**
 * Media row the item becomes. Supplier certificates land on the Certification
 * row (created as "claimed" when missing), so their entityId is resolved later.
 */
export function storageTarget(target: MediaTarget, role: MediaRole): { entityType: EntityType; mediaType: MediaType } {
  switch (target) {
    case "logistics-provider":
      return { entityType: "LOGISTICS_PROVIDER", mediaType: "PROVIDER_LOGO" };
    case "product":
      return { entityType: "PRODUCT", mediaType: "PRODUCT_GALLERY" };
    case "certification":
      return { entityType: "CERTIFICATION", mediaType: "CERTIFICATION" };
    case "supplier":
      switch (role) {
        case "logo":
          return { entityType: "SUPPLIER", mediaType: "SUPPLIER_LOGO" };
        case "cover":
          return { entityType: "SUPPLIER", mediaType: "SUPPLIER_COVER" };
        case "factory":
          return { entityType: "SUPPLIER", mediaType: "SUPPLIER_FACTORY" };
        case "gallery":
        case "product":
          return { entityType: "SUPPLIER", mediaType: "SUPPLIER_GALLERY" };
        case "certificate":
          return { entityType: "CERTIFICATION", mediaType: "CERTIFICATION" };
        default: {
          const unreachable: never = role;
          throw new Error(`unknown media role ${String(unreachable)}`);
        }
      }
    default: {
      const unreachable: never = target;
      throw new Error(`unknown media target ${String(unreachable)}`);
    }
  }
}

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().replace(/[\r\n\t]+/g, " ");
  return t ? t.slice(0, max) : undefined;
}

function httpUrl(v: unknown): string | undefined {
  const s = str(v, 2000);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

function packPath(v: unknown, dirs: readonly string[]): string | null {
  const s = str(v, 500);
  if (!s) return null;
  const rel = toPackRelative(s);
  if (!rel || !IMAGE_FILE_RE.test(rel) || !dirs.some((d) => rel.startsWith(`${d}/`))) return null;
  return rel;
}

function positiveInt(v: unknown): number | undefined {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v < 100_000 ? v : undefined;
}

function parseCertification(v: unknown): MediaCertificationMeta | string | undefined {
  if (v == null) return undefined;
  if (typeof v !== "object" || Array.isArray(v)) return "certification must be an object";
  const o = v as Record<string, unknown>;
  const name = str(o.name, 200);
  if (!name) return "certification.name is required";
  const meta: MediaCertificationMeta = { name };
  const type = str(o.type, 100);
  const issuingOrg = str(o.issuingOrg, 200);
  const certificateNumber = str(o.certificateNumber, 120);
  if (type) meta.type = type;
  if (issuingOrg) meta.issuingOrg = issuingOrg;
  if (certificateNumber) meta.certificateNumber = certificateNumber;
  for (const key of ["issueDate", "expirationDate"] as const) {
    if (o[key] == null) continue;
    const d = str(o[key], 10);
    if (!d || !DAY_RE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) return `certification.${key} must be YYYY-MM-DD`;
    meta[key] = d;
  }
  if (o.verificationUrl != null) {
    const u = httpUrl(o.verificationUrl);
    if (!u) return "certification.verificationUrl must be an http(s) URL";
    meta.verificationUrl = u;
  }
  return meta;
}

function parseQa(v: unknown): MediaQa | undefined {
  if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const model = str(o.model, 120);
  if (!model || typeof o.quality !== "number" || typeof o.matchesRole !== "boolean" || typeof o.marketplaceWatermark !== "boolean") return undefined;
  const qa: MediaQa = {
    model,
    quality: Math.max(1, Math.min(5, Math.round(o.quality))),
    matchesRole: o.matchesRole,
    marketplaceWatermark: o.marketplaceWatermark,
  };
  const notes = str(o.notes, 300);
  if (notes) qa.notes = notes;
  return qa;
}

/**
 * Validate one manifest entry. `requireFile` is set for pushes (the bytes must
 * be named); before `prepare` an `original` is enough.
 */
export function parseMediaItem(raw: unknown, opts: { requireFile: boolean }): { item: MediaItem } | { error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { error: "item must be an object" };
  const o = raw as Record<string, unknown>;
  if (!includes(MEDIA_TARGETS, o.target)) return { error: `target must be one of ${MEDIA_TARGETS.join(", ")}` };
  const target = o.target;
  const entityId = str(o.entityId, 200);
  if (!entityId || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(entityId)) return { error: "entityId is missing or malformed" };
  if (!includes(MEDIA_ROLES, o.role)) return { error: `role must be one of ${MEDIA_ROLES.join(", ")}` };
  const role = o.role;
  if (!rolesForTarget(target).includes(role)) return { error: `role "${role}" is not valid for target "${target}" (allowed: ${rolesForTarget(target).join(", ")})` };

  const enhancementRaw = o.enhancement ?? "none";
  if (!includes(ENHANCEMENTS, enhancementRaw)) {
    return { error: `enhancement "${String(enhancementRaw)}" is not accepted (allowed: ${ENHANCEMENTS.join(", ")}; generative edits are never accepted)` };
  }
  if (!enhancementsForRole(role).includes(enhancementRaw)) {
    return { error: `enhancement "${enhancementRaw}" is not allowed for ${role} images (allowed: ${enhancementsForRole(role).join(", ")})` };
  }

  const sourceUrl = httpUrl(o.sourceUrl);
  if (!sourceUrl) return { error: "sourceUrl must be the http(s) page where the image was found" };
  let imageUrl: string | undefined;
  if (o.imageUrl != null) {
    imageUrl = httpUrl(o.imageUrl);
    if (!imageUrl) return { error: "imageUrl must be an http(s) URL" };
  }

  const file = o.file == null ? null : packPath(o.file, ["enhanced", "originals"]);
  if (o.file != null && !file) return { error: "file must be an image path under enhanced/ or originals/" };
  const original = o.original == null ? null : packPath(o.original, ["originals"]);
  if (o.original != null && !original) return { error: "original must be an image path under originals/" };
  if (opts.requireFile && !file) return { error: "file is required (run `media-bot prepare` first)" };
  if (!file && !original) return { error: "either file or original is required" };

  let sha256: string | undefined;
  if (o.sha256 != null) {
    if (typeof o.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(o.sha256)) return { error: "sha256 must be 64 hex characters" };
    sha256 = o.sha256.toLowerCase();
  }

  const cert = parseCertification(o.certification);
  if (typeof cert === "string") return { error: cert };
  if (target === "supplier" && role === "certificate" && !cert) return { error: "supplier certificates need certification.name" };

  const item: MediaItem = { target, entityId, role, sourceUrl, enhancement: enhancementRaw };
  if (file) item.file = file;
  if (original) item.original = original;
  if (imageUrl) item.imageUrl = imageUrl;
  if (sha256) item.sha256 = sha256;
  const width = positiveInt(o.width);
  const height = positiveInt(o.height);
  if (width) item.width = width;
  if (height) item.height = height;
  const altText = str(o.altText, 300);
  const caption = str(o.caption, 300);
  if (altText) item.altText = altText;
  if (caption) item.caption = caption;
  if (cert) item.certification = cert;
  const qa = parseQa(o.qa);
  if (qa) item.qa = qa;
  return { item };
}

export function parseMediaManifest(raw: unknown, opts: { requireFile: boolean }): ManifestParseResult {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch (err) {
      return { ok: false, error: `media manifest is not valid JSON: ${(err as Error).message}` };
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "media manifest must be a JSON object" };
  const o = value as Record<string, unknown>;
  if (o.version !== MEDIA_MANIFEST_VERSION) return { ok: false, error: `media manifest version must be ${MEDIA_MANIFEST_VERSION}` };
  if (!Array.isArray(o.items)) return { ok: false, error: "media manifest needs an items array" };
  if (o.items.length > MAX_MANIFEST_ITEMS) return { ok: false, error: `media manifest has ${o.items.length} items; split it (max ${MAX_MANIFEST_ITEMS})` };

  const items: ParsedItem[] = o.items.map((entry, index) => {
    const res = parseMediaItem(entry, opts);
    return "item" in res ? { index, item: res.item, error: null } : { index, item: null, error: res.error };
  });
  const manifest: Omit<MediaManifest, "items"> = { version: MEDIA_MANIFEST_VERSION };
  const bot = str(o.bot, 80);
  const industry = str(o.industry, 80);
  const generatedAt = str(o.generatedAt, 40);
  if (bot) manifest.bot = bot;
  if (industry) manifest.industry = industry;
  if (generatedAt) manifest.generatedAt = generatedAt;
  return { ok: true, manifest, items };
}

/** Is this a manifest object (vs an Image Enhancer `[{src,dst}]` manifest)? */
export function looksLikeMediaManifest(v: unknown): boolean {
  return Boolean(v && typeof v === "object" && !Array.isArray(v) && (v as { version?: unknown }).version === MEDIA_MANIFEST_VERSION && Array.isArray((v as { items?: unknown }).items));
}
