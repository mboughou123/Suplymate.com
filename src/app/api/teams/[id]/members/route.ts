import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTeamForUser, inviteMember } from "@/lib/teams";
import type { TeamRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ctx = await getTeamForUser(id, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const role = (String(body.role || "BUYER").toUpperCase() as TeamRole) || "BUYER";
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  try {
    const member = await inviteMember(id, ctx.role, email, role);
    return NextResponse.json({ member: { id: member.id, role: member.role } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to invite" },
      { status: 403 }
    );
  }
}
