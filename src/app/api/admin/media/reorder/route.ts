import { NextResponse } from "next/server";
import { adminGuard, checkAdmin } from "@/lib/admin";
import { reorderMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

// POST /api/admin/media/reorder — Body: { ids: string[] } (new order).
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Provide an 'ids' array." }, { status: 400 });
  }
  await reorderMedia(ids, email);
  return NextResponse.json({ ok: true });
}
