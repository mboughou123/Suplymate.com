import type { NextAuthConfig } from "next-auth";
import { routing, stripLocalePrefix } from "@/i18n/routing";
import { homeForRole } from "@/lib/roles";

export const authConfig: NextAuthConfig = {
  // Required when running behind a proxy / custom domain (e.g. Vercel + suplymate.com)
  trustHost: true,
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;
      const path = stripLocalePrefix(pathname);
      const isLoggedIn = !!auth?.user;
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
          new URL(`/${locale}${homeForRole(auth?.user?.role)}`, request.nextUrl),
        );
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        if (user.role) token.role = user.role;
      }
      // `update({ role })` from the client after switching account type.
      if (trigger === "update" && session && typeof session === "object") {
        const next = session as { role?: unknown; name?: unknown };
        if (typeof next.role === "string") token.role = next.role;
        if (typeof next.name === "string") token.name = next.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = (token.role as string | undefined) ?? "buyer";
      }
      return session;
    },
  },
};
