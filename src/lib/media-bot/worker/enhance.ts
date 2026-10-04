// Deterministic, role-aware clean-up that runs on the bot machine (sharp, no
// model, no network). Nothing here invents pixels: logos are trimmed and
// padded, certificates are only downsized, product photos keep their colours,
// and facility photos get a mild contrast/sharpness restore.

import sharp from "sharp";
import type { Enhancement, MediaRole } from "../manifest";

export const LOGO_MAX_PX = 512;
export const DOC_MAX_PX = 2400;
export const PHOTO_MAX_PX = 2000;
/** Photos smaller than this on their long side are upscaled (2×, capped). */
export const PHOTO_UPSCALE_BELOW_PX = 800;

export type EnhanceOutput = {
  buffer: Buffer;
  ext: "png" | "jpg" | "webp" | "svg";
  mimeType: string;
  enhancement: Enhancement;
  width?: number;
  height?: number;
};

export function isSvg(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 512).toString("utf8").trim().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}

const EXT_BY_FORMAT: Record<string, EnhanceOutput["ext"]> = { png: "png", jpeg: "jpg", webp: "webp" };
const MIME_BY_EXT: Record<EnhanceOutput["ext"], string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" };

async function original(buffer: Buffer): Promise<EnhanceOutput> {
  if (isSvg(buffer)) return { buffer, ext: "svg", mimeType: MIME_BY_EXT.svg, enhancement: "none" };
  const meta = await sharp(buffer).metadata();
  const ext = EXT_BY_FORMAT[meta.format ?? ""];
  if (!ext) {
    const out = await sharp(buffer).rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    return { buffer: out.data, ext: "jpg", mimeType: MIME_BY_EXT.jpg, enhancement: "none", width: out.info.width, height: out.info.height };
  }
  return { buffer, ext, mimeType: MIME_BY_EXT[ext], enhancement: "none", width: meta.width, height: meta.height };
}

async function logo(buffer: Buffer): Promise<EnhanceOutput> {
  if (isSvg(buffer)) return original(buffer);
  let img = sharp(buffer).rotate().ensureAlpha();
  try {
    const trimmed = await img.clone().trim({ threshold: 12 }).toBuffer();
    img = sharp(trimmed).ensureAlpha();
  } catch {
    // uniform image — nothing to trim
  }
  const resized = await img.resize({ width: LOGO_MAX_PX, height: LOGO_MAX_PX, fit: "inside", withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  const side = Math.max(resized.info.width, resized.info.height);
  const padX = side - resized.info.width;
  const padY = side - resized.info.height;
  const square = await sharp(resized.data)
    .extend({
      top: Math.floor(padY / 2),
      bottom: Math.ceil(padY / 2),
      left: Math.floor(padX / 2),
      right: Math.ceil(padX / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { buffer: square, ext: "png", mimeType: MIME_BY_EXT.png, enhancement: "resize", width: side, height: side };
}

async function certificate(buffer: Buffer): Promise<EnhanceOutput> {
  const src = await original(buffer);
  if (src.ext === "svg" || ((src.width ?? 0) <= DOC_MAX_PX && (src.height ?? 0) <= DOC_MAX_PX)) return src;
  const keepPng = src.ext === "png";
  const pipeline = sharp(buffer).rotate().resize({ width: DOC_MAX_PX, height: DOC_MAX_PX, fit: "inside", withoutEnlargement: true });
  const out = await (keepPng ? pipeline.png({ compressionLevel: 9 }) : pipeline.jpeg({ quality: 92, mozjpeg: true })).toBuffer({ resolveWithObject: true });
  const ext = keepPng ? "png" : "jpg";
  return { buffer: out.data, ext, mimeType: MIME_BY_EXT[ext], enhancement: "resize", width: out.info.width, height: out.info.height };
}

async function photo(buffer: Buffer, restore: boolean): Promise<EnhanceOutput> {
  const src = await original(buffer);
  if (src.ext === "svg" || !src.width || !src.height) return src;
  const long = Math.max(src.width, src.height);
  let target: number | null = null;
  let enhancement: Enhancement = restore ? "restore" : "none";
  if (long < PHOTO_UPSCALE_BELOW_PX) {
    target = Math.min(long * 2, PHOTO_MAX_PX);
    enhancement = "upscale";
  } else if (long > PHOTO_MAX_PX) {
    target = PHOTO_MAX_PX;
    if (!restore) enhancement = "resize";
  }
  if (!target && !restore) return src;

  let img = sharp(buffer).rotate();
  if (target) {
    img = img.resize({
      width: src.width >= src.height ? target : undefined,
      height: src.height > src.width ? target : undefined,
      kernel: "lanczos3",
    });
  }
  if (restore) img = img.normalise({ lower: 1, upper: 99 }).sharpen({ sigma: 0.6 });
  const out = await img.jpeg({ quality: 86, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  return { buffer: out.data, ext: "jpg", mimeType: MIME_BY_EXT.jpg, enhancement, width: out.info.width, height: out.info.height };
}

export async function enhanceForRole(buffer: Buffer, role: MediaRole): Promise<EnhanceOutput> {
  switch (role) {
    case "logo":
      return logo(buffer);
    case "certificate":
      return certificate(buffer);
    case "product":
      return photo(buffer, false);
    case "cover":
    case "factory":
    case "gallery":
      return photo(buffer, true);
    default: {
      const unreachable: never = role;
      throw new Error(`unknown media role ${String(unreachable)}`);
    }
  }
}
