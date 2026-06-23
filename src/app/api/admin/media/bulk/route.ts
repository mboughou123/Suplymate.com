import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import {
  bulkMedia,
  isEntityType,
  isMediaType,
  type BulkAction,
} from "@/lib/media-store";

export const dynamic = "force-dynamic";

// POST /api/admin/media/bulk
// Body: { ids: string[], action: "delete"|"publish"|"unpublish"|"setType"|"attach",
//         mediaType?, entityType?, entityId? }
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide an 'ids' array." }, { status: 400 });
  }

  const actionType = String(body.action ?? "");
  let action: BulkAction;
  switch (actionType) {
    case "delete":
      action = { type: "delete" };
      break;
    case "publish":
      action = { type: "publish" };
      break;
    case "unpublish":
      action = { type: "unpublish" };
      break;
    case "setType":
      if (!isMediaType(body.mediaType)) {
        return NextResponse.json({ error: "Invalid mediaType." }, { status: 400 });
      }
      action = { type: "setType", mediaType: body.mediaType };
      break;
    case "attach":
      if (!isEntityType(body.entityType) || !body.entityId) {
        return NextResponse.json({ error: "Provide entityType + entityId." }, { status: 400 });
      }
      action = { type: "attach", entityType: body.entityType, entityId: String(body.entityId) };
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const count = await bulkMedia(ids, action, email);
  return NextResponse.json({ ok: true, count });
}
