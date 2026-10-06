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

export type BillingInterval = "month" | "year";

export const BILLING_INTERVALS: readonly BillingInterval[] = ["month", "year"];

export function normalizeBillingInterval(value: unknown): BillingInterval {
  return value === "year" || value === "annual" ? "year" : "month";
}

export const ANNUAL_DISCOUNT_PERCENT = 10;

/** Canonical monthly USD prices honoured by the site and by Stripe Price objects. */
export const SITE_PLAN_PRICES_CENTS = {
  basic: 4995,
  premium: 7495,
  enterprise: 19995,
} as const;

export type PaidPlanId = keyof typeof SITE_PLAN_PRICES_CENTS;

/** Yearly price: twelve months less the annual discount, rounded to the cent. */
export function annualPriceCents(plan: PaidPlanId): number {
  return Math.round((SITE_PLAN_PRICES_CENTS[plan] * 12 * (100 - ANNUAL_DISCOUNT_PERCENT)) / 100);
}

export function planPriceCents(plan: PaidPlanId, interval: BillingInterval): number {
  switch (interval) {
    case "month":
      return SITE_PLAN_PRICES_CENTS[plan];
    case "year":
      return annualPriceCents(plan);
    default: {
      const _never: never = interval;
      return _never;
    }
  }
}

export function formatUsdCents(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars.toLocaleString("en-US") : dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Early-bird launch offer, applied automatically at Checkout to monthly plans
 * while the Stripe coupon still has redemptions left (Stripe enforces the cap).
 */
export const EARLY_BIRD = {
  couponId: "suplymate-early-bird",
  percentOff: 20,
  durationMonths: 3,
  maxRedemptions: 100,
} as const;

export function earlyBirdCouponId(): string {
  return process.env.STRIPE_EARLY_BIRD_COUPON?.trim() || EARLY_BIRD.couponId;
}

export type PlanCta = "free" | "trial" | "sales" | "subscribe";

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
  cta: PlanCta;
  highlighted?: boolean;
};

/**
 * Numeric plan limits. `null` means unlimited. Server routes enforce these via
 * `entitlementsFor` in `@/lib/permissions`; the pricing copy below quotes them.
 */
export const PLAN_LIMITS = {
  free: {
    suppliersPerCategory: 5,
    productsPerCategory: 5,
    aiQuestionsPerMonth: 5,
    savedSuppliers: 5,
    priceHistoryMonths: 3,
  },
  basic: {
    suppliersPerCategory: null,
    productsPerCategory: null,
    aiQuestionsPerMonth: 20,
    savedSuppliers: null,
    priceHistoryMonths: 12,
  },
  premium: {
    suppliersPerCategory: null,
    productsPerCategory: null,
    aiQuestionsPerMonth: null,
    savedSuppliers: null,
    priceHistoryMonths: null,
  },
  enterprise: {
    suppliersPerCategory: null,
    productsPerCategory: null,
    aiQuestionsPerMonth: null,
    savedSuppliers: null,
    priceHistoryMonths: null,
  },
} as const satisfies Record<
  PlanId,
  {
    suppliersPerCategory: number | null;
    productsPerCategory: number | null;
    aiQuestionsPerMonth: number | null;
    savedSuppliers: number | null;
    priceHistoryMonths: number | null;
  }
>;

