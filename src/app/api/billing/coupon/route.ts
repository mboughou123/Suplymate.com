import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/billing";
import { lookupPromotionCode, normalizePromotionCode } from "@/lib/stripe-discounts";

export const dynamic = "force-dynamic";

// POST /api/billing/coupon { code } — check a coupon before Checkout so the
// subscription page can show what it takes off. Checkout re-validates it.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = rateLimit(`coupon:${session.user.id}`, 10, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.resetInSeconds}s.` },
      { status: 429 },
    );
  }
  const stripe = isStripeConfigured() ? getStripe() : null;
  if (!stripe) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const code = normalizePromotionCode(body.code);
  if (!code) {
    return NextResponse.json({ valid: false, error: "Enter a valid coupon code." }, { status: 400 });
  }
  const lookup = await lookupPromotionCode(stripe, code);
  if (!lookup.ok) {
    return NextResponse.json({ valid: false, error: lookup.error }, { status: 404 });
  }
  return NextResponse.json({
    valid: true,
    code,
    percentOff: lookup.percentOff,
    amountOff: lookup.amountOff,
    free: lookup.discount.waivesPayment,
  });
}
