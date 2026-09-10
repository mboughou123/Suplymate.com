import { getToken, type JWT } from "next-auth/jwt";
import type { NextRequest } from "next/server";

type HeaderReader = {
  headers: { get(name: string): string | null };
  nextUrl: { protocol: string };
};

/** Auth.js reads AUTH_SECRET, then NEXTAUTH_SECRET. Middleware must match. */
export function authJwtSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return secret && secret.trim().length > 0 ? secret : undefined;
}

/**
 * Auth.js prefixes the session cookie with `__Secure-` on HTTPS
 * (`__Secure-authjs.session-token`). `getToken()` defaults `secureCookie` to
 * false, so it looks for `authjs.session-token` and misses the real cookie —
 * middleware then treats a valid session as logged-out and redirects to login.
 */
export function sessionCookieUsesSecurePrefix(
  cookieHeader: string | null | undefined,
): boolean | null {
  if (!cookieHeader) return null;
  if (/(?:^|;\s*)__Secure-authjs\.session-token(?:\.|=)/.test(cookieHeader)) {
    return true;
  }
  if (/(?:^|;\s*)authjs\.session-token(?:\.|=)/.test(cookieHeader)) {
    return false;
  }
  return null;
}

export function shouldUseSecureAuthCookie(req: HeaderReader): boolean {
  const fromCookie = sessionCookieUsesSecurePrefix(req.headers.get("cookie"));
  if (fromCookie !== null) return fromCookie;

  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }

  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl?.startsWith("https://")) return true;
  if (authUrl?.startsWith("http://")) return false;

  return req.nextUrl.protocol === "https:";
}

export async function getSessionJwt(req: NextRequest): Promise<JWT | null> {
  const secret = authJwtSecret();
  const preferred = shouldUseSecureAuthCookie(req);

  try {
    const token = await getToken({
      req,
      secret,
      secureCookie: preferred,
    });
    if (token) return token;

    // Local http vs preview https can disagree with AUTH_URL; try the other name.
    return await getToken({
      req,
      secret,
      secureCookie: !preferred,
    });
  } catch {
    return null;
  }
}