const FREE = PLAN_LIMITS.free;
const BASIC = PLAN_LIMITS.basic;

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
      `${FREE.suppliersPerCategory} supplier and product results per category`,
      "Basic supplier intro",
      `${FREE.aiQuestionsPerMonth} AI questions per month`,
      `Save up to ${FREE.savedSuppliers} suppliers`,
      `${FREE.priceHistoryMonths} months of price charts`,
      "Message suppliers on Suplymate",
    ],
    trialDays: 0,
    cta: "free",
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: SITE_PLAN_PRICES_CENTS.basic / 100,
    priceLabel: formatUsdCents(SITE_PLAN_PRICES_CENTS.basic),
    period: "/month",
    audience: "For individual buyers sourcing regularly.",
    description: "Unlimited browsing and full supplier contact details.",
    features: [
      "Unlimited supplier and product browsing",
      "Unlock supplier info: phone, email and website",
      `${BASIC.aiQuestionsPerMonth} AI questions per month`,
      `${BASIC.priceHistoryMonths} months of price chart data`,
      "Unlimited saved suppliers",
      "Price alerts",
      "Supplier messaging and RFQs",
      "Supplier comparisons",
    ],
    trialDays: TRIAL_DAYS,
    cta: "trial",
  },
  {
    id: "premium",
    name: "Pro",
    monthlyPrice: SITE_PLAN_PRICES_CENTS.premium / 100,
    priceLabel: formatUsdCents(SITE_PLAN_PRICES_CENTS.premium),
    period: "/month",
    audience: "For teams that source across categories.",
    description: "Everything unlocked: unlimited AI, full price history and analytics.",
    features: [
      "Everything in Basic",
      "Unlimited AI questions",
      "Full price history and analytics",
      "Advanced supplier matching",
      "Quote comparison",
      "Export sourcing reports",
      "Team workspaces",
      "Priority support",
    ],
    trialDays: TRIAL_DAYS,
    cta: "trial",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: SITE_PLAN_PRICES_CENTS.enterprise / 100,
    priceLabel: formatUsdCents(SITE_PLAN_PRICES_CENTS.enterprise),
    period: "/month",
    audience: "For procurement organisations.",
    description: "Multi-user procurement workflows, API access and custom AI knowledge.",
    features: [
      "Everything in Pro",
      "Multiple users and team management",
      "Procurement workflows",
      "API access",
      "Custom AI knowledge",
      "Custom supplier integrations",
      "Enterprise security",
      "Dedicated support",
    ],
    trialDays: 0,
    cta: "subscribe",
  },
];

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function isBillingProviderConfigured(): boolean {
  return isStripeConfigured();
}

const PRICE_ENV: Record<PaidPlanId, Record<BillingInterval, readonly string[]>> = {
  basic: { month: ["STRIPE_PRICE_BASIC", "STRIPE_PRICE_STARTER"], year: ["STRIPE_PRICE_BASIC_ANNUAL"] },
  premium: { month: ["STRIPE_PRICE_PREMIUM", "STRIPE_PRICE_PRO"], year: ["STRIPE_PRICE_PREMIUM_ANNUAL"] },
  enterprise: { month: ["STRIPE_PRICE_ENTERPRISE"], year: ["STRIPE_PRICE_ENTERPRISE_ANNUAL"] },
};

function envValue(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

// Map a plan id to its configured Stripe Price id. Legacy env names
// (STRIPE_PRICE_STARTER / STRIPE_PRICE_PRO) are accepted as monthly fallbacks.
export function stripePriceIdFor(plan: PlanId, interval: BillingInterval = "month"): string | null {
  if (plan === "free") return null;
  for (const name of PRICE_ENV[plan][interval]) {
    const id = envValue(name);
    if (id) return id;
  }
  return null;
}

export type StripePriceMatch = { plan: PlanId; interval: BillingInterval | null };

export function stripePriceMatch(priceId: string | null | undefined): StripePriceMatch {
  if (!priceId) return { plan: "free", interval: null };
  const paid: PaidPlanId[] = ["premium", "basic", "enterprise"];
  for (const plan of paid) {
    for (const interval of BILLING_INTERVALS) {
      if (priceId === stripePriceIdFor(plan, interval)) return { plan, interval };
    }
  }
  return { plan: "free", interval: null };
}

// Reverse lookup: given a Stripe Price id (from a webhook), which plan is it?
export function planForStripePriceId(priceId: string | null | undefined): PlanId {
  return stripePriceMatch(priceId).plan;
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

export function isPaidPlanId(id: unknown): id is Exclude<PlanId, "free"> {
  return id === "basic" || id === "premium" || id === "enterprise";
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
