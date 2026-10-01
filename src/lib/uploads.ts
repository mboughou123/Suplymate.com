import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { detectStorageProvider, uploadBuffer } from "@/lib/image-storage";
import { uploadedImagePath } from "@/lib/upload-paths";

export type SupplierPhotoKind = "logo" | "cover" | "gallery";

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;

const MAX_EDGE: Record<SupplierPhotoKind, number> = {
  logo: 512,
  cover: 1600,
  gallery: 1600,
};

export function isSupplierPhotoKind(value: unknown): value is SupplierPhotoKind {
  return value === "logo" || value === "cover" || value === "gallery";
}

/** Resize to the kind's max edge and re-encode as WebP (also strips EXIF/GPS). */
export async function normalizePhoto(
  input: Buffer,
  kind: SupplierPhotoKind,
): Promise<{ buffer: Buffer<ArrayBuffer>; width: number; height: number }> {
  const edge = MAX_EDGE[kind];
  const { data, info } = await sharp(input, { failOn: "error" })
    .rotate()
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    .webp({ quality: kind === "logo" ? 90 : 80 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: Buffer.from(data), width: info.width, height: info.height };
}

/**
 * Store a processed photo and return its public URL: Vercel Blob when
 * configured, otherwise the UploadedImage table served by /api/uploads/[id].
 */
export async function storePhoto(
  ownerId: string,
  photo: { buffer: Buffer<ArrayBuffer>; width: number; height: number },
  kind: SupplierPhotoKind,
): Promise<string> {
  if (detectStorageProvider() === "vercel-blob") {
    const stored = await uploadBuffer(photo.buffer, {
      contentType: "image/webp",
      prefix: `suppliers/${ownerId}`,
      filename: `${kind}.webp`,
    });
    if (stored.provider === "vercel-blob") return stored.url;
  }
  const row = await prisma.uploadedImage.create({
    data: { ownerId, contentType: "image/webp", bytes: photo.buffer, width: photo.width, height: photo.height },
    select: { id: true },
  });
  return uploadedImagePath(row.id);
}
