/**
 * Idempotently create Stripe Products + monthly and annual Prices for the site
 * catalogue, the early-bird coupon, and the webhook endpoint for
 * /api/billing/webhook. Replaced prices are left active (never archived) so
 * existing subscriptions keep billing; the lookup key moves to the new price.
 *
 * `--test-coupon` also creates a private 100%-off-forever promotion code for
 * testing each paid plan end to end (limited redemptions, 30-day expiry).
 *
 * Reads keys from (first match):
 *   1. process.env
 *   2. .env.local
 *   3. STRIPE_KEYS_FILE (gitignored env dump — never printed)
 *
 * Writes Price ids + webhook secret into .env.local. Never logs secret values.
 *
 * Usage: STRIPE_KEYS_FILE=/path/to/keys.env npm run stripe:catalog [-- --test-coupon]
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { HANDLED_BILLING_EVENTS } from "../src/lib/stripe-webhooks";
import {
  BILLING_INTERVALS,
  EARLY_BIRD,
  planPriceCents,
  SITE_PLAN_PRICES_CENTS,
  type BillingInterval,
} from "../src/lib/billing";
import { STRIPE_API_VERSION } from "../src/lib/stripe";

type PlanKey = keyof typeof SITE_PLAN_PRICES_CENTS;

const PRODUCTS: Record<
  PlanKey,
  { name: string; description: string; productLookup: string }
> = {
  basic: {
    name: "Suplymate Basic",
    description: "Unlimited browsing, supplier phone, email and website, and 20 AI questions a month.",
    productLookup: "suplymate_basic",
  },
  premium: {
    name: "Suplymate Pro",
    description: "Everything unlocked: unlimited AI, full price history, analytics and export reports.",
    productLookup: "suplymate_premium",
  },
  enterprise: {
    name: "Suplymate Enterprise",
    description: "Multi-user procurement workflows, API access and custom AI knowledge.",
    productLookup: "suplymate_enterprise",
  },
};

const LOOKUP_SUFFIX: Record<BillingInterval, string> = { month: "monthly", year: "annual" };

function lookupKeyFor(plan: PlanKey, interval: BillingInterval): string {
  return `suplymate_${plan}_${LOOKUP_SUFFIX[interval]}`;
}

const ENV_PRICE: Record<PlanKey, Record<BillingInterval, string>> = {
  basic: { month: "STRIPE_PRICE_BASIC", year: "STRIPE_PRICE_BASIC_ANNUAL" },
  premium: { month: "STRIPE_PRICE_PREMIUM", year: "STRIPE_PRICE_PREMIUM_ANNUAL" },
  enterprise: { month: "STRIPE_PRICE_ENTERPRISE", year: "STRIPE_PRICE_ENTERPRISE_ANNUAL" },
};

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function loadMergedEnv(): Record<string, string> {
  const merged: Record<string, string> = {};
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    process.env.STRIPE_KEYS_FILE,
  ].filter((p): p is string => Boolean(p));

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    Object.assign(merged, parseEnvFile(fs.readFileSync(file, "utf8")));
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string" && v.length) merged[k] = v;
  }
  return merged;
}

function upsertEnvFile(filePath: string, updates: Record<string, string>) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = existing ? existing.split(/\r?\n/) : [];
  const seen = new Set<string>();
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return line;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    if (key in updates) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }
  const body = next.join("\n").replace(/\n*$/, "\n");
  fs.writeFileSync(filePath, body, { mode: 0o600 });
}

async function ensureProduct(stripe: Stripe, plan: PlanKey): Promise<string> {
  const spec = PRODUCTS[plan];
  try {
    const existing = await stripe.products.search({
      query: `metadata['lookup']:'${spec.productLookup}'`,
      limit: 1,
    });
    const found = existing.data[0];
    if (found) {
      if (found.name !== spec.name || found.description !== spec.description) {
        await stripe.products.update(found.id, { name: spec.name, description: spec.description });
      }
      return found.id;
    }
  } catch {
    // Search may be unavailable; fall through to list.
  }
  const listed = await stripe.products.list({ limit: 100 });
  const byName = listed.data.find((p) => p.name === spec.name && p.active);
  if (byName) {
    await stripe.products.update(byName.id, { metadata: { lookup: spec.productLookup } });
    return byName.id;
  }
  const created = await stripe.products.create({
    name: spec.name,
    description: spec.description,
    metadata: { lookup: spec.productLookup, plan },
  });
  return created.id;
}

async function ensurePrice(
  stripe: Stripe,
  plan: PlanKey,
  interval: BillingInterval,
  productId: string,
): Promise<string> {
  const lookupKey = lookupKeyFor(plan, interval);
  const unitAmount = planPriceCents(plan, interval);
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  const current = found.data[0];
  if (current && current.unit_amount === unitAmount && current.product === productId && current.active) {
    return current.id;
  }
  // Reuse an existing active price with the same amount and interval (e.g. one
  // created by hand in the Dashboard) instead of duplicating it.
  const onProduct = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const reusable = onProduct.data.find(
    (p) =>
      p.unit_amount === unitAmount &&
      p.currency === "usd" &&
      p.recurring?.interval === interval &&
      (p.recurring?.interval_count ?? 1) === 1,
  );
  if (reusable) {
    await stripe.prices.update(reusable.id, {
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      metadata: { ...reusable.metadata, plan, interval },
    });
    return reusable.id;
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { plan, interval },
  });
  return created.id;
}

async function ensureEarlyBirdCoupon(stripe: Stripe): Promise<string> {
  try {
    const existing = await stripe.coupons.retrieve(EARLY_BIRD.couponId);
    return existing.id;
  } catch {
    const created = await stripe.coupons.create({
      id: EARLY_BIRD.couponId,
      name: `Early bird: ${EARLY_BIRD.percentOff}% off ${EARLY_BIRD.durationMonths} months`,
      percent_off: EARLY_BIRD.percentOff,
      duration: "repeating",
      duration_in_months: EARLY_BIRD.durationMonths,
      max_redemptions: EARLY_BIRD.maxRedemptions,
      metadata: { purpose: "early_bird" },
    });
    return created.id;
  }
}

const TEST_COUPON_ID = "suplymate-test-free";

async function createTestPromotionCode(stripe: Stripe): Promise<string> {
  try {
    await stripe.coupons.retrieve(TEST_COUPON_ID);
  } catch {
    await stripe.coupons.create({
      id: TEST_COUPON_ID,
      name: "Internal plan testing (100% off)",
      percent_off: 100,
      duration: "forever",
      metadata: { purpose: "internal_testing" },
    });
  }
  const code = `SUPLYTEST-${randomBytes(3).toString("hex").toUpperCase()}`;
  await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: TEST_COUPON_ID },
    code,
    max_redemptions: 10,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    metadata: { purpose: "internal_testing" },
  });
  return code;
}

async function ensureWebhook(stripe: Stripe, url: string): Promise<string | null> {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const match = existing.data.find((ep) => ep.url === url);
  if (match) {
    await stripe.webhookEndpoints.update(match.id, {
      enabled_events: [...HANDLED_BILLING_EVENTS],
    });
    return null;
  }
  const created = await stripe.webhookEndpoints.create({
    url,
    enabled_events: [...HANDLED_BILLING_EVENTS],
    description: "Suplymate Billing (Checkout, subscriptions, invoices)",
  });
  return created.secret ?? null;
}

async function main() {
  const env = loadMergedEnv();
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("stripe:catalog missing STRIPE_SECRET_KEY (set env or STRIPE_KEYS_FILE).");
    process.exit(1);
  }
  const stripe = new Stripe(secret, { apiVersion: STRIPE_API_VERSION });
  const site = (env.NEXT_PUBLIC_SITE_URL || "https://suplymate.com").replace(/\/$/, "");
  const webhookUrl = env.STRIPE_WEBHOOK_URL || `${site}/api/billing/webhook`;

  const priceEnv: Record<string, string> = {};
  for (const plan of Object.keys(PRODUCTS) as PlanKey[]) {
    const productId = await ensureProduct(stripe, plan);
    for (const interval of BILLING_INTERVALS) {
      const priceId = await ensurePrice(stripe, plan, interval, productId);
      priceEnv[ENV_PRICE[plan][interval]] = priceId;
      console.info(
        `stripe:catalog ${plan} ${interval} amount=${planPriceCents(plan, interval)} product=${productId} ${ENV_PRICE[plan][interval]}=${priceId}`,
      );
    }
  }

  try {
    const coupon = await ensureEarlyBirdCoupon(stripe);
    console.info(`stripe:catalog early-bird coupon=${coupon}`);
  } catch (err) {
    console.error("stripe:catalog early-bird coupon skipped:", err instanceof Error ? err.message : "unknown");
  }

  if (process.argv.includes("--test-coupon")) {
    const code = await createTestPromotionCode(stripe);
    console.info(`stripe:catalog test promotion code=${code} (100% off forever, 10 uses, expires in 30 days)`);
  }

  let webhookSecret: string | null = null;
  try {
    webhookSecret = await ensureWebhook(stripe, webhookUrl);
    console.info(`stripe:catalog webhook url=${webhookUrl} secret=${webhookSecret ? "created" : "existing"}`);
  } catch (err) {
    console.error(
      "stripe:catalog webhook skipped:",
      err instanceof Error ? err.message : "unknown",
    );
  }

  const updates: Record<string, string> = {
    STRIPE_SECRET_KEY: secret,
    ...priceEnv,
    NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  };
  const publishable = env.STRIPE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishable) {
    updates.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = publishable;
  }
  if (webhookSecret) {
    updates.STRIPE_WEBHOOK_SECRET = webhookSecret;
  } else if (env.STRIPE_WEBHOOK_SECRET) {
    updates.STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
  }

  const localPath = path.resolve(process.cwd(), ".env.local");
  upsertEnvFile(localPath, updates);
  console.info("stripe:catalog wrote Price ids to .env.local (gitignored).");
}

main().catch((err) => {
  console.error("stripe:catalog failed:", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
