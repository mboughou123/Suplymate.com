import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const company = String(body.company || "").trim();
  const jobTitle = body.jobTitle ? String(body.jobTitle).trim() : null;
  const role = body.role === "supplier" ? "supplier" : "buyer";

  if (!company) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      company,
      jobTitle,
      role,
      onboardedAt: new Date(),
    },
  });

  await recordAudit({
    actorId: session.user.id,
    actor: session.user.email,
    action: "user.onboard",
    targetType: "USER",
    targetId: session.user.id,
    detail: { role, company },
  });

  return NextResponse.json({ ok: true });
}
