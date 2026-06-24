// Persistence + lifecycle for the unified media library.
//
// Mirrors the resilient pattern used across the app (scraped-products-store,
// suppliers-store): Prisma is the source of truth when the `Media` table is
// provisioned, with an in-memory overlay so admin edits survive for the life of
// the running server even when the DB lacks the table (local dev / demo / a
// not-yet-pushed schema). Every mutation is also written to an append-only
// audit log (DB + overlay) surfaced in the media details panel.

import { prisma } from "@/lib/prisma";
import { deleteFromStorage } from "@/lib/image-storage";
import {
  MEDIA_TYPES,
  ENTITY_TYPES,
  MEDIA_STATUSES,
  MEDIA_TYPES_BY_ENTITY,
  isMediaType,
  isEntityType,
  isMediaStatus,
  type Media,
  type MediaType,
  type EntityType,
  type MediaStatus,
  type MediaAuditEntry,
} from "@/lib/media-types";

export {
  MEDIA_TYPES,
  ENTITY_TYPES,
  MEDIA_STATUSES,
  MEDIA_TYPES_BY_ENTITY,
  isMediaType,
  isEntityType,
  isMediaStatus,
};
export type { Media, MediaType, EntityType, MediaStatus, MediaAuditEntry };

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CreateMediaInput = {
  url: string;
  storageKey?: string | null;
  originalUrl?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  mediaType?: MediaType;
  entityType?: EntityType;
  entityId?: string | null;
  altText?: string | null;
  caption?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
  status?: MediaStatus;
  uploadedBy?: string | null;
};

export type MediaPatch = Partial<
  Pick<
    Media,
    | "url"
    | "storageKey"
    | "originalUrl"
    | "mediaType"
    | "entityType"
    | "entityId"
    | "altText"
    | "caption"
    | "sortOrder"
    | "isPrimary"
    | "status"
    | "width"
    | "height"
  >
>;

export type MediaFilter = {
  entityType?: EntityType;
  entityId?: string;
  mediaType?: MediaType;
  mediaTypes?: MediaType[];
  status?: MediaStatus;
  search?: string;
  /** Only rows with no entity association. */
  unattached?: boolean;
};

/* ------------------------------------------------------------------ */
/* In-memory overlay (no-DB fallback)                                  */
/* ------------------------------------------------------------------ */

const overlay = new Map<string, Media>();
const auditOverlay: MediaAuditEntry[] = [];
let dbAvailable = true;

