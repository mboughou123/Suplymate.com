import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { recordAudit } from "@/lib/audit";
import {
  checkoutSubscriptionId,
  invoiceSubscriptionId,
  isHandledBillingEvent,
  subscriptionEntitlement,
  type HandledBillingEvent,
} from "@/lib/stripe-webhooks";

export const dynamic = "force-dynamic";
// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = "nodejs";

async function applySubscription(sub: Stripe.Subscription) {
  const entitlement = subscriptionEntitlement(sub);
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: entitlement.customerId },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: entitlement.plan,
      planStatus: entitlement.planStatus,
      stripeSubscriptionId: entitlement.stripeSubscriptionId,
      stripePriceId: entitlement.stripePriceId,
      currentPeriodEnd: entitlement.currentPeriodEnd,
    },
  });
  await recordAudit({
    actorId: user.id,
    action: "billing.subscription",
    targetType: "USER",
    targetId: user.id,
    detail: { plan: entitlement.plan, status: entitlement.planStatus },
  });
}

async function applyInvoice(invoice: Stripe.Invoice, stripe: Stripe) {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId) return;
  const sub = await stripe.subscriptions.retrieve(subId);
  await applySubscription(sub);
}

async function handleEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
  if (!isHandledBillingEvent(event.type)) return;
  const type: HandledBillingEvent = event.type;
  switch (type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const sessionObj = event.data.object as Stripe.Checkout.Session;
      const subId = checkoutSubscriptionId(sessionObj);
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        await applySubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      await applyInvoice(event.data.object as Stripe.Invoice, stripe);
      break;
    }
    default: {
      const _never: never = type;
      void _never;
      break;
    }
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 400 },
    );
  }

  try {
    await handleEvent(event, stripe);
  } catch (err) {
    console.error(
      "[stripe:webhook] handler failed",
      event.type,
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
