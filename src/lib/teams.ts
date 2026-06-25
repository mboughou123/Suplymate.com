import { prisma } from "@/lib/prisma";
import { roleCan, type TeamRole } from "@/lib/permissions";

export async function getUserTeams(userId: string) {
  return prisma.teamMember.findMany({
    where: { userId, status: "active" },
    include: {
      team: {
        include: {
          members: {
            where: { status: "active" },
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

export async function getTeamForUser(teamId: string, userId: string) {
  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId, status: "active" },
  });
  if (!member) return null;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        where: { status: "active" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return team ? { team, role: member.role as TeamRole } : null;
}

export async function createTeam(ownerId: string, name: string) {
  const team = await prisma.team.create({
    data: {
      name: name.trim().slice(0, 120) || "My team",
      ownerId,
      members: {
        create: { userId: ownerId, role: "OWNER", status: "active" },
      },
    },
    include: { members: true },
  });
  return team;
}

export async function inviteMember(
  teamId: string,
  actorRole: TeamRole,
  email: string,
  role: TeamRole
) {
  if (!roleCan(actorRole, "team.members.manage")) {
    throw new Error("Forbidden");
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) throw new Error("User not found — they must sign up first");

  return prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId: user.id } },
    update: { role, status: "active" },
    create: { teamId, userId: user.id, role, status: "active" },
  });
}

export function assertCapability(role: TeamRole, cap: Parameters<typeof roleCan>[1]) {
  if (!roleCan(role, cap)) throw new Error("Forbidden");
}
