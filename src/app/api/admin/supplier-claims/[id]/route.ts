import { NextResponse } from "next/server";
import { checkAdmin, adminGuard } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ACTIONS = ["APPROVED", "REJECTED", "NEEDS_INFORMATION"] as const;

// Admin reviews a supplier claim. Approval links the user to the supplier
// (claimedByUserId) and sets the supplier to CLAIMED — NOT verified. Verifying
// is a separate, explicit admin action.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  if (!ACTIONS.includes(status as (typeof ACTIONS)[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const claim = await prisma.supplierClaim.findUnique({ where: { id } });
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.supplierClaim.update({
    where: { id },
    data: {
      status,
      reviewedBy: email,
      reviewedAt: new Date(),
      adminNote: body.adminNote ? String(body.adminNote).slice(0, 2000) : null,
    },
  });

  if (status === "APPROVED") {
    await prisma.supplier.update({
      where: { id: claim.supplierId },
      data: {
        claimedByUserId: claim.userId,
        claimedAt: new Date(),
        marketplaceStatus: "CLAIMED",
      },
    });
    await prisma.user.update({ where: { id: claim.userId }, data: { role: "supplier" } }).catch(() => {});
  } else if (status === "NEEDS_INFORMATION") {
    await prisma.supplier
      .update({ where: { id: claim.supplierId }, data: { marketplaceStatus: "NEEDS_INFORMATION" } })
      .catch(() => {});
  }

  await notify({
    userId: claim.userId,
    type: "claim",
    title: `Profile claim ${status === "APPROVED" ? "approved" : status === "REJECTED" ? "rejected" : "needs more info"}`,
    body: `${claim.supplierName}: ${updated.adminNote ?? ""}`.trim(),
    link: status === "APPROVED" ? "/supplier-dashboard" : `/supplier/${claim.supplierId}`,
  });

  await recordAudit({
    actor: email,
    action: `claim.${status.toLowerCase()}`,
    targetType: "SUPPLIER",
    targetId: claim.supplierId,
    detail: { claimId: id },
  });

  return NextResponse.json({ claim: updated });
}
