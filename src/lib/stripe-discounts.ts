import type Stripe from "stripe";
import { earlyBirdCouponId, type BillingInterval } from "@/lib/billing";
import type { CheckoutDiscount } from "@/lib/stripe-checkout";

const CODE_PATTERN = /^[A-Za-z0-9-]{3,40}$/;

export function normalizePromotionCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim();
  return CODE_PATTERN.test(code) ? code : null;
}

function couponOf(promo: Stripe.PromotionCode): Stripe.Coupon | null {
  const coupon = promo.promotion?.coupon;
  return coupon && typeof coupon === "object" ? coupon : null;
}

/** 100% off for the life of the subscription: nothing will ever be charged. */
export function couponWaivesPayment(coupon: Stripe.Coupon | null): boolean {
  return Boolean(coupon && coupon.valid && coupon.percent_off === 100 && coupon.duration === "forever");
}

export type PromotionLookup =
  | { ok: true; discount: CheckoutDiscount; percentOff: number | null; amountOff: number | null }
  | { ok: false; error: string };

/** Resolve a customer-typed code to an active Stripe promotion code. */
export async function lookupPromotionCode(stripe: Stripe, code: string): Promise<PromotionLookup> {
  const found = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ["data.promotion.coupon"],
  });
  const promo = found.data[0];
  const coupon = promo ? couponOf(promo) : null;
  if (!promo || (coupon && !coupon.valid)) {
    return { ok: false, error: "That coupon code is not valid or has expired." };
  }
  return {
    ok: true,
    discount: { kind: "promotion_code", id: promo.id, waivesPayment: couponWaivesPayment(coupon) },
    percentOff: coupon?.percent_off ?? null,
    amountOff: coupon?.amount_off ?? null,
  };
}

/** The early-bird coupon, while it still has redemptions left (monthly plans only). */
export async function earlyBirdDiscount(
  stripe: Stripe,
  interval: BillingInterval,
): Promise<CheckoutDiscount | null> {
  if (interval !== "month") return null;
  try {
    const coupon = await stripe.coupons.retrieve(earlyBirdCouponId());
    return coupon.valid ? { kind: "coupon", id: coupon.id, waivesPayment: false } : null;
  } catch {
    return null;
  }
}
