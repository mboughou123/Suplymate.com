import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSupplierRole } from "@/lib/roles";
import { PHOTO_MAX_BYTES, isSupplierPhotoKind, normalizePhoto, storePhoto } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST multipart { file, kind: "logo" | "cover" | "gallery" } → { url }.
// The URL is saved onto the profile by the regular profile form submit.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  const account = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!isSupplierRole(account?.role)) {
    return NextResponse.json({ error: "Only supplier accounts can upload company photos." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof File) || file.size === 0 || !isSupplierPhotoKind(kind)) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That file is not an image. Use JPG, PNG or WebP." }, { status: 400 });
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return NextResponse.json({ error: "That photo is too large (max 8 MB)." }, { status: 413 });
  }

  let photo: Awaited<ReturnType<typeof normalizePhoto>>;
  try {
    photo = await normalizePhoto(Buffer.from(await file.arrayBuffer()), kind);
  } catch {
    return NextResponse.json({ error: "We couldn't read that image. Try a JPG or PNG." }, { status: 400 });
  }

  try {
    const url = await storePhoto(session.user.id, photo, kind);
    return NextResponse.json({ url, width: photo.width, height: photo.height });
  } catch (err) {
    console.error("[supplier-photos] store failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
