"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Loader2, Trash2, Upload } from "lucide-react";
import {
  AVATAR_ACCEPT,
  isAvatarErrorCode,
  validateAvatarFile,
  type AvatarErrorCode,
} from "@/lib/avatar";

type Status = "idle" | "uploading" | "removing";
type Notice = { kind: "error"; code: AvatarErrorCode | "avatarNetwork" } | { kind: "success"; key: "avatarUpdated" | "avatarRemoved" };

type UploadResult =
  | { ok: true; url: string }
  | { ok: false; code: AvatarErrorCode | "avatarNetwork" };

function uploadWithProgress(file: File, onProgress: (percent: number) => void): Promise<UploadResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/account/avatar");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const body = (xhr.response ?? null) as { url?: unknown; code?: unknown } | null;
      if (xhr.status >= 200 && xhr.status < 300 && typeof body?.url === "string") {
        resolve({ ok: true, url: body.url });
        return;
      }
      resolve({ ok: false, code: isAvatarErrorCode(body?.code) ? body.code : "avatarUploadFailed" });
    };
    xhr.onerror = () => resolve({ ok: false, code: "avatarNetwork" });
    const data = new FormData();
    data.append("file", file);
    xhr.send(data);
  });
}

export default function AvatarUpload({
  image,
  initials,
  onChange,
}: {
  image: string;
  initials: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const busy = status !== "idle";

  async function upload(file: File) {
    const invalid = validateAvatarFile(file);
    if (invalid) {
      setNotice({ kind: "error", code: invalid });
      return;
    }
    setNotice(null);
    setProgress(0);
    setStatus("uploading");
    const result = await uploadWithProgress(file, setProgress);
    setStatus("idle");
    if (!result.ok) {
      setNotice({ kind: "error", code: result.code });
      return;
    }
    onChange(result.url);
    setNotice({ kind: "success", key: "avatarUpdated" });
    router.refresh();
  }

  async function remove() {
    setNotice(null);
    setStatus("removing");
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) {
        setNotice({ kind: "error", code: "avatarRemoveFailed" });
        return;
      }
      onChange("");
      setNotice({ kind: "success", key: "avatarRemoved" });
      router.refresh();
    } catch {
      setNotice({ kind: "error", code: "avatarNetwork" });
    } finally {
      setStatus("idle");
    }
  }

  function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (file && !busy) void upload(file);
  }

  return (
    <div
      className={`mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-dashed p-3 transition-colors ${
        dragging ? "border-cyan bg-cyan-soft" : "border-transparent"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-lg font-bold text-white">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={t("avatarLabel")} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-navy/60">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink-muted">{t("avatarLabel")}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {status === "uploading"
              ? t("avatarUploading", { percent: progress })
              : image
                ? t("avatarChange")
                : t("avatarUpload")}
          </button>
          {image && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {status === "removing" ? t("avatarRemoving") : t("avatarRemove")}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-1 text-[11px] text-ink-dim">{dragging ? t("avatarDropHere") : t("avatarHint")}</p>
        {status === "uploading" && (
          <div
            className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="h-full bg-cyan transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {notice?.kind === "error" && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t(notice.code)}
          </p>
        )}
        {notice?.kind === "success" && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t(notice.key)}
          </p>
        )}
      </div>
    </div>
  );
}
