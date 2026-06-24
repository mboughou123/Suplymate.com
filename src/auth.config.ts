import type { NextAuthConfig } from "next-auth";

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
      const path = request.nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const protectedPaths = [
        "/dashboard",
        "/settings",
        "/messages",
        "/rfqs",
        "/supplier-dashboard",
        "/onboarding",
        "/api/price-alerts",
        "/api/account",
        "/admin",
      ];
      const isProtected = protectedPaths.some(
        (p) => path === p || path.startsWith(`${p}/`)
      );

      if (isProtected && !isLoggedIn) return false;
      if (isLoggedIn && (path === "/login" || path === "/signup")) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};
