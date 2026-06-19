import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import {
  setVerification,
  VERIFICATION_STATUSES,
  type VerificationStatus,
} from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/suppliers/:id/verify  Body: { status: VerificationStatus }
// Approve / reject / request more info / reset to pending.
export async function POST(request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { status?: string };
  const status = body.status as VerificationStatus;

  if (!VERIFICATION_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VERIFICATION_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const updated = await setVerification(id, status);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ supplier: updated });
}