function cuid(): string {
  return `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

type Row = Record<string, unknown>;
function mapRow(row: Row): Media {
  const s = (v: unknown): string | null => (typeof v === "string" && v.length ? v : null);
  const n = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const d = (v: unknown): string =>
    v instanceof Date ? v.toISOString() : typeof v === "string" ? v : new Date().toISOString();
  return {
    id: String(row.id),
    url: String(row.url ?? ""),
    storageKey: s(row.storageKey),
    originalUrl: s(row.originalUrl),
    originalFilename: s(row.originalFilename),
    mimeType: s(row.mimeType),
    fileSize: n(row.fileSize),
    width: n(row.width),
    height: n(row.height),
    mediaType: (isMediaType(row.mediaType) ? row.mediaType : "GENERAL") as MediaType,
    entityType: (isEntityType(row.entityType) ? row.entityType : "GENERAL") as EntityType,
    entityId: s(row.entityId),
    altText: s(row.altText),
    caption: s(row.caption),
    sortOrder: n(row.sortOrder) ?? 0,
    isPrimary: Boolean(row.isPrimary),
    status: (isMediaStatus(row.status) ? row.status : "unpublished") as MediaStatus,
    uploadedBy: s(row.uploadedBy),
    createdAt: d(row.createdAt),
    updatedAt: d(row.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export async function logMediaAudit(entry: {
  adminUser?: string | null;
  action: string;
  mediaId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  detail?: Record<string, unknown> | string | null;
}): Promise<void> {
  const detail =
    entry.detail == null
      ? null
      : typeof entry.detail === "string"
        ? entry.detail
        : JSON.stringify(entry.detail);
  const record: MediaAuditEntry = {
    id: cuid(),
    adminUser: entry.adminUser ?? null,
    action: entry.action,
    mediaId: entry.mediaId ?? null,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    detail,
    createdAt: new Date().toISOString(),
  };
  auditOverlay.unshift(record);
  if (auditOverlay.length > 2000) auditOverlay.length = 2000;
  try {
    await prisma.mediaAuditLog.create({
      data: {
        adminUser: record.adminUser,
        action: record.action,
        mediaId: record.mediaId,
        entityType: record.entityType,
        entityId: record.entityId,
        detail: record.detail,
      },
    });
  } catch {
    // overlay holds it
  }
}

export async function getMediaAudit(mediaId: string): Promise<MediaAuditEntry[]> {
  try {
    const rows = await prisma.mediaAuditLog.findMany({
      where: { mediaId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    if (rows.length || dbAvailable) {
      return rows.map((r) => ({
        id: r.id,
        adminUser: r.adminUser ?? null,
        action: r.action,
        mediaId: r.mediaId ?? null,
        entityType: r.entityType ?? null,
        entityId: r.entityId ?? null,
        detail: r.detail ?? null,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }));
    }
  } catch {
    // fall through
  }
  return auditOverlay.filter((a) => a.mediaId === mediaId);
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function listMedia(filter: MediaFilter = {}): Promise<Media[]> {
  try {
    const where: Record<string, unknown> = {};
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.mediaType) where.mediaType = filter.mediaType;
    if (filter.mediaTypes?.length) where.mediaType = { in: filter.mediaTypes };
    if (filter.status) where.status = filter.status;
    if (filter.unattached) where.entityId = null;
    if (filter.search?.trim()) {
      const s = filter.search.trim();
      where.OR = [
        { originalFilename: { contains: s, mode: "insensitive" } },
        { altText: { contains: s, mode: "insensitive" } },
        { caption: { contains: s, mode: "insensitive" } },
        { entityId: { contains: s, mode: "insensitive" } },
        { originalUrl: { contains: s, mode: "insensitive" } },
      ];
    }
    const rows = await prisma.media.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    dbAvailable = true;
    return rows.map((r) => mapRow(r as Row));
  } catch {
    dbAvailable = false;
    return applyOverlayFilter(filter);
  }
}

function applyOverlayFilter(filter: MediaFilter): Media[] {
  let items = [...overlay.values()];
  if (filter.entityType) items = items.filter((m) => m.entityType === filter.entityType);
  if (filter.entityId) items = items.filter((m) => m.entityId === filter.entityId);
  if (filter.mediaType) items = items.filter((m) => m.mediaType === filter.mediaType);
  if (filter.mediaTypes?.length) items = items.filter((m) => filter.mediaTypes!.includes(m.mediaType));
  if (filter.status) items = items.filter((m) => m.status === filter.status);
  if (filter.unattached) items = items.filter((m) => !m.entityId);
  if (filter.search?.trim()) {
    const s = filter.search.trim().toLowerCase();
    items = items.filter((m) =>
      [m.originalFilename, m.altText, m.caption, m.entityId, m.originalUrl]
        .some((v) => v?.toLowerCase().includes(s))
    );
  }
  return items.sort(
    (a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt)
  );
}

export async function getMedia(id: string): Promise<Media | null> {
  try {
    const row = await prisma.media.findUnique({ where: { id } });
    if (row) return mapRow(row as Row);
  } catch {
    // ignore
  }
  return overlay.get(id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export async function createMedia(
  input: CreateMediaInput,
  adminUser?: string | null
): Promise<Media> {
  const now = new Date().toISOString();
  const entityType = input.entityType ?? "GENERAL";
  const media: Media = {
    id: cuid(),
    url: input.url,
    storageKey: input.storageKey ?? null,
    originalUrl: input.originalUrl ?? null,
    originalFilename: input.originalFilename ?? null,
    mimeType: input.mimeType ?? null,
    fileSize: input.fileSize ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    mediaType: input.mediaType ?? "GENERAL",
    entityType,
    entityId: input.entityId ?? null,
    altText: input.altText ?? null,
    caption: input.caption ?? null,
    sortOrder: input.sortOrder ?? Date.now() % 100000,
    isPrimary: input.isPrimary ?? false,
    status: input.status ?? "unpublished",
    uploadedBy: adminUser ?? input.uploadedBy ?? null,
    createdAt: now,
    updatedAt: now,
  };

  let created = media;
  try {
    const { id: _omit, createdAt: _c, updatedAt: _u, ...data } = media;
    void _omit;
    void _c;
    void _u;
    const row = await prisma.media.create({ data });
    created = mapRow(row as Row);
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    overlay.set(media.id, media);
  }

  if (created.isPrimary) await enforceSinglePrimary(created);
  await logMediaAudit({
    adminUser,
    action: "create",
    mediaId: created.id,
    entityType: created.entityType,
    entityId: created.entityId,
    detail: { mediaType: created.mediaType, source: created.originalUrl ? "url" : "upload" },
  });
  return created;
}

export async function updateMedia(
  id: string,
  patch: MediaPatch,
  adminUser?: string | null
): Promise<Media | null> {
  const current = await getMedia(id);
  if (!current) return null;
  const merged: Media = { ...current, ...patch, id, updatedAt: new Date().toISOString() };

  try {
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(patch) as (keyof MediaPatch)[]) {
      data[key] = patch[key];
    }
    if (Object.keys(data).length) {
      const row = await prisma.media.update({ where: { id }, data });
      Object.assign(merged, mapRow(row as Row));
      dbAvailable = true;
    }
  } catch {
    dbAvailable = false;
  }
  overlay.set(id, merged);

  if (patch.isPrimary) await enforceSinglePrimary(merged);
  await logMediaAudit({
    adminUser,
    action: patch.status ? (patch.status === "published" ? "publish" : "unpublish") : "update",
    mediaId: id,
    entityType: merged.entityType,
    entityId: merged.entityId,
    detail: patch,
  });
  return merged;
}

/** Ensure only one primary per (entityType, entityId, primary-group). */
async function enforceSinglePrimary(media: Media): Promise<void> {
  if (!media.entityId) return;
  const siblings = await listMedia({
    entityType: media.entityType,
    entityId: media.entityId,
  });
  // Group: product primary, or supplier logo, or supplier cover.
  const group = primaryGroupFor(media.mediaType);
  for (const s of siblings) {
    if (s.id === media.id) continue;
    if (primaryGroupFor(s.mediaType) === group && s.isPrimary) {
      await rawSetPrimary(s.id, false);
    }
  }
}

function primaryGroupFor(t: MediaType): string {
  if (t === "PRODUCT_PRIMARY" || t === "PRODUCT_GALLERY") return "product";
  if (t === "SUPPLIER_LOGO") return "logo";
  if (t === "SUPPLIER_COVER") return "cover";
  return t;
}

async function rawSetPrimary(id: string, value: boolean): Promise<void> {
  const m = overlay.get(id);
  if (m) overlay.set(id, { ...m, isPrimary: value });
  try {
    await prisma.media.update({ where: { id }, data: { isPrimary: value } });
  } catch {
    // overlay only
  }
}

export async function deleteMedia(id: string, adminUser?: string | null): Promise<boolean> {
  const current = await getMedia(id);
  if (!current) return false;

  // Best-effort remote object cleanup (no-op in passthrough mode).
  if (current.storageKey) await deleteFromStorage(current.storageKey).catch(() => false);

  overlay.delete(id);
  try {
    await prisma.media.delete({ where: { id } });
  } catch {
    // overlay deletion is enough when no DB
  }

  // If a published product primary was removed, promote the next valid image.
  if (current.isPrimary && current.entityId && current.entityType === "PRODUCT") {
    const rest = (await listMedia({ entityType: "PRODUCT", entityId: current.entityId }))
      .filter((m) => m.id !== id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const next = rest[0];
    if (next) {
      await updateMedia(next.id, { isPrimary: true, mediaType: "PRODUCT_PRIMARY" }, adminUser);
    }
  }

  await logMediaAudit({
    adminUser,
    action: "delete",
    mediaId: id,
    entityType: current.entityType,
    entityId: current.entityId,
    detail: { mediaType: current.mediaType },
  });
  return true;
}

export async function reorderMedia(
  ids: string[],
  adminUser?: string | null
): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const m = overlay.get(id);
    if (m) overlay.set(id, { ...m, sortOrder: i });
    try {
      await prisma.media.update({ where: { id }, data: { sortOrder: i } });
    } catch {
      // overlay
    }
  }
  await logMediaAudit({ adminUser, action: "reorder", detail: { ids } });
}

export type BulkAction =
  | { type: "delete" }
  | { type: "publish" }
  | { type: "unpublish" }
  | { type: "setType"; mediaType: MediaType }
  | { type: "attach"; entityType: EntityType; entityId: string };

export async function bulkMedia(
  ids: string[],
  action: BulkAction,
  adminUser?: string | null
): Promise<number> {
  let count = 0;
  for (const id of ids) {
    if (action.type === "delete") {
      if (await deleteMedia(id, adminUser)) count++;
    } else if (action.type === "publish" || action.type === "unpublish") {
      const r = await updateMedia(id, { status: action.type === "publish" ? "published" : "unpublished" }, adminUser);
      if (r) count++;
    } else if (action.type === "setType") {
      const r = await updateMedia(id, { mediaType: action.mediaType }, adminUser);
      if (r) count++;
    } else if (action.type === "attach") {
      const r = await updateMedia(id, { entityType: action.entityType, entityId: action.entityId }, adminUser);
      if (r) count++;
    }
  }
  await logMediaAudit({ adminUser, action: "bulk", detail: { action: action.type, count } });
  return count;
}

/**
 * Replace the underlying asset of a media row in place (keeps id, entity,
 * captions, alt). The previous original URL is recorded in the audit log so the
 * change is traceable; the old storage object is removed.
 */
export async function replaceMediaAsset(
  id: string,
  next: { url: string; storageKey: string | null; originalUrl?: string | null; mimeType?: string | null; fileSize?: number | null; originalFilename?: string | null },
  adminUser?: string | null
): Promise<Media | null> {
  const current = await getMedia(id);
  if (!current) return null;
  if (current.storageKey && current.storageKey !== next.storageKey) {
    await deleteFromStorage(current.storageKey).catch(() => false);
  }
  const merged: Media = {
    ...current,
    url: next.url,
    storageKey: next.storageKey,
    originalUrl: next.originalUrl ?? current.originalUrl,
    mimeType: next.mimeType ?? current.mimeType,
    fileSize: next.fileSize ?? current.fileSize,
    originalFilename: next.originalFilename ?? current.originalFilename,
    updatedAt: new Date().toISOString(),
  };
  overlay.set(id, merged);
  try {
    await prisma.media.update({
      where: { id },
      data: {
        url: merged.url,
        storageKey: merged.storageKey,
        originalUrl: merged.originalUrl,
        mimeType: merged.mimeType,
        fileSize: merged.fileSize,
        originalFilename: merged.originalFilename,
      },
    });
  } catch {
    // overlay
  }
  await logMediaAudit({
    adminUser,
    action: "replace",
    mediaId: id,
    entityType: merged.entityType,
    entityId: merged.entityId,
    detail: { previousUrl: current.originalUrl ?? current.url },
  });
  return merged;
}

/* ------------------------------------------------------------------ */
/* Public resolver (published-only)                                    */
/* ------------------------------------------------------------------ */

export type SupplierMedia = {
  logo: Media | null;
  cover: Media | null;
  factory: Media[];
  gallery: Media[];
  all: Media[];
};

/** PUBLISHED media for a supplier, grouped by role. Empty groups when none. */
export async function getPublishedSupplierMedia(supplierId: string): Promise<SupplierMedia> {
  const all = (await listMedia({ entityType: "SUPPLIER", entityId: supplierId, status: "published" }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
  return {
    logo: all.find((m) => m.mediaType === "SUPPLIER_LOGO") ?? null,
    cover: all.find((m) => m.mediaType === "SUPPLIER_COVER") ?? null,
    factory: all.filter((m) => m.mediaType === "SUPPLIER_FACTORY"),
    gallery: all.filter((m) => m.mediaType === "SUPPLIER_GALLERY"),
    all,
  };
}

/** PUBLISHED product image URLs (primary first). Empty when none. */
export async function getPublishedProductImages(productId: string): Promise<string[]> {
  const all = (await listMedia({ entityType: "PRODUCT", entityId: productId, status: "published" }))
    .filter((m) => m.mediaType === "PRODUCT_PRIMARY" || m.mediaType === "PRODUCT_GALLERY")
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
  return all.map((m) => m.url);
}

/** PUBLISHED certification image for a certification entity. */
export async function getPublishedCertificationMedia(certId: string): Promise<Media | null> {
  const all = await listMedia({ entityType: "CERTIFICATION", entityId: certId, status: "published" });
  return all[0] ?? null;
}
