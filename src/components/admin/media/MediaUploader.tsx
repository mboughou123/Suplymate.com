"use client";

import { useRef, useState } from "react";
import { UploadCloud, Link2, Loader2, X, AlertCircle } from "lucide-react";
import type { Media, MediaType, EntityType, MediaStatus } from "@/lib/media-types";
import { uploadFiles, importUrl, type UploadResponse } from "./mediaApi";

type Props = {
  entityType: EntityType;
  entityId?: string | null;
  mediaType: MediaType;
  defaultStatus?: MediaStatus;
  onUploaded: (media: Media[]) => void;
  onStorageInfo?: (info: NonNullable<UploadResponse["storage"]>) => void;
  compact?: boolean;
};

const MAX_BYTES = 12 * 1024 * 1024;

function clientAccept(mediaType: MediaType): string {
  const base = "image/jpeg,image/png,image/webp,image/gif,image/avif";
  return mediaType === "SUPPLIER_LOGO" ? `${base},image/svg+xml` : base;
}

function validateClientSide(file: File, mediaType: MediaType): string | null {
  const okTypes = clientAccept(mediaType).split(",");
  const isSvg = file.type === "image/svg+xml";
  if (isSvg && mediaType !== "SUPPLIER_LOGO") return "SVG is only allowed for logos.";
  if (!okTypes.includes(file.type) && file.type !== "") {
    return `Unsupported type: ${file.type || "unknown"}.`;
  }
  if (file.size > MAX_BYTES) return "File exceeds the 12 MB limit.";
  if (file.size === 0) return "File is empty.";
  return null;
}

export default function MediaUploader({
  entityType,
  entityId,
  mediaType,
  defaultStatus = "unpublished",
  onUploaded,
  onStorageInfo,
  compact,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setError(null);

    const valid: File[] = [];
    for (const f of files) {
      const err = validateClientSide(f, mediaType);
      if (err) {
        setError(`${f.name}: ${err}`);
      } else {
        valid.push(f);
      }
    }
    if (valid.length === 0) return;

    setProgress(0);
    try {
      const res = await uploadFiles(
        valid,
        { entityType, entityId, mediaType, status: defaultStatus },
        (pct) => setProgress(pct)
      );
      if (res.errors?.length) setError(res.errors.join(" "));
      if (res.storage && onStorageInfo) onStorageInfo(res.storage);
      if (res.media.length) onUploaded(res.media);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleUrlImport() {
    const url = urlValue.trim();
    if (!url) return;
    setUrlBusy(true);
    setError(null);
    try {
      const media = await importUrl(url, { entityType, entityId, mediaType, status: defaultStatus });
      onUploaded([media]);
      setUrlValue("");
      setShowUrl(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUrlBusy(false);
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
          compact ? "px-4 py-5" : "px-6 py-8"
        } ${dragging ? "border-cyan bg-cyan/5" : "border-slate-300 bg-slate-50/60"}`}
      >
        {progress !== null ? (
          <div className="w-full max-w-xs text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-cyan" />
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-cyan transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">Uploading… {progress}%</p>
          </div>
        ) : (
          <>
            <UploadCloud className="h-7 w-7 text-cyan" aria-hidden />
            <p className="mt-2 text-center text-sm font-medium text-ink">
              Drag &amp; drop, or{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-semibold text-cyan hover:underline"
              >
                browse
              </button>
            </p>
            <p className="mt-0.5 text-center text-[11px] text-ink-dim">
              JPG, PNG, WebP, GIF, AVIF{mediaType === "SUPPLIER_LOGO" ? " or SVG" : ""} · max 12 MB
            </p>
            <button
              type="button"
              onClick={() => setShowUrl((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-cyan"
            >
              <Link2 className="h-3.5 w-3.5" /> Import from URL
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={clientAccept(mediaType)}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {showUrl && (
        <div className="mt-2 flex gap-2">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan focus:outline-none"
          />
          <button
            onClick={handleUrlImport}
            disabled={urlBusy || !urlValue.trim()}
            className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-sm disabled:opacity-40"
          >
            {urlBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Import
          </button>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
