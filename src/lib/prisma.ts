import { PrismaClient } from "@prisma/client";
import { checkEnv } from "@/lib/env";

// Non-fatal startup validation: warns about misconfiguration, never throws.
checkEnv();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
