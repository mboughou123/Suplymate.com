import createIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { routing, stripLocalePrefix } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const { auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname;
      const path = stripLocalePrefix(pathname);
      const isLoggedIn = !!session?.user;

      const protectedPaths = [
        "/dashboard",
        "/settings",
        "/messages",
        "/rfqs",
        "/supplier-dashboard",
        "/onboarding",
        "/notifications",
        "/purchase-orders",
        "/saved",
        "/api/price-alerts",
        "/api/account",
        "/admin",
      ];
      const isProtected = protectedPaths.some(
        (p) => path === p || path.startsWith(`${p}/`),
      );

      if (isProtected && !isLoggedIn) return false;

      if (isLoggedIn && (path === "/login" || path === "/signup")) {
        const locale = routing.locales.includes(
          pathname.split("/")[1] as (typeof routing.locales)[number],
        )
          ? pathname.split("/")[1]
          : routing.defaultLocale;
        return Response.redirect(
          new URL(`/${locale}/dashboard`, request.nextUrl),
        );
      }
      return true;
    },
  },
});

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API routes and static assets skip locale routing
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
