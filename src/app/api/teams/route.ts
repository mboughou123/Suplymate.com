import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createTeam, getUserTeams } from "@/lib/teams";
import { entitlementsFor } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberships = await getUserTeams(session.user.id);
  return NextResponse.json({
    teams: memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      role: m.role,
      memberCount: m.team.members.length,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  const ent = entitlementsFor(user?.plan);
  const existing = await getUserTeams(session.user.id);
  if (existing.length >= ent.teamSeats) {
    return NextResponse.json(
      { error: "Team limit reached for your plan. Upgrade to add more teams." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "My procurement team");
  const team = await createTeam(session.user.id, name);
  return NextResponse.json({ team: { id: team.id, name: team.name } });
}
