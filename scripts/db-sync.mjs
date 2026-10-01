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

if (result.status !== 0) {
  console.error("[db-sync] prisma db push failed — falling back to the additive repair script.");
}

// Always apply the idempotent repair (see scripts/gen-schema-repair.mjs): it
// covers what a refused push leaves behind and never drops data.
const repair = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--file", "prisma/schema-repair.sql", "--schema", "prisma/schema.prisma"],
  { stdio: "inherit", env },
);
if (repair.status !== 0) {
  console.error(
    "[db-sync] WARNING: schema repair failed. Production servers will retry it on startup and on " +
      "the first sign-up that hits a missing column.",
  );
}
