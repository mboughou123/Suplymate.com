// Keeps the production database schema in step with prisma/schema.prisma.
//
// Runs `prisma db push` during Vercel *production* builds only: preview builds
// of other branches share the same DATABASE_URL and must not push their schema.
// Without --accept-data-loss Prisma refuses any change that would drop data, so
// this only ever applies additive changes (new tables, columns, indexes).
import { spawnSync } from "node:child_process";

const isProductionBuild = process.env.VERCEL_ENV === "production" || process.env.DB_SYNC_ON_BUILD === "1";

if (!isProductionBuild) {
  console.log("[db-sync] skipped (not a production build)");
  process.exit(0);
}
if (!process.env.DATABASE_URL) {
  console.warn("[db-sync] DATABASE_URL is not set — skipping schema sync");
  process.exit(0);
}

const env = { ...process.env, DIRECT_URL: process.env.DIRECT_URL || process.env.DATABASE_URL };
const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", env });

// A refused push (e.g. the database holds columns this schema would drop) must
// not block the deploy; it is reported loudly instead.
if (result.status !== 0) {
  console.error(
    "[db-sync] WARNING: prisma db push failed. The deployed code may not match the database " +
      "schema — run `npm run db:push` against production and resolve the error above.",
  );
}
