import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { homeForRole, normalizeRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Switch the signed-in user's account type (buyer <-> supplier). Admin is never
// assignable here — it is derived from ADMIN_EMAILS.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const role = normalizeRole(body.role);
  if (role === "admin") {
    return NextResponse.json({ error: "Invalid account type." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role, onboardedAt: new Date() },
    });
    await recordAudit({
      actorId: session.user.id,
      actor: session.user.email,
      action: "user.role_change",
      targetType: "USER",
      targetId: session.user.id,
      detail: { role },
    });
    return NextResponse.json({ ok: true, role, home: homeForRole(role) });
  } catch {
    return NextResponse.json(
      { error: "Could not update your account type. Please try again." },
      { status: 500 },
    );
  }
}
