import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { processUploadedFile, processImportUrl } from "@/lib/media-upload";
import { getMedia, replaceMediaAsset } from "@/lib/media-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/media/:id/replace — swap the underlying asset (keeps id +
// metadata). Accepts either a multipart file or JSON { url } for URL replace.
export async function POST(request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const { id } = await params;
  const current = await getMedia(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowSvg = current.mediaType === "SUPPLIER_LOGO";
  const prefix = current.entityType.toLowerCase();
  const contentType = request.headers.get("content-type") ?? "";

  let result;
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    result = await processUploadedFile(file, { prefix, allowSvg });
  } else {
    const body = (await request.json().catch(() => ({}))) as { url?: string };
    if (!body.url) return NextResponse.json({ error: "Provide a file or url." }, { status: 400 });
    result = await processImportUrl(body.url, { prefix, allowSvg });
  }

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const updated = await replaceMediaAsset(
    id,
    {
      url: result.stored.url,
      storageKey: result.stored.storageKey,
      originalUrl: result.originalUrl,
      mimeType: result.mimeType,
      fileSize: result.fileSize,
      originalFilename: result.filename,
    },
    email
  );
  return NextResponse.json({ media: updated });
}
