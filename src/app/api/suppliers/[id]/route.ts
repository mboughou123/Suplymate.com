import { NextResponse } from "next/server";
import { getAdminSupplier } from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/suppliers/:id — public single supplier (verified only). Phone and
// email are a paid entitlement served by /api/supplier-contacts.
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const record = await getAdminSupplier(id);
  if (!record || record.verificationStatus !== "verified") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { phone: _phone, email: _email, ...supplier } = record;
  return NextResponse.json({ supplier });
}
