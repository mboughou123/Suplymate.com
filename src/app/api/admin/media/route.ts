import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import {
  listMedia,
  isEntityType,
  isMediaType,
  isMediaStatus,
  type MediaFilter,
  type MediaType,
} from "@/lib/media-store";

export const dynamic = "force-dynamic";

// GET /api/admin/media — list/search/filter media for the library.
export async function GET(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const filter: MediaFilter = {};

  const entityType = searchParams.get("entityType");
  if (entityType && isEntityType(entityType)) filter.entityType = entityType;

  const entityId = searchParams.get("entityId");
  if (entityId) filter.entityId = entityId;

  const mediaType = searchParams.get("mediaType");
  if (mediaType && isMediaType(mediaType)) filter.mediaType = mediaType;

  const mediaTypes = searchParams.get("mediaTypes");
  if (mediaTypes) {
    const list = mediaTypes.split(",").filter(isMediaType) as MediaType[];
    if (list.length) filter.mediaTypes = list;
  }

  const status = searchParams.get("status");
  if (status && isMediaStatus(status)) filter.status = status;

  const search = searchParams.get("search");
  if (search) filter.search = search;

  if (searchParams.get("unattached") === "1") filter.unattached = true;

  const media = await listMedia(filter);
  return NextResponse.json({ media });
}
