import { stripLocalePrefix } from "@/i18n/routing";

/**
 * Soft `router.push` after `signIn({ redirect: false })` races `auth()` and
 * bounces back to /login. Hard-nav to this href so the session cookie is
 * visible on the next document request.
 */
export function postAuthAssignHref(
  locale: string,
  path = "/dashboard",
): string {
  const safeLocale = locale?.trim() || "en";
  const target = path.startsWith("/") ? path : `/${path}`;
  return `/${safeLocale}${target}`;
}

/** Reject off-site or auth-page callbackUrls so login never loops. */
export function normalizeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "/dashboard";
  if (/^https?:\/\//i.test(raw)) return "/dashboard";
  const path = stripLocalePrefix(raw.trim());
  if (!path.startsWith("/")) return "/dashboard";
  if (path === "/login" || path === "/signup" || path === "/forgot-password") {
    return "/dashboard";
  }
  return path;
}
