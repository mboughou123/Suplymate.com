import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { entitlementsFor, type Entitlements } from "@/lib/permissions";

export type Viewer = {
  userId: string | null;
  signedIn: boolean;
  email: string | null;
  plan: string | null;
  entitlements: Entitlements;
};

/**
 * The current request's viewer with entitlements read from the database (the
 * session never carries the plan). Guests and DB failures fall back to Free.
 */
export async function getViewer(): Promise<Viewer> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const sessionEmail = session?.user?.email ?? null;
  if (!userId) {
    return { userId: null, signedIn: false, email: null, plan: null, entitlements: entitlementsFor(null) };
  }
  const user = await prisma.user
    .findUnique({ where: { id: userId }, select: { plan: true, email: true } })
    .catch(() => null);
  const email = user?.email ?? sessionEmail;
  const plan = user?.plan ?? null;
  return { userId, signedIn: true, email, plan, entitlements: entitlementsFor({ plan, email }) };
}
