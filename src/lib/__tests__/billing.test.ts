import { describe, expect, it } from "vitest";
import { PLANS, TRIAL_DAYS, getPlanById } from "@/lib/billing";

describe("displayed subscription plans", () => {
  it("keeps the existing plan names and the 3-day Basic trial", () => {
    expect(TRIAL_DAYS).toBe(3);
    expect(PLANS.map((p) => p.id)).toEqual(["free", "basic", "premium", "enterprise"]);
    expect(getPlanById("basic")).toMatchObject({
      name: "Basic",
      monthlyPrice: 49.95,
      priceLabel: "$49.95",
      trialDays: 3,
    });
    expect(getPlanById("premium")).toMatchObject({
      name: "Premium",
      monthlyPrice: 99.95,
      priceLabel: "$99.95",
      cta: "upgrade",
    });
    expect(getPlanById("enterprise")).toMatchObject({
      name: "Enterprise",
      monthlyPrice: 250,
      priceLabel: "$250",
    });
  });

  it("does not advertise a trial on Premium or Enterprise", () => {
    expect(getPlanById("premium").trialDays).toBe(0);
    expect(getPlanById("enterprise").trialDays).toBe(0);
    expect(getPlanById("free").trialDays).toBe(0);
  });
});
