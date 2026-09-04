import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing, stripLocalePrefix, type Locale } from "@/i18n/routing";
import { getSessionJwt } from "@/lib/auth-session-token";
import { homeForRole } from "@/lib/roles";

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/settings",
  "/messages",
  "/rfqs",
  "/supplier-dashboard",
  "/onboarding",
  "/notifications",
  "/purchase-orders",
  "/saved",
  "/admin",
];

const PROTECTED_API_PREFIXES = ["/api/price-alerts", "/api/account"];

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
  if (
    PROTECTED_API_PREFIXES.some(
      (p) => path === p || path.startsWith(`${p}/`),
    )
  ) {
    return true;
  }
  return PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
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

  const path = stripLocalePrefix(pathname);
  const locale = localeFromPathname(pathname);

  // Only parse JWT on protected routes or auth pages (login/signup redirect).
  const needsAuthCheck =
    isProtectedPath(pathname) || path === "/login" || path === "/signup";

  if (needsAuthCheck) {
    const token = await getSessionJwt(req);
    const isLoggedIn = !!token;

    if (isProtectedPath(pathname) && !isLoggedIn) {
      const loginUrl = new URL(`/${locale}/login`, req.nextUrl);
      // Store locale-stripped path so LoginForm can feed next-intl's router
      // (which expects `/dashboard`, not `/en/dashboard`).
      loginUrl.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(loginUrl);
    }

    if (isLoggedIn && (path === "/login" || path === "/signup")) {
      return NextResponse.redirect(
        new URL(`/${locale}${homeForRole(token?.role)}`, req.nextUrl),
      );
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
