import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { processUploadedFile } from "@/lib/media-upload";
import {
  createMedia,
  isEntityType,
  isMediaType,
  type EntityType,
  type MediaType,
} from "@/lib/media-store";
import { storageProviderStatus } from "@/lib/image-storage";

export const dynamic = "force-dynamic";
// Allow larger multipart uploads.
export const maxDuration = 60;

const LOGO_TYPES = new Set<MediaType>(["SUPPLIER_LOGO"]);

// POST /api/admin/media/upload — multipart upload of one or more files.
// Fields: file(s), entityType, entityId, mediaType, altText, caption, status.
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const entityTypeRaw = String(form.get("entityType") ?? "GENERAL");
  const entityType: EntityType = isEntityType(entityTypeRaw) ? entityTypeRaw : "GENERAL";
  const entityId = form.get("entityId") ? String(form.get("entityId")) : null;
  const mediaTypeRaw = String(form.get("mediaType") ?? "GENERAL");
  const mediaType: MediaType = isMediaType(mediaTypeRaw) ? mediaTypeRaw : "GENERAL";
  const altText = form.get("altText") ? String(form.get("altText")) : null;
  const caption = form.get("caption") ? String(form.get("caption")) : null;
  const statusRaw = String(form.get("status") ?? "unpublished");
  const status = statusRaw === "published" ? "published" : "unpublished";
  const allowSvg = LOGO_TYPES.has(mediaType);

  const created = [];
  const errors: string[] = [];
  for (const file of files) {
    const result = await processUploadedFile(file, { prefix: prefixFor(entityType), allowSvg });
    if (!result.ok) {
      errors.push(`${file.name}: ${result.error}`);
      continue;
    }
    const media = await createMedia(
      {
        url: result.stored.url,
        storageKey: result.stored.storageKey,
        originalUrl: result.originalUrl,
        originalFilename: result.filename,
        mimeType: result.mimeType,
        fileSize: result.fileSize,
        mediaType,
        entityType,
        entityId,
        altText,
        caption,
        status,
      },
      email
    );
    created.push(media);
  }

  if (created.length === 0) {
    return NextResponse.json({ error: errors[0] ?? "Upload failed.", errors }, { status: 415 });
  }

  const store = storageProviderStatus();
  return NextResponse.json({
    media: created,
    errors,
    storage: { provider: store.provider, configured: store.configured, recommendation: store.recommendation },
  });
}

function prefixFor(entityType: EntityType): string {
  switch (entityType) {
    case "SUPPLIER":
      return "suppliers";
    case "PRODUCT":
      return "products";
    case "CERTIFICATION":
      return "certifications";
    case "USER":
      return "profiles";
    default:
      return "media";
  }
}
