import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { homeForRole, normalizeRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Minimal identity endpoint used right after sign-in to decide where to land.
// Falls back to the session role when the database is unreachable.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let role = normalizeRole(session.user.role);
  let company: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, company: true },
    });
    if (user) {
      role = normalizeRole(user.role);
      company = user.company;
    }
  } catch {
    /* session-only fallback */
  }

  return NextResponse.json({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role,
    company,
    home: homeForRole(role),
  });
}
