import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import {
  listCertifications,
  createCertification,
  isCertStatus,
  type CertificationInput,
} from "@/lib/certifications-store";

export const dynamic = "force-dynamic";

// GET /api/admin/certifications?supplierId=...
export async function GET(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId") ?? undefined;
  const certifications = await listCertifications(supplierId);
  return NextResponse.json({ certifications });
}

// POST /api/admin/certifications — create a certification (admin only).
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const supplierId = typeof body.supplierId === "string" ? body.supplierId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!supplierId || !name) {
    return NextResponse.json({ error: "supplierId and name are required." }, { status: 400 });
  }

  const input: CertificationInput = {
    supplierId,
    name,
    type: body.type ? String(body.type) : null,
    issuingOrg: body.issuingOrg ? String(body.issuingOrg) : null,
    certificateNumber: body.certificateNumber ? String(body.certificateNumber) : null,
    issueDate: body.issueDate ? String(body.issueDate) : null,
    expirationDate: body.expirationDate ? String(body.expirationDate) : null,
    verificationUrl: body.verificationUrl ? String(body.verificationUrl) : null,
    sourceUrl: body.sourceUrl ? String(body.sourceUrl) : null,
    notes: body.notes ? String(body.notes) : null,
    // Never auto-verify; ignore any client-sent "verified" unless explicit.
    status: isCertStatus(body.status) ? body.status : "claimed",
  };

  const cert = await createCertification(input);
  return NextResponse.json({ certification: cert });
}
