import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { updateMedia, getMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/media/:id/publish — toggle/set publish state.
// Body: { publish?: boolean }  (defaults to toggling current state)
export async function POST(request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const { id } = await params;
  const current = await getMedia(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { publish?: boolean };
  const publish = typeof body.publish === "boolean" ? body.publish : current.status !== "published";

  const updated = await updateMedia(id, { status: publish ? "published" : "unpublished" }, email);
  return NextResponse.json({ media: updated });
}
