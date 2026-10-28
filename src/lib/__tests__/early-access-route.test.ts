import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const create = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    earlyAccessSignup: {
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

const ensureSchema = vi.fn(async () => null);
vi.mock("@/lib/schema-repair", () => ({
  ensureSchema: (...args: unknown[]) => ensureSchema(...(args as [])),
}));

import { POST } from "@/app/api/early-access/route";

function post(body: unknown, init?: { ip?: string; raw?: boolean }) {
  return POST(
    new Request("http://localhost/api/early-access", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": init?.ip ?? "203.0.113.10",
      },
      body: init?.raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

const valid = {
  email: "Buyer@Acme-Steel.com",
  name: "Ada Lovelace",
  company: "Acme Steel",
  role: "procurement",
  categories: ["Steel & Metals", "Tubes & Pipes"],
  note: "Looking for rebar mills with plant photos.",
  utmSource: "linkedin",
  utmMedium: "social",
  utmCampaign: "prelaunch",
  utmContent: "founder-post-1",
  referrer: "https://www.linkedin.com/",
  landingPath: "/en/supplier/acme-steel?utm_source=linkedin&utm_medium=social",
  locale: "en",
};

describe("POST /api/early-access", () => {
  beforeEach(() => {
    create.mockReset();
    ensureSchema.mockReset();
    ensureSchema.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("rejects a non-JSON body", async () => {
    const res = await post("nope", { raw: true, ip: "203.0.113.1" });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_body" });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a missing or invalid work email and an unknown role or category", async () => {
    const missing = await post({ ...valid, email: "  " }, { ip: "203.0.113.2" });
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({
      error: "validation",
      fields: { email: expect.stringMatching(/email/i) },
    });

    const badEmail = await post({ ...valid, email: "not-an-email" }, { ip: "203.0.113.3" });
    expect(badEmail.status).toBe(400);
    expect((await badEmail.json()).fields.email).toMatch(/valid/i);

    const badRole = await post({ ...valid, role: "intern" }, { ip: "203.0.113.4" });
    expect(badRole.status).toBe(400);
    expect((await badRole.json()).fields.role).toBeTruthy();

    const badCategory = await post(
      { ...valid, categories: ["Steel & Metals", "Unobtanium"] },
      { ip: "203.0.113.5" },
    );
    expect(badCategory.status).toBe(400);
    expect((await badCategory.json()).fields.categories).toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it("persists normalized email, optional fields, locale, and UTM attribution", async () => {
    create.mockResolvedValue({ id: "ea_1" });
    const res = await post(valid, { ip: "203.0.113.6" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "created" });

    const { data } = create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({
      email: "buyer@acme-steel.com",
      name: "Ada Lovelace",
      company: "Acme Steel",
      role: "procurement",
      categories: JSON.stringify(["Steel & Metals", "Tubes & Pipes"]),
      note: "Looking for rebar mills with plant photos.",
      utmSource: "linkedin",
      utmMedium: "social",
      utmCampaign: "prelaunch",
      utmContent: "founder-post-1",
      referrer: "https://www.linkedin.com/",
      landingPath: "/en/supplier/acme-steel?utm_source=linkedin&utm_medium=social",
      locale: "en",
    });
  });

  it("accepts snake_case UTM keys from the landing URL", async () => {
    create.mockResolvedValue({ id: "ea_2" });
    const res = await post(
      {
        email: "ops@mill.example",
        utm_source: "x",
        utm_medium: "social",
        utm_campaign: "prelaunch",
        utm_content: "thread-a",
        landing_path: "/en/early-access",
      },
      { ip: "203.0.113.7" },
    );
    expect(res.status).toBe(200);
    const { data } = create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({
      email: "ops@mill.example",
      name: null,
      company: null,
      role: null,
      categories: "[]",
      note: null,
      utmSource: "x",
      utmMedium: "social",
      utmCampaign: "prelaunch",
      utmContent: "thread-a",
      landingPath: "/en/early-access",
      locale: null,
    });
  });

  it("treats a duplicate email as already on the list", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const res = await post(valid, { ip: "203.0.113.8" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "duplicate" });
  });

  it("drops honeypot submissions without writing a row", async () => {
    const res = await post({ ...valid, fax: "filled-by-bot" }, { ip: "203.0.113.9" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, status: "created" });
    expect(create).not.toHaveBeenCalled();
  });

  it("rate-limits repeated submissions from the same IP", async () => {
    create.mockResolvedValue({ id: "ea_rl" });
    const ip = "203.0.113.50";
    let lastStatus = 0;
    for (let i = 0; i < 8; i++) {
      const res = await post({ ...valid, email: `buyer${i}@acme-steel.com` }, { ip });
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
    expect(create.mock.calls.length).toBeLessThan(8);
  });
});
