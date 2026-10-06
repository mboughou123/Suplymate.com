import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sniffMime } from "@/lib/media-upload";
import { detectStorageProvider, uploadBuffer } from "@/lib/image-storage";
import { storagePrefixForEntity } from "@/lib/media-types";
import { isUploadedImagePath, uploadedImagePath, UPLOADED_IMAGE_PREFIX } from "@/lib/upload-paths";
import {
  AVATAR_MAX_BYTES,
  AVATAR_MAX_EDGE,
  validateAvatarFile,
  type AvatarErrorCode,
  type AvatarFileError,
} from "@/lib/avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_URL_MAX = 500;

function fail(code: AvatarErrorCode | "unauthorized" | "invalid", error: string, status: number) {
  return NextResponse.json({ error, code }, { status });
}

function fileError(code: AvatarFileError) {
  switch (code) {
    case "avatarEmpty":
      return fail(code, "Choose a photo to upload.", 400);
    case "avatarTooLarge":
      return fail(code, "That photo is too large (max 5 MB).", 413);
    case "avatarType":
      return fail(code, "That file is not a supported image. Use JPG, PNG, WebP or GIF.", 415);
    default: {
      const unreachable: never = code;
      return unreachable;
    }
  }
}

async function storeAvatar(userId: string, buffer: Buffer<ArrayBuffer>, width: number, height: number) {
  if (detectStorageProvider() === "vercel-blob") {
    const stored = await uploadBuffer(buffer, {
      contentType: "image/webp",
      prefix: `${storagePrefixForEntity("USER")}/${userId}`,
      filename: "avatar.webp",
    });
    if (stored.provider === "vercel-blob") return stored.url;
  }
  const row = await prisma.uploadedImage.create({
    data: { ownerId: userId, contentType: "image/webp", bytes: buffer, width, height },
    select: { id: true },
  });
  return uploadedImagePath(row.id);
}

async function deleteOwnedUpload(userId: string, url: string | null | undefined) {
  if (!url || !isUploadedImagePath(url)) return;
  await prisma.uploadedImage
    .deleteMany({ where: { id: url.slice(UPLOADED_IMAGE_PREFIX.length), ownerId: userId } })
    .catch(() => undefined);
}

// POST multipart { file } → { url }. Stores a ≤512px WebP and saves it as User.image.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("unauthorized", "Please sign in.", 401);

  const limit = rateLimit(`avatar:${userId}`, 10, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a few minutes.", code: "avatarRateLimited" },
      { status: 429, headers: { "Retry-After": String(limit.resetInSeconds) } },
    );
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > AVATAR_MAX_BYTES + 64 * 1024) {
    return fileError("avatarTooLarge");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid", "Invalid upload.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fileError("avatarEmpty");

  if (file.size > AVATAR_MAX_BYTES) return fileError("avatarTooLarge");

  const input = Buffer.from(await file.arrayBuffer());
  const invalid = validateAvatarFile({ type: sniffMime(input), size: input.byteLength });
  if (invalid) return fileError(invalid);

  let photo: { buffer: Buffer<ArrayBuffer>; width: number; height: number };
  try {
    const { data, info } = await sharp(input, { failOn: "error", animated: false })
      .rotate()
      .resize({ width: AVATAR_MAX_EDGE, height: AVATAR_MAX_EDGE, fit: "cover", position: "attention", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    photo = { buffer: Buffer.from(data), width: info.width, height: info.height };
  } catch {
    return fail("avatarType", "We couldn't read that image. Try a JPG or PNG.", 415);
  }

  let url: string;
  try {
    url = await storeAvatar(userId, photo.buffer, photo.width, photo.height);
  } catch (err) {
    console.error("[account-avatar] store failed:", err instanceof Error ? err.message : err);
    return fail("avatarStorageUnavailable", "Image storage is not configured.", 503);
  }
  if (url.startsWith("data:") || url.length > IMAGE_URL_MAX) {
    return fail("avatarStorageUnavailable", "Image storage is not configured.", 503);
  }

  try {
    const previous = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
    await prisma.user.update({ where: { id: userId }, data: { image: url } });
    await deleteOwnedUpload(userId, previous?.image);
  } catch {
    await deleteOwnedUpload(userId, url);
    return fail("avatarUploadFailed", "Could not save your photo. Please try again.", 500);
  }

  return NextResponse.json({ url });
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("unauthorized", "Please sign in.", 401);

  try {
    const previous = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
    await prisma.user.update({ where: { id: userId }, data: { image: null } });
    await deleteOwnedUpload(userId, previous?.image);
  } catch {
    return fail("avatarRemoveFailed", "Could not remove your photo. Please try again.", 500);
  }
  return NextResponse.json({ ok: true });
}
