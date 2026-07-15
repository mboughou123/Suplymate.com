"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  Star,
  History,
  ExternalLink,
  Link2,
  Tag,
  AlertTriangle,
} from "lucide-react";
import {
  type Media,
  type MediaType,
  type EntityType,
  type MediaStatus,
  type MediaAuditEntry,
  MEDIA_TYPES,
  MEDIA_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
  ENTITY_TYPES,
} from "@/lib/media-types";
import MediaUploader from "@/components/admin/media/MediaUploader";
import {
  updateMediaApi,
  deleteMediaApi,
  publishMediaApi,
  bulkMediaApi,
  getMediaDetailApi,
} from "@/components/admin/media/mediaApi";

type StorageInfo = { provider: string; configured: boolean; recommendation?: string };

type Props = {
  initialMedia: Media[];
  storage: StorageInfo;
};

type StatusFilter = "all" | MediaStatus | "missing";

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

const STATUS_STYLE: Record<MediaStatus, string> = {
  published: "bg-emerald-50 text-emerald-700",
  unpublished: "bg-slate-100 text-slate-500",
  draft: "bg-amber-50 text-amber-700",
};

export default function MediaLibraryClient({ initialMedia, storage }: Props) {
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "">("");
  const [entityFilter, setEntityFilter] = useState<EntityType | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim();
    return media.filter((m) => {
      if (typeFilter && m.mediaType !== typeFilter) return false;
      if (entityFilter && m.entityType !== entityFilter) return false;
      if (statusFilter === "missing" && m.entityId) return false;
      if (statusFilter !== "all" && statusFilter !== "missing" && m.status !== statusFilter) return false;
      if (q) {
        const hay = [m.originalFilename, m.altText, m.caption, m.entityId, m.originalUrl, m.uploadedBy]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [media, search, typeFilter, entityFilter, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: media.length,
      published: media.filter((m) => m.status === "published").length,
      unpublished: media.filter((m) => m.status !== "published").length,
      missing: media.filter((m) => !m.entityId).length,
    };
  }, [media]);

  function upsert(m: Media) {
    setMedia((prev) => prev.map((x) => (x.id === m.id ? m : x)));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function doPublish(m: Media) {
    try {
      const updated = await publishMediaApi(m.id, m.status !== "published");
      upsert(updated);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doDelete(m: Media) {
    if (!confirm(`Delete "${m.originalFilename ?? "this image"}"? This cannot be undone.`)) return;
    try {
      await deleteMediaApi(m.id);
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
      if (detailId === m.id) setDetailId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runBulk(
    action: "delete" | "publish" | "unpublish" | "setType" | "attach",
    extra?: { mediaType?: MediaType; entityType?: EntityType; entityId?: string }
  ) {
    if (selected.size === 0) return;
    if (action === "delete" && !confirm(`Delete ${selected.size} selected image(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    setError(null);
    const ids = [...selected];
    try {
      await bulkMediaApi({ ids, action, ...extra });
      // Refresh affected rows from local state.
      if (action === "delete") {
        setMedia((prev) => prev.filter((m) => !selected.has(m.id)));
      } else {
        setMedia((prev) =>
          prev.map((m) => {
            if (!selected.has(m.id)) return m;
            if (action === "publish") return { ...m, status: "published" };
            if (action === "unpublish") return { ...m, status: "unpublished" };
            if (action === "setType" && extra?.mediaType) return { ...m, mediaType: extra.mediaType };
            if (action === "attach" && extra?.entityType)
              return { ...m, entityType: extra.entityType, entityId: extra.entityId ?? m.entityId };
            return m;
          })
        );
      }
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-navy-dark to-navy py-10 text-white">
        <div className="container-page">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Admin
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">Media library</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Every image across Suplymate — supplier logos, covers, factory &amp; gallery photos, product
            images, certifications and profiles. Upload, classify, edit, publish and attach. Unpublished
            media never appears on public pages.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1">{counts.total} total</span>
            <span className="rounded-full bg-white/10 px-3 py-1">{counts.published} published</span>
            <span className="rounded-full bg-white/10 px-3 py-1">{counts.unpublished} unpublished</span>
            <span className="rounded-full bg-white/10 px-3 py-1">{counts.missing} unattached</span>
          </div>
        </div>
      </div>

      <div className="container-page py-8">
        {!storage.configured && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">Storage provider not configured ({storage.provider}).</p>
              <p className="mt-0.5 text-amber-700">
                {storage.recommendation ??
                  "Uploads are kept as data URLs / original links until a provider is set."}{" "}
                Add <code className="rounded bg-amber-100 px-1">BLOB_READ_WRITE_TOKEN</code> in Vercel → Storage
                → Blob and in your local <code className="rounded bg-amber-100 px-1">.env</code> for real hosted uploads.
              </p>
            </div>
          </div>
        )}

        {/* Upload */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-bold text-ink">Upload to library</h2>
          <MediaUploader
            entityType="GENERAL"
            mediaType="GENERAL"
            defaultStatus="unpublished"
            onUploaded={(items) => setMedia((prev) => [...items, ...prev])}
          />
          <p className="mt-2 text-xs text-ink-dim">
            New uploads start unattached &amp; unpublished. Classify and attach them to a supplier, product or
            certification below or from the entity&apos;s &quot;Manage images&quot; panel.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <input
              type="search"
              placeholder="Search filename, alt, caption, entity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-cyan focus:outline-none"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as MediaType | "")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none">
            <option value="">All types</option>
            {MEDIA_TYPES.map((t) => (
              <option key={t} value={t}>
                {MEDIA_TYPE_LABELS[t]} ({t})
              </option>
            ))}
          </select>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value as EntityType | "")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none">
            <option value="">All entities</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none">
            <option value="all">Any status</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="draft">Draft</option>
            <option value="missing">Missing association</option>
          </select>
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
            <button onClick={() => setView("grid")} className={`rounded-md p-1.5 ${view === "grid" ? "bg-navy text-white" : "text-ink-muted"}`} aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView("list")} className={`rounded-md p-1.5 ${view === "list" ? "bg-navy text-white" : "text-ink-muted"}`} aria-label="List view">
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/5 px-4 py-2.5 text-sm">
            <span className="font-semibold text-ink">{selected.size} selected</span>
            <button onClick={() => setSelected(new Set())} className="text-ink-muted hover:underline">Clear</button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button onClick={() => runBulk("publish")} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
                <Eye className="h-3.5 w-3.5" /> Publish
              </button>
              <button onClick={() => runBulk("unpublish")} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-slate-50 disabled:opacity-40">
                <EyeOff className="h-3.5 w-3.5" /> Unpublish
              </button>
              <select
                onChange={(e) => {
                  if (e.target.value) runBulk("setType", { mediaType: e.target.value as MediaType });
                  e.target.value = "";
                }}
                defaultValue=""
                disabled={bulkBusy}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none"
              >
                <option value="" disabled>
                  Move to category…
                </option>
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEDIA_TYPE_LABELS[t]} ({t})
                  </option>
                ))}
              </select>
              <button onClick={() => runBulk("delete")} disabled={bulkBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40">
                {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}

        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-ink-muted">
            No media match these filters.
          </p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((m) => (
              <GridCard
                key={m.id}
                m={m}
                selected={selected.has(m.id)}
                onToggle={() => toggleSelect(m.id)}
                onOpen={() => setDetailId(m.id)}
                onPublish={() => doPublish(m)}
                onDelete={() => doDelete(m)}
              />
            ))}
          </div>
        ) : (
          <ListTable
            items={visible}
            selected={selected}
            onToggle={toggleSelect}
            onOpen={(id) => setDetailId(id)}
            onPublish={doPublish}
            onDelete={doDelete}
          />
        )}
      </div>

      {detailId && (
        <DetailsPanel
          media={media.find((m) => m.id === detailId)!}
          onClose={() => setDetailId(null)}
          onChange={upsert}
          onDelete={(m) => doDelete(m)}
        />
      )}
    </div>
  );
}

function GridCard({
  m,
  selected,
  onToggle,
  onOpen,
  onPublish,
  onDelete,
}: {
  m: Media;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`group overflow-hidden rounded-xl border bg-white shadow-card ${selected ? "border-cyan ring-1 ring-cyan/30" : "border-slate-200"}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="absolute left-2 top-2 z-10 h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
          aria-label="Select"
        />
        <button onClick={onOpen} className="block aspect-square w-full bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt={m.altText ?? ""} loading="lazy" className="h-full w-full object-cover" />
        </button>
        <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[m.status]}`}>
          {m.status}
        </span>
        {m.isPrimary && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
            <Star className="h-2.5 w-2.5 fill-white" /> Primary
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-xs font-semibold text-ink" title={m.originalFilename ?? m.url}>
          {m.originalFilename ?? "Untitled"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-ink-dim">
          {MEDIA_TYPE_LABELS[m.mediaType]} · {m.entityId ? `${ENTITY_TYPE_LABELS[m.entityType]}` : "Unattached"}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <button onClick={onPublish} title={m.status === "published" ? "Unpublish" : "Publish"} className="rounded-md border border-slate-200 p-1 text-ink-muted hover:border-cyan/40 hover:text-cyan">
            {m.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onOpen} title="Details" className="rounded-md border border-slate-200 p-1 text-ink-muted hover:border-cyan/40 hover:text-cyan">
            <History className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} title="Delete" className="ml-auto rounded-md border border-slate-200 p-1 text-ink-muted hover:border-rose-200 hover:text-rose-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ListTable({
  items,
  selected,
  onToggle,
  onOpen,
  onPublish,
  onDelete,
}: {
  items: Media[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onPublish: (m: Media) => void;
  onDelete: (m: Media) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs text-ink-dim">
          <tr>
            <th className="w-8 px-3 py-2"></th>
            <th className="px-3 py-2">Image</th>
            <th className="px-3 py-2">Filename</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Entity</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Size</th>
            <th className="px-3 py-2">Uploaded</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              <td className="px-3 py-2">
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => onToggle(m.id)} className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan" aria-label="Select" />
              </td>
              <td className="px-3 py-2">
                <button onClick={() => onOpen(m.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.altText ?? ""} loading="lazy" className="h-10 w-10 rounded-md border border-slate-200 object-cover" />
                </button>
              </td>
              <td className="max-w-[180px] truncate px-3 py-2 text-ink" title={m.originalFilename ?? ""}>{m.originalFilename ?? "—"}</td>
              <td className="px-3 py-2 text-ink-muted">{MEDIA_TYPE_LABELS[m.mediaType]}</td>
              <td className="px-3 py-2 text-ink-muted">{m.entityId ? `${ENTITY_TYPE_LABELS[m.entityType]}: ${m.entityId}` : "—"}</td>
              <td className="px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[m.status]}`}>{m.status}</span>
              </td>
              <td className="px-3 py-2 text-ink-dim">{formatBytes(m.fileSize)}</td>
              <td className="px-3 py-2 text-ink-dim">{formatDate(m.createdAt)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => onPublish(m)} className="rounded-md border border-slate-200 p-1 text-ink-muted hover:border-cyan/40 hover:text-cyan" title={m.status === "published" ? "Unpublish" : "Publish"}>
                    {m.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => onDelete(m)} className="rounded-md border border-slate-200 p-1 text-ink-muted hover:border-rose-200 hover:text-rose-600" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailsPanel({
  media,
  onClose,
  onChange,
  onDelete,
}: {
  media: Media;
  onClose: () => void;
  onChange: (m: Media) => void;
  onDelete: (m: Media) => void;
}) {
  const [audit, setAudit] = useState<MediaAuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [altText, setAltText] = useState(media.altText ?? "");
  const [caption, setCaption] = useState(media.caption ?? "");
  const [originalUrl, setOriginalUrl] = useState(media.originalUrl ?? "");
  const [mediaType, setMediaType] = useState<MediaType>(media.mediaType);
  const [entityType, setEntityType] = useState<EntityType>(media.entityType);
  const [entityId, setEntityId] = useState(media.entityId ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadingAudit(true);
    getMediaDetailApi(media.id)
      .then((d) => active && setAudit(d.audit))
      .catch(() => active && setAudit([]))
      .finally(() => active && setLoadingAudit(false));
    return () => {
      active = false;
    };
  }, [media.id]);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const updated = await updateMediaApi(media.id, {
        altText,
        caption,
        originalUrl: originalUrl || null,
        mediaType,
        entityType,
        entityId: entityId || null,
      });
      onChange(updated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-bold text-ink">Media details</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.url} alt={media.altText ?? ""} className="max-h-64 w-full object-contain" />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <Meta label="Filename" value={media.originalFilename ?? "—"} />
            <Meta label="Size" value={formatBytes(media.fileSize)} />
            <Meta label="Dimensions" value={media.width && media.height ? `${media.width}×${media.height}` : "—"} />
            <Meta label="MIME" value={media.mimeType ?? "—"} />
            <Meta label="Uploaded" value={formatDate(media.createdAt)} />
            <Meta label="Uploaded by" value={media.uploadedBy ?? "—"} />
          </dl>

          <div className="mt-3 space-y-1.5 text-xs">
            <a href={media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan hover:underline">
              <ExternalLink className="h-3 w-3" /> Storage URL
            </a>
            {media.originalUrl && (
              <a href={media.originalUrl} target="_blank" rel="noreferrer noopener nofollow" className="block truncate text-ink-dim hover:text-cyan">
                <Link2 className="mr-1 inline h-3 w-3" /> Source: {media.originalUrl}
              </a>
            )}
          </div>

          {/* Editable metadata */}
          <div className="mt-4 grid gap-2">
            <Field label="Media type">
              <select value={mediaType} onChange={(e) => setMediaType(e.target.value as MediaType)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none">
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEDIA_TYPE_LABELS[t]} ({t})
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Entity type">
                <select value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none">
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ENTITY_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Entity ID">
                <input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="supplier/product id" className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none" />
              </Field>
            </div>
            <Field label="Alt text">
              <input value={altText} onChange={(e) => setAltText(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none" />
            </Field>
            <Field label="Caption">
              <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none" />
            </Field>
            <Field label="Source URL (attribution)">
              <input value={originalUrl} onChange={(e) => setOriginalUrl(e.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-cyan focus:outline-none" />
            </Field>
          </div>

          {err && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}

          <div className="mt-3 flex items-center gap-2">
            <button onClick={save} disabled={saving} className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm disabled:opacity-40">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tag className="h-4 w-4" />} Save
            </button>
            <button onClick={() => onDelete(media)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>

          {/* Audit history */}
          <div className="mt-6">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-ink">
              <History className="h-3.5 w-3.5" /> Audit history
            </h4>
            {loadingAudit ? (
              <p className="mt-2 text-xs text-ink-dim">Loading…</p>
            ) : audit.length === 0 ? (
              <p className="mt-2 text-xs text-ink-dim">No history recorded.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {audit.map((a) => (
                  <li key={a.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{a.action}</span>
                      <span className="text-ink-dim">{formatDate(a.createdAt)}</span>
                    </div>
                    <p className="text-ink-dim">{a.adminUser ?? "system"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-dim">{label}</dt>
      <dd className="truncate font-medium text-ink" title={value}>{value}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-ink">
      {label}
      <div className="mt-1 font-normal">{children}</div>
    </label>
  );
}
