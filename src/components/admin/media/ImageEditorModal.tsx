"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Loader2,
  Save,
  Copy,
} from "lucide-react";
import { ASPECT_PRESETS } from "@/lib/media-types";

type Props = {
  /** Source image URL (must be same-origin or CORS-enabled to export). */
  src: string;
  /** Called with the edited image as a Blob plus whether to replace or save-new. */
  onSave: (blob: Blob, mode: "replace" | "new") => Promise<void> | void;
  onCancel: () => void;
  /** When false, hides the "save as new" option (e.g. for logos). */
  allowSaveAsNew?: boolean;
};

const OUTPUT_MAX = 1600; // px — cap the longest edge to avoid huge files.

export default function ImageEditorModal({ src, onSave, onCancel, allowSaveAsNew = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rotation, setRotation] = useState(0); // degrees, multiples of 90
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [aspect, setAspect] = useState<number | null>(null); // null = original
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // -1..1
  const [offsetY, setOffsetY] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the source image (crossOrigin so canvas export isn't tainted).
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
    };
    img.onerror = () => setLoadError(true);
    img.src = src;
  }, [src]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Effective source dimensions after rotation.
    const rotated = rotation % 180 !== 0;
    const srcW = rotated ? img.naturalHeight : img.naturalWidth;
    const srcH = rotated ? img.naturalWidth : img.naturalHeight;

    // Output canvas dimensions based on aspect ratio.
    let outW = srcW;
    let outH = srcH;
    if (aspect) {
      if (srcW / srcH > aspect) {
        outH = srcH;
        outW = Math.round(srcH * aspect);
      } else {
        outW = srcW;
        outH = Math.round(srcW / aspect);
      }
    }
    // Cap output size.
    const longest = Math.max(outW, outH);
    const scale = longest > OUTPUT_MAX ? OUTPUT_MAX / longest : 1;
    outW = Math.max(1, Math.round(outW * scale));
    outH = Math.max(1, Math.round(outH * scale));
    canvas.width = outW;
    canvas.height = outH;

    ctx.clearRect(0, 0, outW, outH);
    ctx.save();
    // Move to center, apply zoom + offset, rotation and flip.
    ctx.translate(outW / 2 + (offsetX * outW) / 2, outH / 2 + (offsetY * outH) / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -zoom : zoom, flipV ? -zoom : zoom);

    // Draw the image covering the rotated content box.
    const drawW = rotated ? img.naturalHeight : img.naturalWidth;
    const drawH = rotated ? img.naturalWidth : img.naturalHeight;
    // Scale the image so it covers the output box (object-fit: cover).
    const coverScale = Math.max(outW / drawW, outH / drawH);
    const w = (rotated ? img.naturalWidth : img.naturalWidth) * 1;
    const h = (rotated ? img.naturalHeight : img.naturalHeight) * 1;
    void w;
    void h;
    ctx.drawImage(
      img,
      (-img.naturalWidth * coverScale) / 2,
      (-img.naturalHeight * coverScale) / 2,
      img.naturalWidth * coverScale,
      img.naturalHeight * coverScale
    );
    ctx.restore();
  }, [rotation, flipH, flipV, aspect, zoom, offsetX, offsetY]);

  useEffect(() => {
    if (loaded) draw();
  }, [loaded, draw]);

  async function exportBlob(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const type = "image/webp";
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, 0.9));
  }

  async function handleSave(mode: "replace" | "new") {
    setBusy(true);
    setError(null);
    try {
      const blob = await exportBlob();
      if (!blob) {
        setError("Could not export the edited image (the source may block cross-origin export).");
        return;
      }
      await onSave(blob, mode);
    } catch (e) {
      setError((e as Error).message ?? "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-bold text-ink">Edit image</h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-ink-muted hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-auto p-5 sm:grid-cols-[1fr_240px]">
          {/* Preview */}
          <div className="flex min-h-[280px] items-center justify-center rounded-xl bg-slate-100 p-3">
            {loadError ? (
              <p className="max-w-xs text-center text-sm text-ink-muted">
                Couldn&apos;t load this image for editing. It may be a cross-origin source that blocks
                canvas export — use Replace with a fresh upload instead.
              </p>
            ) : !loaded ? (
              <Loader2 className="h-6 w-6 animate-spin text-cyan" />
            ) : (
              <canvas ref={canvasRef} className="max-h-[60vh] max-w-full rounded-lg object-contain shadow" />
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink">Aspect ratio</p>
              <div className="grid grid-cols-1 gap-1.5">
                {ASPECT_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setAspect(p.ratio)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      aspect === p.ratio
                        ? "border-cyan bg-cyan/10 text-cyan"
                        : "border-slate-200 text-ink-muted hover:border-cyan/40"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-ink">Transform</p>
              <div className="flex flex-wrap gap-1.5">
                <IconBtn label="Rotate left" onClick={() => setRotation((r) => (r - 90 + 360) % 360)}>
                  <RotateCcw className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Rotate right" onClick={() => setRotation((r) => (r + 90) % 360)}>
                  <RotateCw className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Flip horizontal" active={flipH} onClick={() => setFlipH((v) => !v)}>
                  <FlipHorizontal className="h-4 w-4" />
                </IconBtn>
                <IconBtn label="Flip vertical" active={flipV} onClick={() => setFlipV((v) => !v)}>
                  <FlipVertical className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>

            <label className="block text-xs font-semibold text-ink">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mt-1 w-full accent-cyan"
              />
            </label>
            <label className="block text-xs font-semibold text-ink">
              Horizontal
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
                className="mt-1 w-full accent-cyan"
              />
            </label>
            <label className="block text-xs font-semibold text-ink">
              Vertical
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
                className="mt-1 w-full accent-cyan"
              />
            </label>
            <button
              onClick={() => {
                setRotation(0);
                setFlipH(false);
                setFlipV(false);
                setAspect(null);
                setZoom(1);
                setOffsetX(0);
                setOffsetY(0);
              }}
              className="text-xs font-medium text-ink-muted hover:text-cyan"
            >
              Reset
            </button>
          </div>
        </div>

        {error && (
          <p className="mx-5 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-slate-50">
            Cancel
          </button>
          {allowSaveAsNew && (
            <button
              onClick={() => handleSave("new")}
              disabled={busy || !loaded || loadError}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/40 bg-white px-3 py-2 text-sm font-semibold text-cyan hover:bg-cyan/5 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Save as new
            </button>
          )}
          <button
            onClick={() => handleSave("replace")}
            disabled={busy || !loaded || loadError}
            className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save (replace)
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
        active ? "border-cyan bg-cyan/10 text-cyan" : "border-slate-200 text-ink-muted hover:border-cyan/40"
      }`}
    >
      {children}
    </button>
  );
}
