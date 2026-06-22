import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  image: string | null;
  preferences: string | null;
  plan: string | null;
  planStatus: string | null;
  createdAt: Date | null;
};

/**
 * Load the authenticated user's full account record. Returns null when not
 * signed in. Falls back to session-only data if the DB is unreachable so the
 * Settings pages still render (read-only) instead of crashing.
 */
export async function getCurrentAccount(): Promise<{
  authenticated: boolean;
  user: AccountUser | null;
}> {
  const session = await auth();
  if (!session?.user?.id) return { authenticated: false, user: null };

  try {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true,
        jobTitle: true,
        phone: true,
        image: true,
        preferences: true,
        plan: true,
        planStatus: true,
        createdAt: true,
      },
    });
    if (u) return { authenticated: true, user: u };
  } catch {
    /* fall through to session-only data */
  }

  return {
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      firstName: null,
      lastName: null,
      company: null,
      jobTitle: null,
      phone: null,
      image: null,
      preferences: null,
      plan: "free",
      planStatus: "active",
      createdAt: null,
    },
  };
}
