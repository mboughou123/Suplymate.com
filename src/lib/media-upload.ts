// Server-side validation + storage for uploaded files and imported URLs.
// Shared by the upload, import-url and replace API routes.

import { uploadBuffer, type StoredObject } from "@/lib/image-storage";
import {
  fetchRemoteImage,
  sanitizeSvg,
  RASTER_MIME,
  SVG_MIME,
  MAX_IMAGE_BYTES,
} from "@/lib/media-fetch";

// Magic-byte signatures so we reject files whose real content doesn't match a
// supported image type (fake extensions, executables, HTML disguised as PNG…).
function sniffMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // GIF
  if (buf.slice(0, 3).toString("ascii") === "GIF") return "image/gif";
  // WEBP (RIFF....WEBP)
  if (buf.slice(0, 4).toString("ascii") === "RIFF" && buf.slice(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  // AVIF / HEIF (ftyp box)
  if (buf.slice(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.slice(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
  }
  // SVG (text)
  const head = buf.slice(0, 512).toString("utf8").trim().toLowerCase();
  if (head.includes("<svg") || head.startsWith("<?xml")) return SVG_MIME;
  return null;
}

export type ProcessResult =
  | { ok: true; stored: StoredObject; mimeType: string; fileSize: number; filename: string; originalUrl: string | null }
  | { ok: false; error: string; status: number };

export type ProcessOptions = {
  prefix: string;
  /** Allow SVG (admin logos only, sanitized). Defaults to false. */
  allowSvg?: boolean;
};

/** Validate + store an uploaded File (from multipart form data). */
export async function processUploadedFile(file: File, opts: ProcessOptions): Promise<ProcessResult> {
  const filename = (file.name || "upload").replace(/[\r\n]/g, "").slice(0, 200);
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "File exceeds the 12 MB size limit.", status: 413 };
  }
  if (file.size === 0) {
    return { ok: false, error: "File is empty.", status: 400 };
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "File exceeds the 12 MB size limit.", status: 413 };
  }

  const sniffed = sniffMime(buffer);
  if (!sniffed) {
    return { ok: false, error: "Unsupported or corrupted file. Allowed: JPG, PNG, WebP, GIF, AVIF (SVG for logos).", status: 415 };
  }

  // SVG: only when explicitly allowed, and only after sanitization.
  if (sniffed === SVG_MIME) {
    if (!opts.allowSvg) {
      return { ok: false, error: "SVG is only allowed for supplier/admin logos.", status: 415 };
    }
    const cleaned = sanitizeSvg(buffer.toString("utf8"));
    if (!cleaned) {
      return { ok: false, error: "Invalid SVG.", status: 415 };
    }
    buffer = Buffer.from(cleaned, "utf8");
  } else if (!RASTER_MIME.has(sniffed)) {
    return { ok: false, error: "Unsupported image type.", status: 415 };
  }

  const stored = await uploadBuffer(buffer, {
    contentType: sniffed,
    prefix: opts.prefix,
    filename,
  });
  return {
    ok: true,
    stored,
    mimeType: sniffed,
    fileSize: buffer.byteLength,
    filename,
    originalUrl: null,
  };
}

/** Validate + fetch + store a remote image URL (SSRF-safe). */
export async function processImportUrl(url: string, opts: ProcessOptions): Promise<ProcessResult> {
  const fetched = await fetchRemoteImage(url);
  if (!fetched.ok) return { ok: false, error: fetched.error, status: 400 };

  let buffer = fetched.buffer;
  let contentType = fetched.contentType;
  const sniffed = sniffMime(buffer);

  if (sniffed === SVG_MIME) {
    if (!opts.allowSvg) {
      return { ok: false, error: "SVG is only allowed for supplier/admin logos.", status: 415 };
    }
    const cleaned = sanitizeSvg(buffer.toString("utf8"));
    if (!cleaned) return { ok: false, error: "Invalid SVG.", status: 415 };
    buffer = Buffer.from(cleaned, "utf8");
    contentType = SVG_MIME;
  } else if (sniffed && !RASTER_MIME.has(sniffed)) {
    return { ok: false, error: "Unsupported image type.", status: 415 };
  } else if (!sniffed && !contentType.startsWith("image/")) {
    return { ok: false, error: "URL is not an image.", status: 415 };
  }

  const filename = (() => {
    try {
      const p = new URL(fetched.finalUrl).pathname.split("/").pop() || "import";
      return decodeURIComponent(p).slice(0, 200);
    } catch {
      return "import";
    }
  })();

  const stored = await uploadBuffer(buffer, {
    contentType: sniffed ?? contentType,
    prefix: opts.prefix,
    filename,
  });
  return {
    ok: true,
    stored,
    mimeType: sniffed ?? contentType,
    fileSize: buffer.byteLength,
    filename,
    originalUrl: url,
  };
}
