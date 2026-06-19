import { NextResponse } from "next/server";
import { getAdminSupplier } from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/suppliers/:id — public single supplier (verified only).
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supplier = await getAdminSupplier(id);
  if (!supplier || supplier.verificationStatus !== "verified") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ supplier });
}
