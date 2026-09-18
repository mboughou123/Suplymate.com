import { afterEach, describe, expect, it } from "vitest";
import {
  PLANS,
  SITE_PLAN_PRICES_CENTS,
  SITE_PLAN_PRICES_USD,
  TRIAL_DAYS,
  getPlanById,
  normalizePlanId,
  planForStripePriceId,
  stripePriceIdFor,
} from "@/lib/billing";

describe("site plan catalogue", () => {
  it("prices Basic at $49.95 with a 3-day trial", () => {
    const basic = getPlanById("basic");
    expect(basic.monthlyPrice).toBe(SITE_PLAN_PRICES_USD.basic);
    expect(basic.monthlyPrice).toBe(49.95);
    expect(basic.priceLabel).toBe("$49.95");
    expect(basic.trialDays).toBe(TRIAL_DAYS);
    expect(TRIAL_DAYS).toBe(3);
    expect(basic.cta).toBe("trial");
  });

  it("prices Premium at $99.95 with the same 3-day trial", () => {
    const premium = getPlanById("premium");
    expect(premium.monthlyPrice).toBe(99.95);
    expect(premium.priceLabel).toBe("$99.95");
    expect(premium.trialDays).toBe(3);
    expect(premium.cta).toBe("trial");
    expect(premium.highlighted).toBe(true);
  });

  it("prices Enterprise at $250 with the same 3-day trial", () => {
    const enterprise = getPlanById("enterprise");
    expect(enterprise.monthlyPrice).toBe(250);
    expect(enterprise.priceLabel).toBe("$250");
    expect(enterprise.trialDays).toBe(3);
    expect(enterprise.cta).toBe("trial");
  });

  it("puts a 3-day trial on every paid plan", () => {
    for (const plan of PLANS.filter((p) => p.id !== "free")) {
      expect(plan.trialDays, plan.id).toBe(3);
      expect(plan.cta, plan.id).toBe("trial");
    }
    expect(getPlanById("free").trialDays).toBe(0);
  });

  it("uses matching Stripe unit amounts in cents", () => {
    expect(SITE_PLAN_PRICES_CENTS).toEqual({
      basic: 4995,
      premium: 9995,
      enterprise: 25000,
    });
  });

  it("keeps one catalogue entry per plan id", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "basic", "premium", "enterprise"]);
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
});
