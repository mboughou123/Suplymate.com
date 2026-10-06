import { afterEach, describe, expect, it } from "vitest";
import { entitlementsFor } from "@/lib/permissions";
import { hasFullAccessEmail } from "@/lib/full-access";
import { splitByCategoryAllowance, toPublicEntitlements, upgradeHref } from "@/lib/plan-gating";

describe("splitByCategoryAllowance", () => {
  const items = [
    { id: 1, c: "metals" },
    { id: 2, c: "metals" },
    { id: 3, c: "packaging" },
    { id: 4, c: "metals" },
    { id: 5, c: "packaging" },
  ];

  it("keeps the first N of every category open, in order", () => {
    const { open, locked } = splitByCategoryAllowance(items, 2, (i) => i.c);
    expect(open.map((i) => i.id)).toEqual([1, 2, 3, 5]);
    expect(locked.map((i) => i.id)).toEqual([4]);
  });

  it("opens everything when the limit is null", () => {
    const { open, locked } = splitByCategoryAllowance(items, null, (i) => i.c);
    expect(open).toHaveLength(5);
    expect(locked).toHaveLength(0);
  });
});

describe("plan entitlements", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("limits Free to 5 per category, 5 AI questions, 5 saved suppliers and no direct contact", () => {
    const free = entitlementsFor({ plan: "free", email: "buyer@example.com" });
    expect(free.fullAccess).toBe(false);
    expect(free.suppliersPerCategory).toBe(5);
    expect(free.productsPerCategory).toBe(5);
    expect(free.aiQuestionsPerMonth).toBe(5);
    expect(free.savedSuppliersLimit).toBe(5);
    expect(free.directSupplierContact).toBe(false);
  });

  it("gives Basic unlimited browsing, contact details and 20 AI questions", () => {
    const basic = entitlementsFor("basic");
    expect(basic.suppliersPerCategory).toBeNull();
    expect(basic.directSupplierContact).toBe(true);
    expect(basic.aiQuestionsPerMonth).toBe(20);
    expect(basic.priceHistoryMonths).toBe(12);
  });

  it("unlocks everything on Pro", () => {
    const pro = entitlementsFor("premium");
    expect(pro.aiQuestionsPerMonth).toBeNull();
    expect(pro.priceHistoryMonths).toBeNull();
    expect(pro.exportReporting).toBe(true);
  });

  it("gives the owner account full access whatever plan is stored", () => {
    expect(hasFullAccessEmail("Info@Suplymate.com ")).toBe(true);
    const owner = entitlementsFor({ plan: "free", email: "info@suplymate.com" });
    expect(owner.fullAccess).toBe(true);
    expect(owner.suppliersPerCategory).toBeNull();
    expect(owner.aiQuestionsPerMonth).toBeNull();
    expect(owner.directSupplierContact).toBe(true);
  });

  it("does not hand full access to moderation admins or when emails are missing", () => {
    process.env.ADMIN_EMAILS = "moderator@example.com";
    expect(entitlementsFor({ plan: "free", email: "moderator@example.com" }).fullAccess).toBe(false);
    expect(hasFullAccessEmail(null)).toBe(false);
    process.env.FULL_ACCESS_EMAILS = "cofounder@example.com";
    expect(hasFullAccessEmail("cofounder@example.com")).toBe(true);
  });

  it("exposes only plan limits to the browser", () => {
    const pub = toPublicEntitlements(entitlementsFor("free"), false);
    expect(pub).toMatchObject({ signedIn: false, plan: "free", suppliersPerCategory: 5 });
    expect(pub).not.toHaveProperty("teamSeats");
  });

  it("sends guests to signup and members to the subscription page", () => {
    expect(upgradeHref(false)).toBe("/signup?plan=basic");
    expect(upgradeHref(true)).toBe("/settings/subscription?plan=basic");
  });
});
