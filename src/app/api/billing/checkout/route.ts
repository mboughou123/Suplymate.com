import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, siteUrl } from "@/lib/stripe";
import { buildSubscriptionCheckoutParams, type CheckoutDiscount } from "@/lib/stripe-checkout";
import { earlyBirdDiscount, lookupPromotionCode, normalizePromotionCode } from "@/lib/stripe-discounts";
import {
  getPlanById,
  isStripeConfigured,
  normalizeBillingInterval,
  stripePriceIdFor,
  type PlanId,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

// Start a Stripe Checkout session for a paid plan. The browser NEVER changes
// the plan — checkout only initiates payment; the webhook is the source of truth.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured yet. Please check back soon." },
      { status: 503 },
    );
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const plan = String(body.plan || "") as PlanId;
  const interval = normalizeBillingInterval(body.interval);
  const priceId = stripePriceIdFor(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          interval === "year"
            ? "Annual billing is not available for this plan yet."
            : "Unknown or unconfigured plan.",
      },
      { status: 400 },
    );
  }
  const trialDays = getPlanById(plan).trialDays;

  let discount: CheckoutDiscount | null = null;
  const rawCode = typeof body.coupon === "string" ? body.coupon.trim() : "";
  if (rawCode) {
    const code = normalizePromotionCode(rawCode);
    const lookup = code ? await lookupPromotionCode(stripe, code) : null;
    if (!lookup || !lookup.ok) {
      return NextResponse.json(
        { error: lookup?.error ?? "That coupon code is not valid or has expired.", code: "invalid_coupon" },
        { status: 400 },
      );
    }
    discount = lookup.discount;
  } else {
    discount = await earlyBirdDiscount(stripe, interval);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true, email: true },
  });

  let customerId = user?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  let checkout;
  try {
    checkout = await stripe.checkout.sessions.create(
      buildSubscriptionCheckoutParams({
        customerId,
        priceId,
        userId: session.user.id,
        plan,
        trialDays,
        interval,
        discount,
        successUrl: `${siteUrl()}/settings/subscription?checkout=success`,
        cancelUrl: `${siteUrl()}/settings/subscription?checkout=cancelled`,
      }),
    );
  } catch (err) {
    console.error("[billing/checkout] session create failed:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        error: discount
          ? "Stripe could not apply that discount to this plan. Check the code or try without it."
          : "Could not start checkout. Please try again.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: checkout.url });
}
