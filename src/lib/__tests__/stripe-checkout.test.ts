import { describe, expect, it } from "vitest";
import { buildSubscriptionCheckoutParams } from "@/lib/stripe-checkout";

describe("subscription Checkout Session params", () => {
  const base = {
    customerId: "cus_123",
    priceId: "price_basic",
    userId: "user_1",
    plan: "basic" as const,
    trialDays: 3,
    successUrl: "https://suplymate.com/settings/subscription?checkout=success",
    cancelUrl: "https://suplymate.com/settings/subscription?checkout=cancelled",
  };

  it("uses Billing Checkout without locking payment_method_types", () => {
    const params = buildSubscriptionCheckoutParams(base, { integrationSuffix: "abcdefgh" });
    expect(params.mode).toBe("subscription");
    expect(params.line_items).toEqual([{ price: "price_basic", quantity: 1 }]);
    expect(params).not.toHaveProperty("payment_method_types");
    expect(JSON.stringify(params)).not.toContain("payment_method_types");
  });

  it("tags the session and collects B2B tax IDs without enabling automatic tax", () => {
    const params = buildSubscriptionCheckoutParams(base, { integrationSuffix: "abcdefgh" });
    expect(params.integration_identifier).toBe("suplymate-pricing-abcdefgh");
    expect(params.tax_id_collection).toEqual({ enabled: true });
    expect(params.customer_update).toEqual({ address: "auto", name: "auto" });
    expect(params).not.toHaveProperty("automatic_tax");
    expect(params.subscription_data?.trial_period_days).toBe(3);
    expect(params.subscription_data?.metadata).toEqual({ userId: "user_1", plan: "basic" });
  });

  it("omits trial_period_days when the plan has no trial", () => {
    const params = buildSubscriptionCheckoutParams(
      { ...base, plan: "enterprise", trialDays: 0, priceId: "price_ent" },
      { integrationSuffix: "zzzzzzzz" },
    );
    expect(params.subscription_data?.trial_period_days).toBeUndefined();
    expect(params.metadata).toEqual({ userId: "user_1", plan: "enterprise" });
  });
});
