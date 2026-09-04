import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeRole, type AccountRole } from "@/lib/roles";

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
  currentPeriodEnd: Date | null;
  createdAt: Date | null;
  role: AccountRole;
  // Business owner profile (additive)
  username: string | null;
  companyType: string | null;
  industry: string | null;
  location: string | null;
  bio: string | null;
  procurementInterests: string[];
  preferredMaterials: string[];
};

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const BASE_SELECT = {
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
  currentPeriodEnd: true,
  createdAt: true,
  role: true,
} as const;

const BUSINESS_SELECT = {
  username: true,
  companyType: true,
  industry: true,
  location: true,
  bio: true,
  procurementInterests: true,
  preferredMaterials: true,
} as const;

/**
 * Load the authenticated user's full account record. Returns null when not
 * signed in. Degrades gracefully: if the newer business columns are not yet
 * migrated the base profile still loads; if the DB is unreachable the Settings
 * pages render read-only from session data instead of crashing.
 */
export async function getCurrentAccount(): Promise<{
  authenticated: boolean;
  user: AccountUser | null;
}> {
  const session = await auth();
  if (!session?.user?.id) return { authenticated: false, user: null };

  const empty = {
    username: null,
    companyType: null,
    industry: null,
    location: null,
    bio: null,
    procurementInterests: [] as string[],
    preferredMaterials: [] as string[],
  };

  try {
    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ...BASE_SELECT, ...BUSINESS_SELECT },
    });
    if (u) {
      return {
        authenticated: true,
        user: {
          ...u,
          role: normalizeRole(u.role),
          procurementInterests: parseList(u.procurementInterests),
          preferredMaterials: parseList(u.preferredMaterials),
        },
      };
    }
  } catch {
    try {
      const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: BASE_SELECT,
      });
      if (u) {
        return { authenticated: true, user: { ...u, role: normalizeRole(u.role), ...empty } };
      }
    } catch {
      /* fall through to session-only data */
    }
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
      currentPeriodEnd: null,
      createdAt: null,
      role: normalizeRole(session.user.role),
      ...empty,
    },
  };
}
