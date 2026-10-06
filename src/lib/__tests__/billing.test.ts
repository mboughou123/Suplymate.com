import { afterEach, describe, expect, it } from "vitest";
import {
  ANNUAL_DISCOUNT_PERCENT,
  PLANS,
  PLAN_LIMITS,
  SITE_PLAN_PRICES_CENTS,
  TRIAL_DAYS,
  annualPriceCents,
  formatUsdCents,
  normalizeBillingInterval,
  planPriceCents,
  stripePriceMatch,
  getPlanById,
  normalizePlanId,
  planForStripePriceId,
  stripePriceIdFor,
} from "@/lib/billing";

describe("site plan catalogue", () => {
  it("prices Basic at $49.95 with a 3-day trial", () => {
    const basic = getPlanById("basic");
    expect(basic.monthlyPrice).toBe(49.95);
    expect(basic.priceLabel).toBe("$49.95");
    expect(basic.trialDays).toBe(TRIAL_DAYS);
    expect(TRIAL_DAYS).toBe(3);
    expect(basic.cta).toBe("trial");
  });

  it("prices Pro (premium id) at $74.95", () => {
    const premium = getPlanById("premium");
    expect(premium.monthlyPrice).toBe(74.95);
    expect(premium.priceLabel).toBe("$74.95");
    expect(premium.trialDays).toBe(3);
    expect(premium.highlighted).toBe(true);
    expect(premium.name).toBe("Pro");
  });

  it("prices Enterprise at $199.95 as self-serve", () => {
    const enterprise = getPlanById("enterprise");
    expect(enterprise.monthlyPrice).toBe(199.95);
    expect(enterprise.priceLabel).toBe("$199.95");
    expect(enterprise.trialDays).toBe(0);
    expect(enterprise.cta).toBe("subscribe");
  });

  it("uses matching Stripe unit amounts in cents", () => {
    expect(SITE_PLAN_PRICES_CENTS).toEqual({
      basic: 4995,
      premium: 7495,
      enterprise: 19995,
    });
  });

  it("prices annual plans at twelve months less 10%", () => {
    expect(ANNUAL_DISCOUNT_PERCENT).toBe(10);
    expect(annualPriceCents("basic")).toBe(53946);
    expect(annualPriceCents("premium")).toBe(80946);
    expect(annualPriceCents("enterprise")).toBe(215946);
    expect(planPriceCents("basic", "month")).toBe(4995);
    expect(planPriceCents("basic", "year")).toBe(53946);
  });

  it("formats cents as dollars", () => {
    expect(formatUsdCents(4995)).toBe("$49.95");
    expect(formatUsdCents(215946)).toBe("$2,159.46");
    expect(formatUsdCents(0)).toBe("$0");
  });

  it("quotes the enforced limits in the Free and Basic feature lists", () => {
    expect(getPlanById("free").features).toContain(`${PLAN_LIMITS.free.aiQuestionsPerMonth} AI questions per month`);
    expect(getPlanById("basic").features).toContain(`${PLAN_LIMITS.basic.aiQuestionsPerMonth} AI questions per month`);
    expect(PLAN_LIMITS.free.suppliersPerCategory).toBe(5);
    expect(PLAN_LIMITS.free.savedSuppliers).toBe(5);
  });

  it("keeps one catalogue entry per plan id", () => {
    const ids = PLANS.map((p) => p.id);
    expect(ids).toEqual(["free", "basic", "premium", "enterprise"]);
  });
});

describe("billing interval", () => {
  it("normalizes anything that is not yearly to monthly", () => {
    expect(normalizeBillingInterval("year")).toBe("year");
    expect(normalizeBillingInterval("annual")).toBe("year");
    expect(normalizeBillingInterval("month")).toBe("month");
    expect(normalizeBillingInterval(undefined)).toBe("month");
  });
});

describe("plan id mapping", () => {
  it("maps legacy ids onto the current catalogue", () => {
    expect(normalizePlanId("starter")).toBe("basic");
    expect(normalizePlanId("pro")).toBe("premium");
    expect(normalizePlanId("growth")).toBe("premium");
    expect(normalizePlanId("enterprise")).toBe("enterprise");
  });
});

describe("Stripe price env mapping", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("reads Basic / Premium / Enterprise price ids (with legacy fallbacks)", () => {
    process.env.STRIPE_PRICE_BASIC = "price_basic";
    process.env.STRIPE_PRICE_PREMIUM = "price_premium";
    process.env.STRIPE_PRICE_ENTERPRISE = "price_ent";
    expect(stripePriceIdFor("basic")).toBe("price_basic");
    expect(stripePriceIdFor("premium")).toBe("price_premium");
    expect(stripePriceIdFor("enterprise")).toBe("price_ent");
    expect(stripePriceIdFor("free")).toBeNull();
  });

  it("reverses a Stripe price id to a plan", () => {
    process.env.STRIPE_PRICE_BASIC = "price_basic";
    process.env.STRIPE_PRICE_PREMIUM = "price_premium";
    process.env.STRIPE_PRICE_ENTERPRISE = "price_ent";
    expect(planForStripePriceId("price_premium")).toBe("premium");
    expect(planForStripePriceId("price_basic")).toBe("basic");
    expect(planForStripePriceId("price_ent")).toBe("enterprise");
    expect(planForStripePriceId("price_unknown")).toBe("free");
  });

  it("maps annual price ids to their plan and interval", () => {
    process.env.STRIPE_PRICE_BASIC = "price_basic";
    process.env.STRIPE_PRICE_BASIC_ANNUAL = "price_basic_year";
    process.env.STRIPE_PRICE_PREMIUM_ANNUAL = "price_premium_year";
    expect(stripePriceIdFor("basic", "year")).toBe("price_basic_year");
    expect(stripePriceMatch("price_basic_year")).toEqual({ plan: "basic", interval: "year" });
    expect(stripePriceMatch("price_basic")).toEqual({ plan: "basic", interval: "month" });
    expect(planForStripePriceId("price_premium_year")).toBe("premium");
    expect(stripePriceIdFor("enterprise", "year")).toBeNull();
  });
});
