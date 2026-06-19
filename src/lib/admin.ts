import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

/**
 * Admin access is controlled by the ADMIN_EMAILS env var (comma-separated).
 * If no allowlist is configured, any authenticated user is treated as an admin
 * (MVP convenience so the review queue is reachable out of the box). Set
 * ADMIN_EMAILS in production to lock it down.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  const list = adminEmails();
  if (list.length === 0) return true; // no allowlist => any signed-in user
  if (!email) return false;
  return list.includes(email.toLowerCase());
}

export type AdminCheck = {
  ok: boolean;
  authenticated: boolean;
  session: Session | null;
  email: string | null;
};

export async function checkAdmin(): Promise<AdminCheck> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const authenticated = !!session?.user;
  return { ok: authenticated && isAdminEmail(email), authenticated, session, email };
}

/**
 * Route-handler guard. Returns a NextResponse to short-circuit (401/403) when
 * the caller is not an admin, or null when access is granted.
 *
 *   const denied = await adminGuard();
 *   if (denied) return denied;
 */
export async function adminGuard(): Promise<NextResponse | null> {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
