// @vitest-environment node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { detectSchemaDrift, repairSchema, schemaRepairAllowed } from "@/lib/schema-repair";
import { SCHEMA_TABLES } from "@/lib/schema-repair.generated";

const root = path.resolve(__dirname, "../../..");

describe("schema repair", () => {
  it("generated repair files match prisma/schema.prisma", () => {
    const result = spawnSync("node", ["scripts/gen-schema-repair.mjs", "--check"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.stderr).not.toMatch(/stale/);
    expect(result.status).toBe(0);
  }, 60_000);

  it("covers the columns sign-up writes", () => {
    expect(SCHEMA_TABLES.User).toEqual(
      expect.arrayContaining(["email", "passwordHash", "role", "onboardedAt", "firstName", "updatedAt"]),
    );
  });

  it("never changes the shared database from preview deployments", () => {
    expect(schemaRepairAllowed({ VERCEL_ENV: "preview" })).toBe(false);
    expect(schemaRepairAllowed({ VERCEL_ENV: "production" })).toBe(true);
    expect(schemaRepairAllowed({})).toBe(true);
    expect(schemaRepairAllowed({ VERCEL_ENV: "production", SCHEMA_SELF_HEAL: "0" })).toBe(
      false,
    );
  });

  // Destructive: point SCHEMA_REPAIR_TEST_DATABASE_URL at a throwaway database.
  const url = process.env.SCHEMA_REPAIR_TEST_DATABASE_URL;
  it.skipIf(!url)("repairs a drifted database and leaves sign-up working", async () => {
    const db = new PrismaClient({ datasources: { db: { url } } });
    try {
      await db.$executeRawUnsafe('ALTER TABLE "User" DROP COLUMN IF EXISTS "onboardedAt"');
      await db.$executeRawUnsafe('ALTER TABLE "User" DROP COLUMN IF EXISTS "role"');
      await db.$executeRawUnsafe('DROP TABLE IF EXISTS "CareerApplication"');
      await db.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "legacyRequired" TEXT');
      await db.$executeRawUnsafe(`UPDATE "User" SET "legacyRequired" = 'x'`);
      await db.$executeRawUnsafe('ALTER TABLE "User" ALTER COLUMN "legacyRequired" SET NOT NULL');

      const before = await detectSchemaDrift(db);
      expect(before.missingColumns).toEqual(expect.arrayContaining(["User.onboardedAt", "User.role"]));
      expect(before.missingTables).toContain("CareerApplication");

      expect(await repairSchema(db)).toEqual({ missingTables: [], missingColumns: [] });
      expect(await repairSchema(db)).toEqual({ missingTables: [], missingColumns: [] });

      const email = `repair-${Date.now()}@example.com`;
      const user = await db.user.create({
        data: { name: "Repair Probe", email, passwordHash: "h", role: "buyer", onboardedAt: new Date() },
      });
      expect(user.role).toBe("buyer");
      await db.user.delete({ where: { id: user.id } });
    } finally {
      await db.$disconnect();
    }
  }, 60_000);
});
