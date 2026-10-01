import Stripe from "stripe";

/** Pinned to the Stripe Node SDK's latest API version. */
export const STRIPE_API_VERSION = "2026-08-26.dahlia" as const;

// Lazily construct the Stripe client. Returns null when no secret key is set,
// so callers can degrade gracefully to an honest "billing not configured" state.
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: {
        name: "Suplymate",
        version: "0.1.0",
        url: "https://suplymate.com",
      },
    });
  }
  return client;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com").replace(/\/$/, "");
}
