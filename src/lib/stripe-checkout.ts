import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import type { BillingInterval, PlanId } from "@/lib/billing";

export type CheckoutPlanInput = {
  customerId: string;
  priceId: string;
  userId: string;
  plan: PlanId;
  trialDays: number;
  successUrl: string;
  cancelUrl: string;
  interval?: BillingInterval;
  discount?: CheckoutDiscount | null;
};

/**
 * A discount applied up front. Stripe forbids `discounts` together with
 * `allow_promotion_codes`, so either we apply one or the payer may type one.
 * `waivesPayment` (100% off forever) lets Checkout skip collecting a card.
 */
export type CheckoutDiscount =
  | { kind: "promotion_code"; id: string; waivesPayment: boolean }
  | { kind: "coupon"; id: string; waivesPayment: boolean };

function discountParams(
  discount: CheckoutDiscount,
): Pick<Stripe.Checkout.SessionCreateParams, "discounts" | "payment_method_collection"> {
  const entry: Stripe.Checkout.SessionCreateParams.Discount =
    discount.kind === "promotion_code" ? { promotion_code: discount.id } : { coupon: discount.id };
  return {
    discounts: [entry],
    ...(discount.waivesPayment ? { payment_method_collection: "if_required" as const } : {}),
  };
}

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function randomLetterSuffix(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += LETTERS[bytes[i] % LETTERS.length];
  }
  return out;
}

export function checkoutIntegrationIdentifier(suffix = randomLetterSuffix()): string {
  return `suplymate-pricing-${suffix}`;
}

/**
 * Hosted Checkout in subscription mode. Omits `payment_method_types` so Stripe
 * can pick dynamic methods from Dashboard settings. Does not enable
 * `automatic_tax` — that requires an active Tax registration first.
 */
export function buildSubscriptionCheckoutParams(
  input: CheckoutPlanInput,
  options?: { integrationSuffix?: string },
): Stripe.Checkout.SessionCreateParams {
  const trialDays = input.trialDays > 0 ? input.trialDays : undefined;
  const interval = input.interval ?? "month";
  const metadata = { userId: input.userId, plan: input.plan, interval };
  return {
    mode: "subscription",
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    ...(input.discount ? discountParams(input.discount) : { allow_promotion_codes: true }),
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    integration_identifier: checkoutIntegrationIdentifier(options?.integrationSuffix),
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata,
  };
}
