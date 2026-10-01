export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  // Dynamic imports keep Prisma out of the edge-runtime instrumentation bundle.
  const [{ prisma }, { ensureSchema }] = await Promise.all([
    import("@/lib/prisma"),
    import("@/lib/schema-repair"),
  ]);
  void ensureSchema(prisma);
}
