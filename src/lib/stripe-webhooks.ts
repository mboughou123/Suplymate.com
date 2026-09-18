import type Stripe from "stripe";
import { planForStripePriceId, type PlanId } from "@/lib/billing";

export const HANDLED_BILLING_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type HandledBillingEvent = (typeof HANDLED_BILLING_EVENTS)[number];

export function isHandledBillingEvent(type: string): type is HandledBillingEvent {
  return (HANDLED_BILLING_EVENTS as readonly string[]).includes(type);
}

const ENTITLED_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set([
  "active",
  "trialing",
  "past_due",
]);

export type SubscriptionEntitlement = {
  entitled: boolean;
  plan: PlanId;
  planStatus: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  currentPeriodEnd: Date | null;
  customerId: string;
};

export function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const fromItem = sub.items.data[0]?.current_period_end;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const seconds = fromItem ?? legacy;
  if (!seconds) return null;
  return new Date(seconds * 1000);
}

export function subscriptionCustomerId(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

export function subscriptionEntitlement(sub: Stripe.Subscription): SubscriptionEntitlement {
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const entitled = ENTITLED_STATUSES.has(sub.status);
  return {
    entitled,
    plan: entitled ? planForStripePriceId(priceId) : "free",
    planStatus: sub.status,
    stripeSubscriptionId: sub.id,
    stripePriceId: priceId,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    customerId: subscriptionCustomerId(sub),
  };
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (parentSub) {
    return typeof parentSub === "string" ? parentSub : parentSub.id;
  }
  const legacy = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription;
  if (!legacy) return null;
  return typeof legacy === "string" ? legacy : legacy.id;
}

export function checkoutSubscriptionId(session: Stripe.Checkout.Session): string | null {
  if (!session.subscription) return null;
  return typeof session.subscription === "string" ? session.subscription : session.subscription.id;
}
