import { NextResponse } from "next/server";
import { checkAdmin, adminGuard } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Auto-flag certifications whose expirationDate has passed as "expired" (unless
// already rejected). Idempotent.
export async function POST() {
  const denied = await adminGuard();
  if (denied) return denied;
  const { email } = await checkAdmin();

  const result = await prisma.certification.updateMany({
    where: {
      expirationDate: { lt: new Date() },
      status: { notIn: ["expired", "rejected"] },
    },
    data: { status: "expired" },
  });

  await recordAudit({
    actor: email,
    action: "certification.flag_expired",
    detail: { count: result.count },
  });

  return NextResponse.json({ flagged: result.count });
}
