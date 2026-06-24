import Stripe from "stripe";

// Lazily construct the Stripe client. Returns null when no secret key is set,
// so callers can degrade gracefully to an honest "billing not configured" state.
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    // Use the account's default API version (pinned in the Stripe dashboard).
    client = new Stripe(key);
  }
  return client;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com").replace(/\/$/, "");
}
