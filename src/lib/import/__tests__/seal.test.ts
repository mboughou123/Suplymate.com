import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { rows } = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mediaAuditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `a${rows.length + 1}`, createdAt: new Date(), ...data };
        rows.push(row);
        return row;
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        rows.filter((r) => Object.entries(where).every(([k, v]) => r[k] === v)),
    },
  },
}));

import { parseSeal, verifySeal, sha256Hex, sealRequired, dayStatus, recordDayPart, resetLedgerMemory } from "@/lib/import/seal";

const suppliers = '{"suppliers":[{"company_name":"POSCO"}]}';
const products = '{"products":[]}';
const goodSeal = {
  day: "2026-09-02",
  researcherOk: true,
  approvedBy: "Researcher",
  approvedAt: "2026-09-02T19:40:00Z",
  sha256: { "suppliers.json": sha256Hex(suppliers), "products.json": sha256Hex(products) },
};

beforeEach(() => {
  rows.length = 0;
  resetLedgerMemory();
});
afterEach(() => vi.unstubAllEnvs());

describe("parseSeal", () => {
  it("parses the canonical form and common aliases", () => {
    const s = parseSeal(goodSeal);
    expect(s).toMatchObject({ day: "2026-09-02", researcherOk: true, approvedBy: "Researcher" });
    expect(s?.digest).toMatch(/^[a-f0-9]{64}$/);

    const alias = parseSeal(JSON.stringify({ date: "2026-09-02", research_ok: "yes", approved_by: "QA", hashes: { "./suppliers.json": sha256Hex(suppliers) } }));
    expect(alias).toMatchObject({ day: "2026-09-02", researcherOk: true, approvedBy: "QA" });
    expect(alias?.sha256["suppliers.json"]).toBe(sha256Hex(suppliers));

    expect(parseSeal({ seal: goodSeal })?.day).toBe("2026-09-02");
    expect(parseSeal({ seals: [goodSeal] })?.day).toBe("2026-09-02");
  });

  it("rejects malformed seals", () => {
    expect(parseSeal(null)).toBeNull();
    expect(parseSeal("not json")).toBeNull();
    expect(parseSeal({ researcherOk: true })).toBeNull();
    expect(parseSeal({ day: "Sept 2", researcherOk: true })).toBeNull();
  });

  it("digest depends on day + hashes only (not on approvedAt)", () => {
    const a = parseSeal(goodSeal)!;
    const b = parseSeal({ ...goodSeal, approvedAt: "2026-09-03T00:00:00Z", note: "x" })!;
    const c = parseSeal({ ...goodSeal, sha256: { ...goodSeal.sha256, "products.json": sha256Hex("changed") } })!;
    expect(a.digest).toBe(b.digest);
    expect(a.digest).not.toBe(c.digest);
  });
});

describe("verifySeal", () => {
  const files = { "suppliers.json": suppliers, "products.json": products };

  it("accepts a Researcher-approved seal for the right day with matching hashes", () => {
    const r = verifySeal(goodSeal, { day: "2026-09-02", files });
    expect(r.ok).toBe(true);
  });

  it("rejects missing / not-approved / wrong-day seals", () => {
    expect(verifySeal(null, { day: "2026-09-02", files })).toMatchObject({ ok: false, reason: expect.stringMatching(/missing or malformed/) });
    expect(verifySeal({ ...goodSeal, researcherOk: false }, { day: "2026-09-02", files })).toMatchObject({ ok: false, reason: expect.stringMatching(/not Researcher-approved/) });
    expect(verifySeal(goodSeal, { day: "2026-09-03", files })).toMatchObject({ ok: false, reason: expect.stringMatching(/does not match pushed day/) });
  });

  it("rejects a hash mismatch but ignores files not present in this chunk", () => {
    const tampered = verifySeal(goodSeal, { day: "2026-09-02", files: { ...files, "products.json": '{"products":[{"product_name":"x"}]}' } });
    expect(tampered).toMatchObject({ ok: false, reason: "sha256 mismatch for products.json" });
    const partial = verifySeal(goodSeal, { day: "2026-09-02", files: { "suppliers.json": suppliers } });
    expect(partial.ok).toBe(true);
  });

  it("accepts a seal without hashes and without a pushed day", () => {
    expect(verifySeal({ day: "2026-09-02", researcherOk: true }, { day: null, files: {} }).ok).toBe(true);
  });
});

describe("sealRequired", () => {
  it("defaults to true and honours false-y values", () => {
    expect(sealRequired({} as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(sealRequired({ IMPORT_REQUIRE_SEAL: "false" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(sealRequired({ IMPORT_REQUIRE_SEAL: "0" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(sealRequired({ IMPORT_REQUIRE_SEAL: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });
});

describe("per-day ledger", () => {
  it("tracks chunks per seal digest and reports completion", async () => {
    const seal = parseSeal(goodSeal)!;
    let st = await dayStatus(seal.day, seal.digest);
    expect(st).toMatchObject({ partsDone: [], of: null, complete: false });

    await recordDayPart({ day: seal.day, digest: seal.digest, part: 1, of: 3, actor: "grok-bot" });
    await recordDayPart({ day: seal.day, digest: seal.digest, part: 3, of: 3, actor: "grok-bot" });
    st = await dayStatus(seal.day, seal.digest);
    expect(st.partsDone).toEqual([1, 3]);
    expect(st.complete).toBe(false);

    await recordDayPart({ day: seal.day, digest: seal.digest, part: 2, of: 3, actor: "grok-bot" });
    st = await dayStatus(seal.day, seal.digest);
    expect(st.complete).toBe(true);
    expect(rows.filter((r) => r.action === "import_day" && r.entityType === "IMPORT_DAY" && r.entityId === "2026-09-02")).toHaveLength(3);
    expect(rows[0].adminUser).toBe("grok-bot");

    // A revised pack (different digest) starts from scratch.
    const revised = parseSeal({ ...goodSeal, sha256: { "suppliers.json": sha256Hex("v2") } })!;
    expect((await dayStatus(revised.day, revised.digest)).complete).toBe(false);
  });

  it("survives without a database via the in-memory mirror", async () => {
    // Make DB reads/writes fail: the memory mirror must still answer.
    const { prisma } = await import("@/lib/prisma");
    const spyCreate = vi.spyOn(prisma.mediaAuditLog, "create").mockRejectedValue(new Error("no db"));
    const spyFind = vi.spyOn(prisma.mediaAuditLog, "findMany").mockRejectedValue(new Error("no db"));
    await recordDayPart({ day: "2026-09-05", digest: "d", part: 1, of: 1, actor: "grok-bot" });
    const st = await dayStatus("2026-09-05", "d");
    expect(st.complete).toBe(true);
    spyCreate.mockRestore();
    spyFind.mockRestore();
  });
});
