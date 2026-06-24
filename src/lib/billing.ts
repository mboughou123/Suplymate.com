// Billing abstraction.
//
// Suplymate does not yet have a connected payment provider. This module returns
// a clean, deterministic plan catalogue and the user's current plan so the
// Settings UI can render real plan info WITHOUT faking successful payments.
// Upgrade / downgrade / manage-billing actions are surfaced as "Coming soon".
//
// When a provider (e.g. Stripe) is wired up later, implement the functions here
// and flip `isBillingProviderConfigured()` — the UI will adapt automatically.

export type PlanId = "free" | "starter" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0",
    description: "Explore the directory and the AI assistant.",
    features: [
      "Browse verified suppliers",
      "Basic AI procurement assistant",
      "Up to 3 saved suppliers",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceLabel: "$49/mo",
    description: "For active buyers managing multiple suppliers.",
    features: [
      "Everything in Free",
      "Unlimited saved suppliers",
      "Price alerts & market tracking",
      "RFQ management",
      "Priority AI responses",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "$149/mo",
    description: "For procurement teams sourcing at scale.",
    features: [
      "Everything in Starter",
      "Advanced supplier risk insights",
      "Team collaboration",
      "Export & reporting",
      "Dedicated support",
    ],
  },
];

// Stripe is the billing provider. It is considered configured only when both
// the secret key and the webhook signing secret are present — webhooks are the
// source of truth for subscription state, so we never enable checkout without a
// way to receive them. Price IDs map plans to Stripe Prices.
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET
  );
}

export function isBillingProviderConfigured(): boolean {
  return isStripeConfigured();
}

// Map a plan id to its configured Stripe Price id (set in env). Returns null
// when not configured.
export function stripePriceIdFor(plan: PlanId): string | null {
  if (plan === "starter") return process.env.STRIPE_PRICE_STARTER || null;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO || null;
  return null;
}

// Reverse lookup: given a Stripe Price id (from a webhook), which plan is it?
export function planForStripePriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  return "free";
}

export function getPlanById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export type BillingState = {
  plan: Plan;
  status: string;
  renewalDate: string | null;
  providerConfigured: boolean;
};

export function getBillingState(user: {
  plan?: string | null;
  planStatus?: string | null;
}): BillingState {
  return {
    plan: getPlanById(user.plan),
    status: user.planStatus ?? "active",
    renewalDate: null,
    providerConfigured: isBillingProviderConfigured(),
  };
}

export type { Plan as BillingPlan };
