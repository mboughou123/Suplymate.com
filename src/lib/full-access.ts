/**
 * Owner accounts that bypass every plan lock and limit. Kept separate from the
 * ADMIN_EMAILS moderation allowlist, which falls open when unset and must never
 * hand out paid features.
 */
const OWNER_EMAILS = ["info@suplymate.com"];

export function fullAccessEmails(): string[] {
  const extra = (process.env.FULL_ACCESS_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...OWNER_EMAILS, ...extra])];
}

export function hasFullAccessEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return fullAccessEmails().includes(email.trim().toLowerCase());
}
