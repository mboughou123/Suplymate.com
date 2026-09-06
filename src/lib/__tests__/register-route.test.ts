import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const findUnique = vi.fn();
const create = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...a: unknown[]) => findUnique(...a), create: (...a: unknown[]) => create(...a) } },
}));
vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(async (p: string) => `hashed:${p}`),
}));

import { POST } from "@/app/api/auth/register/route";

function post(body: unknown, raw = false) {
  return POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

const valid = {
  name: "Ada Lovelace",
  email: "Ada@Example.com",
  password: "engine1842",
  confirmPassword: "engine1842",
  acceptTerms: true,
  role: "supplier",
  company: "Analytical Engines Ltd",
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects a non-JSON body with 400", async () => {
    const res = await post("nope", true);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "invalidBody" });
  });

  it("returns field-level errors + codes for invalid input", async () => {
    const res = await post({ ...valid, email: "bad", password: "short", confirmPassword: "x" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation");
    expect(body.codes).toEqual({
      email: "emailInvalid",
      password: "passwordTooShort",
      confirmPassword: "confirmMismatch",
    });
    expect(body.fields.email).toMatch(/valid email/);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("creates the user with a normalized email and hashed password", async () => {
    findUnique.mockResolvedValue(null);
    create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "u1",
      email: data.email,
      name: data.name,
      role: data.role,
    }));
    const res = await post(valid);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      ok: true,
      user: { id: "u1", email: "ada@example.com", name: "Ada Lovelace", role: "supplier" },
    });
    const { data } = create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({
      email: "ada@example.com",
      passwordHash: "hashed:engine1842",
      firstName: "Ada",
      lastName: "Lovelace",
      company: "Analytical Engines Ltd",
      role: "supplier",
    });
    expect(data.onboardedAt).toBeInstanceOf(Date);
  });

  it("returns 409 when the email is already registered", async () => {
    findUnique.mockResolvedValue({ id: "existing" });
    const res = await post(valid);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      code: "emailTaken",
      codes: { email: "emailTaken" },
      fields: { email: "An account with this email already exists." },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("maps a P2002 race on create to 409", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await post(valid);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ codes: { email: "emailTaken" } });
  });

  it("maps an unreachable database to 503 with a friendly message", async () => {
    findUnique.mockRejectedValue(
      new Prisma.PrismaClientInitializationError(
        "Environment variable not found: DATABASE_URL.",
        "test",
      ),
    );
    const res = await post(valid);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("dbUnavailable");
    expect(body.error).toMatch(/try again/i);
  });

  it("maps unexpected failures to a generic 500", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(new Error("boom"));
    const res = await post(valid);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ code: "registrationFailed" });
  });
});
