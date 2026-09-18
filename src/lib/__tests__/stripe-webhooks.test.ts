import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  invoiceSubscriptionId,
  isHandledBillingEvent,
  subscriptionEntitlement,
  subscriptionPeriodEnd,
} from "@/lib/stripe-webhooks";
import type { PlanId } from "@/lib/billing";

const originalEnv = { ...process.env };

function withPrices(fn: () => void) {
  process.env.STRIPE_PRICE_BASIC = "price_basic";
  process.env.STRIPE_PRICE_PREMIUM = "price_premium";
  process.env.STRIPE_PRICE_ENTERPRISE = "price_ent";
  try {
    fn();
  } finally {
    process.env = { ...originalEnv };
  }
}

function sub(partial: {
  status: Stripe.Subscription.Status;
  priceId?: string;
  periodEnd?: number;
  itemPeriodEnd?: number;
}): Stripe.Subscription {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: partial.status,
    items: {
      object: "list",
      data: [
        {
          id: "si_1",
          current_period_end: partial.itemPeriodEnd ?? 1_700_000_000,
          current_period_start: 1_699_000_000,
          price: { id: partial.priceId ?? "price_premium" },
        },
      ],
    },
    ...(partial.periodEnd ? { current_period_end: partial.periodEnd } : {}),
  } as unknown as Stripe.Subscription;
}

describe("handled billing events", () => {
  it("accepts Checkout, subscription, and invoice events", () => {
    expect(isHandledBillingEvent("checkout.session.completed")).toBe(true);
    expect(isHandledBillingEvent("checkout.session.async_payment_succeeded")).toBe(true);
    expect(isHandledBillingEvent("customer.subscription.updated")).toBe(true);
    expect(isHandledBillingEvent("invoice.paid")).toBe(true);
    expect(isHandledBillingEvent("invoice.payment_failed")).toBe(true);
    expect(isHandledBillingEvent("charge.succeeded")).toBe(false);
  });
});

describe("subscription period end", () => {
  it("prefers the subscription item billing period (Basil+ API)", () => {
    const s = sub({ status: "active", itemPeriodEnd: 1_800_000_000, periodEnd: 1 });
    expect(subscriptionPeriodEnd(s)?.toISOString()).toBe(
      new Date(1_800_000_000 * 1000).toISOString(),
    );
  });
});

describe("subscription entitlement", () => {
  it("maps an active Premium subscription", () => {
    withPrices(() => {
      const result = subscriptionEntitlement(sub({ status: "active", priceId: "price_premium" }));
      expect(result.plan).toBe<PlanId>("premium");
      expect(result.entitled).toBe(true);
      expect(result.planStatus).toBe("active");
    });
  });

  it("keeps the plan during past_due dunning", () => {
    withPrices(() => {
      const result = subscriptionEntitlement(
        sub({ status: "past_due", priceId: "price_basic" }),
      );
      expect(result.plan).toBe("basic");
      expect(result.entitled).toBe(true);
      expect(result.planStatus).toBe("past_due");
    });
  });

  it("drops to free when the subscription is canceled", () => {
    withPrices(() => {
      const result = subscriptionEntitlement(
        sub({ status: "canceled", priceId: "price_ent" }),
      );
      expect(result.plan).toBe("free");
      expect(result.entitled).toBe(false);
    });
  });
});

describe("invoice subscription id", () => {
  it("reads parent.subscription_details on modern invoices", () => {
    const invoice = {
      id: "in_1",
      parent: {
        type: "subscription_details",
        subscription_details: { subscription: "sub_from_parent" },
      },
    } as unknown as Stripe.Invoice;
    expect(invoiceSubscriptionId(invoice)).toBe("sub_from_parent");
  });
});
