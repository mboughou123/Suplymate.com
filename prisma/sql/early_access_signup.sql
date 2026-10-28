-- Early-access signups. Idempotent. Applied automatically on production builds
-- via prisma db push and prisma/schema-repair.sql. Run this file directly only
-- when the table is needed before the next production deploy:
--   npx prisma db execute --file prisma/sql/early_access_signup.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "EarlyAccessSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "company" TEXT,
    "role" TEXT,
    "categories" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "referrer" TEXT,
    "landingPath" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarlyAccessSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EarlyAccessSignup_email_key" ON "EarlyAccessSignup"("email");
CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_createdAt_idx" ON "EarlyAccessSignup"("createdAt");
CREATE INDEX IF NOT EXISTS "EarlyAccessSignup_utmSource_idx" ON "EarlyAccessSignup"("utmSource");
