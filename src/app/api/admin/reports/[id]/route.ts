import { NextResponse } from "next/server";
import { checkAdmin, adminGuard } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

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

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.report.update({
    where: { id },
    data: {
      status,
      resolvedBy: status === "RESOLVED" || status === "DISMISSED" ? email : null,
      resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
    },
  });

  await recordAudit({
    actor: email,
    action: `report.${status.toLowerCase()}`,
    targetType: report.targetType,
    targetId: report.targetId,
    detail: { reportId: id },
  });

  return NextResponse.json({ ok: true, status });
}
