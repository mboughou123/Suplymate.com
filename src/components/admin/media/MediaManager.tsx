"use client";

import { useEffect, useRef, useState } from "react";
import {
  Star,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Loader2,
  GripVertical,
  Crop,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import {
  type Media,
  type MediaType,
  type EntityType,
  MEDIA_TYPE_LABELS,
} from "@/lib/media-types";
import {
  listMediaApi,
  updateMediaApi,
  deleteMediaApi,
  publishMediaApi,
  reorderMediaApi,
  replaceMediaFile,
  uploadFiles,
} from "./mediaApi";
import MediaUploader from "./MediaUploader";
import ImageEditorModal from "./ImageEditorModal";

type Props = {
  entityType: EntityType;
  entityId: string;
  /** Media types selectable for this entity. */
  allowedTypes: MediaType[];
  /** Default media type for new uploads. */
  defaultType: MediaType;
  title?: string;
  description?: string;
};

export default function MediaManager({
  entityType,
  entityId,
  allowedTypes,
  defaultType,
  title = "Manage images",
  description,
}: Props) {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorFor, setEditorFor] = useState<Media | null>(null);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    listMediaApi({ entityType, entityId })
      .then((m) => active && setItems(m))
      .catch((e) => active && setError((e as Error).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  function upsert(media: Media) {
    setItems((prev) => {
      const i = prev.findIndex((m) => m.id === media.id);
      if (i === -1) return [...prev, media];
      const next = [...prev];
      next[i] = media;
      return next;
    });
  }

  async function withBusy<T>(id: string, fn: () => Promise<T>): Promise<T | null> {
    setBusyId(id);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublish(m: Media) {
    const updated = await withBusy(m.id, () => publishMediaApi(m.id, m.status !== "published"));
    if (updated) upsert(updated);
  }

  async function setPrimary(m: Media) {
    const updated = await withBusy(m.id, () => updateMediaApi(m.id, { isPrimary: true }));
    if (updated) {
      // Server unsets siblings; reflect locally.
      setItems((prev) =>
        prev.map((x) =>
          x.id === m.id ? updated : sameGroup(x, m) ? { ...x, isPrimary: false } : x
        )
      );
    }
  }

  async function remove(m: Media) {
    if (!confirm("Delete this image? This cannot be undone.")) return;
    const ok = await withBusy(m.id, async () => {
      await deleteMediaApi(m.id);
      return true;
    });
    if (ok) setItems((prev) => prev.filter((x) => x.id !== m.id));
  }

  async function saveMeta(id: string, patch: Partial<Media>) {
    const updated = await withBusy(id, () => updateMediaApi(id, patch));
    if (updated) {
      upsert(updated);
      setEditingId(null);
    }
  }

  async function commitReorder(next: Media[]) {
    setItems(next);
    try {
      await reorderMediaApi(next.map((m) => m.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commitReorder(next);
  }

  async function handleEditorSave(blob: Blob, mode: "replace" | "new") {
    if (!editorFor) return;
    const m = editorFor;
    const file = new File([blob], (m.originalFilename ?? "edited") + ".webp", { type: "image/webp" });
    if (mode === "replace") {
      const updated = await replaceMediaFile(m.id, file);
      upsert(updated);
    } else {
      const res = await uploadFiles([file], {
        entityType,
        entityId,
        mediaType: m.mediaType,
        altText: m.altText ?? undefined,
        caption: m.caption ?? undefined,
        status: m.status,
      });
      if (res.media.length) setItems((prev) => [...prev, ...res.media]);
    }
    setEditorFor(null);
  }

  return (
    <div>
      <div className="mb-3">
        <h4 className="text-sm font-bold text-ink">{title}</h4>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>

      <MediaUploader
        entityType={entityType}
        entityId={entityId}
        mediaType={defaultType}
        defaultStatus="published"
        onUploaded={(media) => setItems((prev) => [...prev, ...media])}
        compact
      />

      {error && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading images…
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-ink-muted">
            No images yet. Upload or import above.
          </p>
        ) : (
          items.map((m, i) => {
            const busy = busyId === m.id;
            const editing = editingId === m.id;
            return (
              <div
                key={m.id}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex.current === null || dragIndex.current === i) return;
                  const next = [...items];
                  const [moved] = next.splice(dragIndex.current, 1);
                  next.splice(i, 0, moved);
                  dragIndex.current = null;
                  commitReorder(next);
                }}
                className="rounded-xl border border-slate-200 bg-white p-2.5"
              >
                <div className="flex gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1 text-ink-dim">
                    <GripVertical className="h-4 w-4 cursor-grab" aria-hidden />
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-xs disabled:opacity-30" aria-label="Move up">
                      ▲
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-xs disabled:opacity-30" aria-label="Move down">
                      ▼
                    </button>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={m.altText ?? ""}
                    className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {MEDIA_TYPE_LABELS[m.mediaType]}
                      </span>
                      {m.isPrimary && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Primary
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          m.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-muted" title={m.originalFilename ?? m.url}>
                      {m.originalFilename ?? m.url}
                    </p>

                    {editing ? (
                      <EditFields
                        media={m}
                        allowedTypes={allowedTypes}
                        busy={busy}
                        onCancel={() => setEditingId(null)}
                        onSave={(patch) => saveMeta(m.id, patch)}
                      />
                    ) : (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <ActionBtn label={m.status === "published" ? "Unpublish" : "Publish"} onClick={() => togglePublish(m)} busy={busy}>
                          {m.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </ActionBtn>
                        {!m.isPrimary && (
                          <ActionBtn label="Make primary" onClick={() => setPrimary(m)} busy={busy}>
                            <Star className="h-3.5 w-3.5" />
                          </ActionBtn>
                        )}
                        <ActionBtn label="Edit" onClick={() => setEditingId(m.id)} busy={busy}>
                          <Pencil className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn label="Crop / rotate" onClick={() => setEditorFor(m)} busy={busy}>
                          <Crop className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn label="Delete" onClick={() => remove(m)} busy={busy} danger>
                          <Trash2 className="h-3.5 w-3.5" />
                        </ActionBtn>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editorFor && (
        <ImageEditorModal
          src={editorFor.url}
          allowSaveAsNew={editorFor.mediaType !== "SUPPLIER_LOGO"}
          onCancel={() => setEditorFor(null)}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
}

function sameGroup(a: Media, b: Media): boolean {
  const grp = (t: MediaType) =>
    t === "PRODUCT_PRIMARY" || t === "PRODUCT_GALLERY"
      ? "product"
      : t === "SUPPLIER_LOGO"
        ? "logo"
        : t === "SUPPLIER_COVER"
          ? "cover"
          : t;
  return a.entityId === b.entityId && grp(a.mediaType) === grp(b.mediaType);
}

function ActionBtn({
  children,
  label,
  onClick,
  busy,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  busy?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
        danger
          ? "border-slate-200 text-ink-muted hover:border-rose-200 hover:text-rose-600"
          : "border-slate-200 text-ink-muted hover:border-cyan/40 hover:text-cyan"
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function EditFields({
  media,
  allowedTypes,
  busy,
  onSave,
  onCancel,
}: {
  media: Media;
  allowedTypes: MediaType[];
  busy: boolean;
  onSave: (patch: Partial<Media>) => void;
  onCancel: () => void;
}) {
  const [altText, setAltText] = useState(media.altText ?? "");
  const [caption, setCaption] = useState(media.caption ?? "");
  const [originalUrl, setOriginalUrl] = useState(media.originalUrl ?? "");
  const [mediaType, setMediaType] = useState<MediaType>(media.mediaType);

  return (
    <div className="mt-2 grid gap-2">
      <select
        value={mediaType}
        onChange={(e) => setMediaType(e.target.value as MediaType)}
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none"
      >
        {allowedTypes.map((t) => (
          <option key={t} value={t}>
            {MEDIA_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <input
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        placeholder="Alt text"
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none"
      />
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption"
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none"
      />
      <input
        value={originalUrl}
        onChange={(e) => setOriginalUrl(e.target.value)}
        placeholder="Source URL (attribution)"
        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none"
      />
      <div className="flex gap-1.5">
        <button
          onClick={() => onSave({ altText, caption, originalUrl: originalUrl || null, mediaType })}
          disabled={busy}
          className="btn-primary inline-flex items-center gap-1 px-2.5 py-1.5 text-xs disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}
