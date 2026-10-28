import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ensureSchema } from "@/lib/schema-repair";
import {
  EARLY_ACCESS_ERROR_MESSAGES,
  validateEarlyAccess,
  type EarlyAccessData,
  type EarlyAccessErrors,
  type EarlyAccessField,
} from "@/lib/early-access";

export const runtime = "nodejs";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function fieldMessages(errors: EarlyAccessErrors): Partial<Record<EarlyAccessField, string>> {
  const fields: Partial<Record<EarlyAccessField, string>> = {};
  for (const [field, code] of Object.entries(errors) as [EarlyAccessField, EarlyAccessErrors[EarlyAccessField]][]) {
    if (code) fields[field] = EARLY_ACCESS_ERROR_MESSAGES[code];
  }
  return fields;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function isSchemaOutOfDate(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2011", "P2021", "P2022"].includes(err.code)
  );
}

function isDatabaseUnavailable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) return /^P10\d\d$/.test(err.code);
  const message = err instanceof Error ? err.message : "";
  return /DATABASE_URL|ECONNREFUSED|Can't reach database|connection/i.test(message);
}

async function createSignup(data: EarlyAccessData) {
  return prisma.earlyAccessSignup.create({
    data: {
      ...data,
      categories: JSON.stringify(data.categories),
    },
    select: { id: true },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const fields = body as Record<string, unknown>;

  // Honeypot. Bots fill hidden fields; people never see this one.
  if (typeof fields.fax === "string" && fields.fax.trim()) {
    return NextResponse.json({ ok: true, status: "created" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(`early-access:${ip}`, MAX_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.resetInSeconds) } },
    );
  }

  const result = validateEarlyAccess(fields);
  if (!result.ok) {
    return NextResponse.json(
      { error: "validation", fields: fieldMessages(result.errors), codes: result.errors },
      { status: 400 },
    );
  }

  try {
    try {
      await createSignup(result.data);
    } catch (err) {
      if (!isSchemaOutOfDate(err)) throw err;
      console.warn("[early-access] schema drift detected, repairing:", err instanceof Error ? err.message : err);
      await ensureSchema(prisma, { force: true });
      await createSignup(result.data);
    }
    return NextResponse.json({ ok: true, status: "created" });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ ok: true, status: "duplicate" });
    }
    if (isDatabaseUnavailable(err)) {
      console.error("[early-access] database unavailable:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "db_unavailable" }, { status: 503 });
    }
    if (isSchemaOutOfDate(err)) {
      console.error("[early-access] schema out of date:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "schema_out_of_date" }, { status: 503 });
    }
    console.error("[early-access] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
