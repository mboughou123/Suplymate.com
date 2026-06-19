import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import { listAdminSuppliers, saveSuppliers, type SupplierInput } from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";

// GET /api/admin/suppliers — list every imported/scraped supplier for review.
export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;

  const suppliers = await listAdminSuppliers();
  return NextResponse.json({ suppliers });
}

// POST /api/admin/suppliers — save a batch of approved/previewed suppliers.
// Body: { suppliers: SupplierInput[], skipDuplicates?: boolean }
// Saved as PENDING unless a row specifies another verificationStatus.
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as {
    suppliers?: SupplierInput[];
    skipDuplicates?: boolean;
  };

  if (!Array.isArray(body.suppliers) || body.suppliers.length === 0) {
    return NextResponse.json({ error: "Provide a non-empty 'suppliers' array." }, { status: 400 });
  }

  const result = await saveSuppliers(body.suppliers, {
    skipDuplicates: body.skipDuplicates ?? true,
  });

  return NextResponse.json({
    saved: result.saved,
    savedCount: result.saved.length,
    skippedDuplicates: result.skippedDuplicates.map((d) => ({
      name: d.candidate.name,
      existingId: d.existingId,
      reason: d.reason,
    })),
  });
}
