import { auth } from "@/auth";
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
