"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import type { SupplierPhotoKind } from "@/lib/uploads";

/** Keeps uploads well under Vercel's 4.5 MB request limit. */
const CLIENT_MAX_EDGE = 2400;
const CLIENT_SHRINK_ABOVE_BYTES = 2.5 * 1024 * 1024;

async function shrinkForUpload(file: File): Promise<Blob> {
  if (file.size <= CLIENT_SHRINK_ABOVE_BYTES || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, CLIENT_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    return blob ?? file;
  } catch {
    return file;
  }
}

type Props = {
  kind: SupplierPhotoKind;
  label: string;
  uploadingLabel: string;
  multiple?: boolean;
  disabled?: boolean;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
};

export default function PhotoUploadButton({
  kind,
  label,
  uploadingLabel,
  multiple = false,
  disabled = false,
  onUploaded,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("kind", kind);
        body.set("file", await shrinkForUpload(file), file.name);
        const res = await fetch("/api/supplier/photos", { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          onError(data.error ?? "Upload failed. Please try again.");
          break;
        }
        onUploaded(data.url);
      }
    } catch {
      onError("Network error. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => upload(e.target.files)}
      />
      <button
        type="button"
        disabled={busy || disabled}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-cyan hover:text-cyan disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
        {busy ? uploadingLabel : label}
      </button>
    </>
  );
}
