import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import {
  getMedia,
  updateMedia,
  deleteMedia,
  getMediaAudit,
  isEntityType,
  isMediaType,
  isMediaStatus,
  type MediaPatch,
} from "@/lib/media-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/media/:id — media details + audit history.
export async function GET(_request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { id } = await params;
  const media = await getMedia(id);
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const audit = await getMediaAudit(id);
  return NextResponse.json({ media, audit });
}

// PATCH /api/admin/media/:id — edit metadata / classification / association.
export async function PATCH(request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: MediaPatch = {};

  if (typeof body.altText === "string") patch.altText = body.altText;
  if (typeof body.caption === "string") patch.caption = body.caption;
  if ("originalUrl" in body) patch.originalUrl = body.originalUrl ? String(body.originalUrl) : null;
  if (typeof body.sortOrder === "number") patch.sortOrder = body.sortOrder;
  if (typeof body.isPrimary === "boolean") patch.isPrimary = body.isPrimary;
  if (isMediaType(body.mediaType)) patch.mediaType = body.mediaType;
  if (isMediaStatus(body.status)) patch.status = body.status;
  // Admins may re-associate media, but only to a valid entity type.
  if (isEntityType(body.entityType)) patch.entityType = body.entityType;
  if ("entityId" in body) patch.entityId = body.entityId ? String(body.entityId) : null;

  const updated = await updateMedia(id, patch, email);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ media: updated });
}

// DELETE /api/admin/media/:id — remove media (and its stored object).
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const { id } = await params;
  const ok = await deleteMedia(id, email);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
