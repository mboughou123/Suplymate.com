import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import type { PlanId } from "@/lib/billing";

export type CheckoutPlanInput = {
  customerId: string;
  priceId: string;
  userId: string;
  plan: PlanId;
  trialDays: number;
  successUrl: string;
  cancelUrl: string;
};

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
  return {
    mode: "subscription",
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    integration_identifier: checkoutIntegrationIdentifier(options?.integrationSuffix),
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata: { userId: input.userId, plan: input.plan },
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { userId: input.userId, plan: input.plan },
  };
}
