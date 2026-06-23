import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { processImportUrl } from "@/lib/media-upload";
import {
  createMedia,
  isEntityType,
  isMediaType,
  type EntityType,
  type MediaType,
} from "@/lib/media-store";
import { storageProviderStatus } from "@/lib/image-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/admin/media/import-url — import a remote image by URL (SSRF-safe).
// Body: { url, entityType?, entityId?, mediaType?, altText?, caption?, status? }
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "Provide a 'url'." }, { status: 400 });

  const entityType: EntityType = isEntityType(body.entityType) ? body.entityType : "GENERAL";
  const entityId = body.entityId ? String(body.entityId) : null;
  const mediaType: MediaType = isMediaType(body.mediaType) ? body.mediaType : "GENERAL";
  const allowSvg = mediaType === "SUPPLIER_LOGO";
  const status = body.status === "published" ? "published" : "unpublished";

  const result = await processImportUrl(url, { prefix: prefixFor(entityType), allowSvg });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const media = await createMedia(
    {
      url: result.stored.url,
      storageKey: result.stored.storageKey,
      originalUrl: result.originalUrl ?? url,
      originalFilename: result.filename,
      mimeType: result.mimeType,
      fileSize: result.fileSize,
      mediaType,
      entityType,
      entityId,
      altText: body.altText ? String(body.altText) : null,
      caption: body.caption ? String(body.caption) : null,
      status,
    },
    email
  );

  const store = storageProviderStatus();
  return NextResponse.json({
    media,
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
