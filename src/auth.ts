import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;
        if (!email || !password) return null;

        // Select only the columns auth needs so sign-in keeps working even if
        // newer additive columns haven't been migrated on this database yet.
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, passwordHash: true },
        });
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        // Role is read separately so sign-in still succeeds on a database that
        // predates the column.
        let role: string | undefined;
        try {
          const extra = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });
          role = extra?.role ?? undefined;
        } catch {
          role = undefined;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
        };
      },
    }),
  ],
});
