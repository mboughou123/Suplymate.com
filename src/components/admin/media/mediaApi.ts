"use client";

import type {
  Media,
  MediaAuditEntry,
  MediaType,
  EntityType,
  MediaStatus,
} from "@/lib/media-types";

const BASE = "/api/admin/media";

async function asJson(res: Response) {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status}).`);
  return data;
}

export type ListParams = {
  entityType?: EntityType;
  entityId?: string;
  mediaType?: MediaType;
  mediaTypes?: MediaType[];
  status?: MediaStatus;
  search?: string;
  unattached?: boolean;
};

export async function listMediaApi(params: ListParams = {}): Promise<Media[]> {
  const q = new URLSearchParams();
  if (params.entityType) q.set("entityType", params.entityType);
  if (params.entityId) q.set("entityId", params.entityId);
  if (params.mediaType) q.set("mediaType", params.mediaType);
  if (params.mediaTypes?.length) q.set("mediaTypes", params.mediaTypes.join(","));
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  if (params.unattached) q.set("unattached", "1");
  const data = await asJson(await fetch(`${BASE}?${q.toString()}`, { cache: "no-store" }));
  return data.media as Media[];
}

export type UploadMeta = {
  entityType: EntityType;
  entityId?: string | null;
  mediaType: MediaType;
  altText?: string;
  caption?: string;
  status?: MediaStatus;
};

export type UploadResponse = {
  media: Media[];
  errors: string[];
  storage?: { provider: string; configured: boolean; recommendation?: string };
};

/** Upload one or more files via XHR so we get progress events. */
export function uploadFiles(
  files: File[] | Blob[],
  meta: UploadMeta,
  onProgress?: (pct: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    files.forEach((f, i) => {
      const name = f instanceof File ? f.name : `upload-${i}.png`;
      form.append("file", f, name);
    });
    form.append("entityType", meta.entityType);
    if (meta.entityId) form.append("entityId", meta.entityId);
    form.append("mediaType", meta.mediaType);
    if (meta.altText) form.append("altText", meta.altText);
    if (meta.caption) form.append("caption", meta.caption);
    if (meta.status) form.append("status", meta.status);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: UploadResponse | { error?: string } | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // ignore
      }
      if (xhr.status >= 200 && xhr.status < 300 && data && "media" in data) {
        resolve(data as UploadResponse);
      } else {
        reject(new Error((data as { error?: string })?.error ?? `Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}

export async function importUrl(url: string, meta: UploadMeta): Promise<Media> {
  const data = await asJson(
    await fetch(`${BASE}/import-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, ...meta }),
    })
  );
  return data.media as Media;
}

export async function updateMediaApi(id: string, patch: Partial<Media>): Promise<Media> {
  const data = await asJson(
    await fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
  );
  return data.media as Media;
}

export async function deleteMediaApi(id: string): Promise<void> {
  await asJson(await fetch(`${BASE}/${id}`, { method: "DELETE" }));
}

export async function publishMediaApi(id: string, publish: boolean): Promise<Media> {
  const data = await asJson(
    await fetch(`${BASE}/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish }),
    })
  );
  return data.media as Media;
}

export async function reorderMediaApi(ids: string[]): Promise<void> {
  await asJson(
    await fetch(`${BASE}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
  );
}

export async function getMediaDetailApi(id: string): Promise<{ media: Media; audit: MediaAuditEntry[] }> {
  return asJson(await fetch(`${BASE}/${id}`, { cache: "no-store" }));
}

export type BulkPayload = {
  ids: string[];
  action: "delete" | "publish" | "unpublish" | "setType" | "attach";
  mediaType?: MediaType;
  entityType?: EntityType;
  entityId?: string;
};

export async function bulkMediaApi(payload: BulkPayload): Promise<number> {
  const data = await asJson(
    await fetch(`${BASE}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
  return data.count as number;
}

export async function replaceMediaFile(id: string, file: File | Blob): Promise<Media> {
  const form = new FormData();
  form.append("file", file, file instanceof File ? file.name : "replacement.png");
  const data = await asJson(await fetch(`${BASE}/${id}/replace`, { method: "POST", body: form }));
  return data.media as Media;
}

export async function replaceMediaUrl(id: string, url: string): Promise<Media> {
  const data = await asJson(
    await fetch(`${BASE}/${id}/replace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
  );
  return data.media as Media;
}
