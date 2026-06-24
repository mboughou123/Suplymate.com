import { NextResponse } from "next/server";
import { checkAdmin, adminGuard } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const STATUSES = ["PUBLISHED", "REJECTED", "REMOVED", "PENDING"] as const;

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
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.review.update({
    where: { id },
    data: { status, moderatedBy: email, moderatedAt: new Date() },
  });

  await notify({
    userId: review.authorId,
    type: "review",
    title: `Your review was ${status.toLowerCase()}`,
    body: review.supplierName,
    link: `/supplier/${review.supplierId}`,
  });

  await recordAudit({
    actor: email,
    action: `review.${status.toLowerCase()}`,
    targetType: "REVIEW",
    targetId: id,
  });

  return NextResponse.json({ ok: true, status });
}
