import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Submit (or update) a claim for a supplier profile. Claiming NEVER verifies a
// supplier — it creates a SUBMITTED claim for manual admin review.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: { id: true, name: true, claimedByUserId: true },
  });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  if (supplier.claimedByUserId) {
    return NextResponse.json(
      { error: "This profile has already been claimed." },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const data = {
    role: body.role ? String(body.role).slice(0, 120) : null,
    workEmail: body.workEmail ? String(body.workEmail).slice(0, 200) : null,
    phone: body.phone ? String(body.phone).slice(0, 60) : null,
    evidenceUrl: body.evidenceUrl ? String(body.evidenceUrl).slice(0, 500) : null,
    note: body.note ? String(body.note).slice(0, 2000) : null,
  };

  // One active claim per (supplier,user): update if it exists, else create.
  const existing = await prisma.supplierClaim.findFirst({
    where: { supplierId: id, userId: session.user.id },
  });

  let claim;
  if (existing) {
    claim = await prisma.supplierClaim.update({
      where: { id: existing.id },
      data: { ...data, status: "SUBMITTED" },
    });
  } else {
    claim = await prisma.supplierClaim.create({
      data: {
        supplierId: id,
        supplierName: supplier.name,
        userId: session.user.id,
        status: "SUBMITTED",
        ...data,
      },
    });
  }

  // Move the supplier into PENDING_REVIEW (still NOT verified).
  await prisma.supplier.update({
    where: { id },
    data: { marketplaceStatus: "PENDING_REVIEW" },
  }).catch(() => {});

  await recordAudit({
    actorId: session.user.id,
    actor: session.user.email,
    action: "claim.submit",
    targetType: "SUPPLIER",
    targetId: id,
    detail: { claimId: claim.id },
  });

  return NextResponse.json({ claim });
}
