import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewer-entitlements";
import { toPublicEntitlements } from "@/lib/plan-gating";

export const dynamic = "force-dynamic";

// GET /api/account/entitlements — the current viewer's plan limits, so cached
// public pages (directory, catalogue, charts) can apply them client side.
export async function GET() {
  const viewer = await getViewer();
  return NextResponse.json(toPublicEntitlements(viewer.entitlements, viewer.signedIn), {
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}
