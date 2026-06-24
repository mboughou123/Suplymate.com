import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const TARGET_TYPES = ["SUPPLIER", "PRODUCT", "REVIEW", "MESSAGE", "CONVERSATION"];

// Any authenticated user can report content. Reports land in the admin
// moderation queue (status OPEN).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const targetType = String(body.targetType || "").toUpperCase();
  const targetId = String(body.targetId || "").trim();
  const reason = String(body.reason || "").trim();
  if (!TARGET_TYPES.includes(targetType) || !targetId || !reason) {
    return NextResponse.json(
      { error: "targetType, targetId and reason are required" },
      { status: 400 }
    );
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetType,
      targetId,
      reason: reason.slice(0, 200),
      detail: body.detail ? String(body.detail).slice(0, 2000) : null,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    actor: session.user.email,
    action: "report.create",
    targetType,
    targetId,
    detail: { reportId: report.id, reason },
  });

  return NextResponse.json({ ok: true });
}
