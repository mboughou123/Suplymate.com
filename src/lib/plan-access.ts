import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entitlementsFor, resolveEntitlements, type Entitlements } from "@/lib/permissions";

export async function entitlementsForUserId(userId: string | null | undefined): Promise<Entitlements> {
  if (!userId) return entitlementsFor("free");
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planStatus: true },
    });
    return resolveEntitlements(user?.plan, user?.planStatus);
  } catch {
    return entitlementsFor("free");
  }
}

export async function entitlementsForSession(): Promise<{
  userId: string | null;
  entitlements: Entitlements;
}> {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  return { userId, entitlements: await entitlementsForUserId(userId) };
}

export const UPGRADE_REQUIRED = "upgrade_required";
export const AI_QUOTA = "ai_quota";
