import { beforeEach, describe, expect, it, vi } from "vitest";

const viewer: { userId: string | null; plan: string } = { userId: null, plan: "free" };

vi.mock("@/auth", () => ({
  auth: async () => (viewer.userId ? { user: { id: viewer.userId } } : null),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: async () => ({ plan: viewer.plan }) } },
}));

vi.mock("@/lib/data-service", () => ({
  getSuppliersFromDb: async () => [
    { id: "sarfraz-steel", name: "Sarfraz Steel", phone: "+91 80828 21432", email: "sales@sarfraz.in" },
    { id: "quiet-mill", name: "Quiet Mill" },
  ],
  getSupplierById: async () => null,
}));

import { GET } from "@/app/api/supplier-contacts/route";

async function lookup(ids: string) {
  const res = await GET(new Request(`http://localhost/api/supplier-contacts?ids=${ids}`));
  return { res, text: await res.text() };
}

describe("GET /api/supplier-contacts", () => {
  beforeEach(() => {
    viewer.userId = null;
    viewer.plan = "free";
  });

  it("rejects empty requests", async () => {
    expect((await lookup("")).res.status).toBe(400);
  });

  it("sends guests availability only", async () => {
    const { res, text } = await lookup("sarfraz-steel,quiet-mill,missing");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(text).not.toMatch(/80828|sarfraz\.in/);
    expect(JSON.parse(text).contacts).toEqual({
      "sarfraz-steel": { access: "locked", reason: "guest", hasPhone: true, hasEmail: true },
      "quiet-mill": { access: "locked", reason: "guest", hasPhone: false, hasEmail: false },
    });
  });

  it("sends Free users availability only", async () => {
    viewer.userId = "u1";
    const { text } = await lookup("sarfraz-steel");
    expect(text).not.toMatch(/80828|sarfraz\.in/);
    expect(JSON.parse(text).contacts["sarfraz-steel"].reason).toBe("plan");
  });

  it("sends paid and trial users the phone and email", async () => {
    viewer.userId = "u2";
    viewer.plan = "basic";
    const { text } = await lookup("sarfraz-steel");
    expect(JSON.parse(text).contacts["sarfraz-steel"]).toEqual({
      access: "full",
      phone: "+91 80828 21432",
      email: "sales@sarfraz.in",
      phoneSource: "listing",
      emailSource: "listing",
    });
  });

  it("gates Logistics & Insurance provider contact the same way", async () => {
    const guest = await lookup("falvey-cargo,kuehne-nagel-cargo-insurance");
    expect(guest.text).not.toMatch(/792-0144|falveyins/);
    expect(JSON.parse(guest.text).contacts).toEqual({
      "falvey-cargo": { access: "locked", reason: "guest", hasPhone: true, hasEmail: true },
      "kuehne-nagel-cargo-insurance": { access: "locked", reason: "guest", hasPhone: false, hasEmail: false },
    });

    viewer.userId = "u3";
    viewer.plan = "pro";
    const paid = await lookup("falvey-cargo");
    expect(JSON.parse(paid.text).contacts["falvey-cargo"]).toEqual({
      access: "full",
      phone: "+1 (401) 792-0144",
      email: "info@falveyins.com",
      phoneSource: "website",
      emailSource: "website",
    });
  });
});
