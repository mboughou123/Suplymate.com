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
    expect(params.subscription_data?.metadata).toEqual({ userId: "user_1", plan: "basic", interval: "month" });
  });

  it("omits trial_period_days when the plan has no trial", () => {
    const params = buildSubscriptionCheckoutParams(
      { ...base, plan: "enterprise", trialDays: 0, priceId: "price_ent" },
      { integrationSuffix: "zzzzzzzz" },
    );
    expect(params.subscription_data?.trial_period_days).toBeUndefined();
    expect(params.metadata).toEqual({ userId: "user_1", plan: "enterprise", interval: "month" });
  });

  it("lets the payer type a promotion code when no discount is applied", () => {
    const params = buildSubscriptionCheckoutParams(base, { integrationSuffix: "abcdefgh" });
    expect(params.allow_promotion_codes).toBe(true);
    expect(params).not.toHaveProperty("discounts");
  });

  it("applies a discount instead of allowing codes, and skips the card when it is free forever", () => {
    const params = buildSubscriptionCheckoutParams(
      { ...base, interval: "year", discount: { kind: "promotion_code", id: "promo_1", waivesPayment: true } },
      { integrationSuffix: "abcdefgh" },
    );
    expect(params.discounts).toEqual([{ promotion_code: "promo_1" }]);
    expect(params).not.toHaveProperty("allow_promotion_codes");
    expect(params.payment_method_collection).toBe("if_required");
    expect(params.metadata).toEqual({ userId: "user_1", plan: "basic", interval: "year" });
  });

  it("still collects a card for partial discounts like the early-bird coupon", () => {
    const params = buildSubscriptionCheckoutParams(
      { ...base, discount: { kind: "coupon", id: "suplymate-early-bird", waivesPayment: false } },
      { integrationSuffix: "abcdefgh" },
    );
    expect(params.discounts).toEqual([{ coupon: "suplymate-early-bird" }]);
    expect(params).not.toHaveProperty("payment_method_collection");
  });
});
