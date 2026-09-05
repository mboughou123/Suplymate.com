import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  SIGNUP_ERROR_MESSAGES,
  splitName,
  validateSignup,
  type SignupField,
  type SignupFieldErrors,
} from "@/lib/validation/signup";

export const runtime = "nodejs";

type ErrorBody = {
  error: string;
  /** Machine-readable reason so the UI can translate it. */
  code: "invalidBody" | "validation" | "emailTaken" | "dbUnavailable" | "registrationFailed";
  /** Human-readable, per-field English messages. */
  fields?: Partial<Record<SignupField, string>>;
  /** Per-field error codes (see SignupErrorCode) for i18n on the client. */
  codes?: SignupFieldErrors;
};

function fieldErrorResponse(
  status: number,
  code: ErrorBody["code"],
  codes: SignupFieldErrors,
  summary?: string,
) {
  const fields: Partial<Record<SignupField, string>> = {};
  for (const [field, errorCode] of Object.entries(codes) as [
    SignupField,
    SignupFieldErrors[SignupField],
  ][]) {
    if (errorCode) fields[field] = SIGNUP_ERROR_MESSAGES[errorCode];
  }
  const firstMessage = Object.values(fields)[0];
  const body: ErrorBody = {
    error: summary ?? firstMessage ?? "Please check the highlighted fields.",
    code,
    fields,
    codes,
  };
  return NextResponse.json(body, { status });
}

const DB_UNAVAILABLE_MESSAGE =
  "We can't reach our database right now. Please try again in a moment.";

/** Prisma raises these when the DB is unreachable / not configured. */
function isDatabaseUnavailable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P1000–P1017: authentication / can't reach / timeout / connection closed.
    return /^P10\d\d$/.test(err.code);
  }
  if (err instanceof Prisma.PrismaClientRustPanicError) return true;
  const message = err instanceof Error ? err.message : "";
  return /DATABASE_URL|ECONNREFUSED|Can't reach database|connection/i.test(message);
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const res: ErrorBody = { error: "Invalid request body.", code: "invalidBody" };
    return NextResponse.json(res, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    const res: ErrorBody = { error: "Invalid request body.", code: "invalidBody" };
    return NextResponse.json(res, { status: 400 });
  }

  const validation = validateSignup(body as Record<string, unknown>);
  if (!validation.ok) {
    return fieldErrorResponse(400, "validation", validation.errors);
  }

  const { name, email, password, role, company } = validation.data;
  const { firstName, lastName } = splitName(name);

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return fieldErrorResponse(409, "emailTaken", { email: "emailTaken" });
    }

    const passwordHash = await hashPassword(password);

    // The account type is chosen at signup, so the user is considered onboarded
    // and lands directly on their workspace instead of bouncing through /onboarding.
    const user = await prisma.user.create({
      data: {
        name,
        firstName,
        lastName,
        email,
        passwordHash,
        company,
        role,
        onboardedAt: new Date(),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    // Race between findUnique and create (two tabs / double submit).
    if (isUniqueViolation(err)) {
      return fieldErrorResponse(409, "emailTaken", { email: "emailTaken" });
    }
    if (isDatabaseUnavailable(err)) {
      console.error("[register] database unavailable:", err instanceof Error ? err.message : err);
      const res: ErrorBody = { error: DB_UNAVAILABLE_MESSAGE, code: "dbUnavailable" };
      return NextResponse.json(res, { status: 503 });
    }
    console.error("[register] failed:", err);
    const res: ErrorBody = {
      error: "We couldn't create your account. Please try again.",
      code: "registrationFailed",
    };
    return NextResponse.json(res, { status: 500 });
  }
}
