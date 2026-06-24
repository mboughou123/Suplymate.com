import { NextResponse } from "next/server";
import { checkAdmin, adminGuard } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_STATUSES, type MarketplaceStatus } from "@/lib/verification";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Admin sets a supplier's marketplace lifecycle status. VERIFIED is granted ONLY
// here, by explicit admin action — never automatically.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const status = String(body.marketplaceStatus || "").toUpperCase() as MarketplaceStatus;
  if (!MARKETPLACE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `marketplaceStatus must be one of: ${MARKETPLACE_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {
    marketplaceStatus: status,
    statusNote: body.note ? String(body.note).slice(0, 1000) : null,
  };
  if (status === "VERIFIED") {
    data.verifiedAt = new Date();
    data.verifiedBy = email;
    // Keep legacy fields consistent so existing surfaces show the badge.
    data.verified = true;
    data.verificationStatus = "verified";
  }

  const updated = await prisma.supplier.update({ where: { id }, data });

  await recordAudit({
    actor: email,
    action: "supplier.status",
    targetType: "SUPPLIER",
    targetId: id,
    detail: { marketplaceStatus: status },
  });

  return NextResponse.json({ supplier: { id: updated.id, marketplaceStatus: updated.marketplaceStatus } });
}
