import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import {
  getCertification,
  updateCertification,
  deleteCertification,
  isCertStatus,
  type CertificationPatch,
} from "@/lib/certifications-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  const cert = await getCertification(id);
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ certification: cert });
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: CertificationPatch = {};
  const strFields = [
    "name",
    "type",
    "imageUrl",
    "certificateUrl",
    "sourceUrl",
    "issuingOrg",
    "certificateNumber",
    "issueDate",
    "expirationDate",
    "verificationUrl",
    "notes",
  ] as const;
  for (const f of strFields) {
    if (f in body) {
      (patch as Record<string, unknown>)[f] = body[f] === null || body[f] === "" ? null : String(body[f]);
    }
  }
  // Verification status is admin-controlled only.
  if (isCertStatus(body.status)) patch.status = body.status;

  const updated = await updateCertification(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ certification: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  const ok = await deleteCertification(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
