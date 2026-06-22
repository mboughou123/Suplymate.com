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

export function isBillingProviderConfigured(): boolean {
  // No payment provider configured yet.
  return false;
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
