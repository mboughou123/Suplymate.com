import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, siteUrl } from "@/lib/stripe";
import { isStripeConfigured, stripePriceIdFor, type PlanId } from "@/lib/billing";

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
      { status: 503 }
    );
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const plan = String(body.plan || "") as PlanId;
  const priceId = stripePriceIdFor(plan);
  if (!priceId) {
    return NextResponse.json({ error: "Unknown or unconfigured plan." }, { status: 400 });
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

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { trial_period_days: 14, metadata: { userId: session.user.id } },
    success_url: `${siteUrl()}/settings/subscription?checkout=success`,
    cancel_url: `${siteUrl()}/settings/subscription?checkout=cancelled`,
    metadata: { userId: session.user.id, plan },
  });

  return NextResponse.json({ url: checkout.url });
}
