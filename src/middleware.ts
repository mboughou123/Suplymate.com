import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import {
  routing,
  stripLocalePrefix,
  isRetiredLocale,
  type Locale,
} from "@/i18n/routing";
import {
  PROTECTED_PREFIXES,
  PROTECTED_API_PREFIXES,
  matchesPrefix,
} from "@/lib/protected-routes";

const intlMiddleware = createIntlMiddleware(routing);


function shouldSkip(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.includes(".")
  );
}

function isProtectedPath(pathname: string): boolean {
  const path = stripLocalePrefix(pathname);
  return (
    matchesPrefix(path, PROTECTED_API_PREFIXES) ||
    matchesPrefix(path, PROTECTED_PREFIXES)
  );
}

function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  if (routing.locales.includes(segment as Locale)) {
    return segment as Locale;
  }
  return routing.defaultLocale;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  // The site is English-only for now. Send previously-served locale URLs to
  // their English equivalent with a permanent redirect; without this, the intl
  // middleware would treat "/fr" as a path segment and produce "/en/fr/...",
  // turning every indexed non-English URL into a 404.
  const firstSegment = pathname.split("/")[1] ?? "";
  if (isRetiredLocale(firstSegment)) {
    const target = req.nextUrl.clone();
    target.pathname = `/${routing.defaultLocale}${stripLocalePrefix(pathname)}`;
    return NextResponse.redirect(target, 308);
  }

  const path = stripLocalePrefix(pathname);
  const locale = localeFromPathname(pathname);

  // Only parse JWT on protected routes or auth pages (login/signup redirect).
  const needsAuthCheck =
    isProtectedPath(pathname) || path === "/login" || path === "/signup";

  if (needsAuthCheck) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
    });
    const isLoggedIn = !!token;

    if (isProtectedPath(pathname) && !isLoggedIn) {
      const loginUrl = new URL(`/${locale}/login`, req.nextUrl);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isLoggedIn && (path === "/login" || path === "/signup")) {
      return NextResponse.redirect(
        new URL(`/${locale}/dashboard`, req.nextUrl),
      );
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
