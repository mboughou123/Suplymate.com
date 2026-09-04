// Billing abstraction.
//
// Plan catalogue + the user's current plan. Stripe is the payment provider and
// is considered configured only when BOTH the secret key and the webhook signing
// secret exist — webhooks are the source of truth for subscription state, so we
// never enable checkout without a way to receive them.
//
// Nothing here fakes a successful payment: without Stripe, upgrade actions are
// surfaced honestly as unavailable.

export type PlanId = "free" | "basic" | "premium" | "enterprise";

export const TRIAL_DAYS = 3;

export type Plan = {
  id: PlanId;
  name: string;
  /** Monthly price in USD; null = custom / contact sales. */
  monthlyPrice: number | null;
  priceLabel: string;
  period: string;
  audience: string;
  description: string;
  features: string[];
  /** Paid plans include a free trial (days). */
  trialDays: number;
  cta: "free" | "trial" | "sales";
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    priceLabel: "$0",
    period: "forever",
    audience: "For users exploring Suplymate.",
    description: "Understand the value of AI-powered sourcing before you pay.",
    features: [
      "Browse suppliers",
      "Limited supplier searches",
      "Basic supplier profiles",
      "Limited price charts",
      "Limited AI questions",
      "Save a few suppliers",
      "Basic dashboard",
    ],
    trialDays: 0,
    cta: "free",
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 19,
    priceLabel: "$19",
    period: "/month",
    audience: "For individual buyers sourcing regularly.",
    description: "Unlimited browsing, supplier messaging and the AI sourcing assistant.",
    features: [
      "Unlimited supplier browsing",
      "More supplier comparisons",
      "More price data",
      "Supplier messaging",
      "Saved suppliers",
      "AI sourcing assistant",
      "AI material research",
      "Price comparison",
      "Supplier matching",
      "Basic sourcing recommendations",
    ],
    trialDays: TRIAL_DAYS,
    cta: "trial",
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 49,
    priceLabel: "$49",
    period: "/month",
    audience: "For teams that source across categories.",
    description: "Everything in Basic plus advanced AI sourcing, analytics and alerts.",
    features: [
      "Everything in Basic",
      "Advanced AI sourcing",
      "Unlimited AI conversations",
      "Advanced supplier matching",
      "Advanced price analytics",
      "Historical pricing",
      "Price alerts",
      "AI sourcing strategies",
      "Quote comparison",
      "Advanced material intelligence",
      "Priority supplier recommendations",
      "Export sourcing reports",
    ],
    trialDays: TRIAL_DAYS,
    cta: "trial",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: null,
    priceLabel: "Custom",
    period: "",
    audience: "For procurement organisations.",
    description: "Multi-user procurement workflows, API access and custom AI knowledge.",
    features: [
      "Everything in Premium",
      "Multiple users",
      "Team management",
      "Procurement workflows",
      "Advanced analytics",
      "API access",
      "Custom AI knowledge",
      "Dedicated support",
      "Custom supplier integrations",
      "Custom industry databases",
      "Enterprise security",
      "Custom sourcing workflows",
    ],
    trialDays: 0,
    cta: "sales",
  },
];

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function isBillingProviderConfigured(): boolean {
  return isStripeConfigured();
}

// Map a plan id to its configured Stripe Price id. Legacy env names
// (STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO) are accepted as fallbacks.
export function stripePriceIdFor(plan: PlanId): string | null {
  if (plan === "basic") {
    return process.env.STRIPE_PRICE_BASIC || process.env.STRIPE_PRICE_STARTER || null;
  }
  if (plan === "premium") {
    return process.env.STRIPE_PRICE_PREMIUM || process.env.STRIPE_PRICE_PRO || null;
  }
  return null;
}

// Reverse lookup: given a Stripe Price id (from a webhook), which plan is it?
export function planForStripePriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === stripePriceIdFor("premium")) return "premium";
  if (priceId === stripePriceIdFor("basic")) return "basic";
  return "free";
}

// Legacy plan ids stored on existing accounts map onto the new catalogue.
const LEGACY_PLAN_IDS: Record<string, PlanId> = {
  starter: "basic",
  pro: "premium",
  growth: "premium",
};

export function normalizePlanId(id: string | null | undefined): PlanId {
  if (!id) return "free";
  if (PLANS.some((p) => p.id === id)) return id as PlanId;
  return LEGACY_PLAN_IDS[id] ?? "free";
}

export function getPlanById(id: string | null | undefined): Plan {
  const normalized = normalizePlanId(id);
  return PLANS.find((p) => p.id === normalized) ?? PLANS[0];
}

export type BillingState = {
  plan: Plan;
  status: string;
  trialing: boolean;
  renewalDate: string | null;
  providerConfigured: boolean;
};

export function getBillingState(user: {
  plan?: string | null;
  planStatus?: string | null;
  currentPeriodEnd?: Date | string | null;
}): BillingState {
  const status = user.planStatus ?? "active";
  const end = user.currentPeriodEnd ? new Date(user.currentPeriodEnd) : null;
  return {
    plan: getPlanById(user.plan),
    status,
    trialing: status === "trialing",
    renewalDate: end && !Number.isNaN(end.getTime()) ? end.toISOString().slice(0, 10) : null,
    providerConfigured: isBillingProviderConfigured(),
  };
}

export type { Plan as BillingPlan };
