/**
 * Idempotently create Stripe Products + monthly Prices for the site catalogue,
 * and a test-mode webhook endpoint for /api/billing/webhook.
 *
 * Reads keys from (first match):
 *   1. process.env
 *   2. .env.local
 *   3. STRIPE_KEYS_FILE (gitignored env dump — never printed)
 *
 * Writes Price ids + webhook secret into .env.local. Never logs secret values.
 *
 * Usage: STRIPE_KEYS_FILE=/path/to/keys.env npm run stripe:catalog
 */
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { HANDLED_BILLING_EVENTS } from "../src/lib/stripe-webhooks";
import { SITE_PLAN_PRICES_CENTS } from "../src/lib/billing";
import { STRIPE_API_VERSION } from "../src/lib/stripe";

type PlanKey = keyof typeof SITE_PLAN_PRICES_CENTS;

const PRODUCTS: Record<
  PlanKey,
  { name: string; description: string; lookupKey: string; productLookup: string }
> = {
  basic: {
    name: "Suplymate Basic",
    description: "Unlimited browsing, supplier messaging and the AI sourcing assistant.",
    lookupKey: "suplymate_basic_monthly",
    productLookup: "suplymate_basic",
  },
  premium: {
    name: "Suplymate Premium",
    description: "Advanced AI sourcing, analytics, alerts and export reports.",
    lookupKey: "suplymate_premium_monthly",
    productLookup: "suplymate_premium",
  },
  enterprise: {
    name: "Suplymate Enterprise",
    description: "Multi-user procurement workflows, API access and custom AI knowledge.",
    lookupKey: "suplymate_enterprise_monthly",
    productLookup: "suplymate_enterprise",
  },
};

const ENV_PRICE: Record<PlanKey, string> = {
  basic: "STRIPE_PRICE_BASIC",
  premium: "STRIPE_PRICE_PREMIUM",
  enterprise: "STRIPE_PRICE_ENTERPRISE",
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
    if (existing.data[0]) return existing.data[0].id;
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

async function ensurePrice(stripe: Stripe, plan: PlanKey, productId: string): Promise<string> {
  const spec = PRODUCTS[plan];
  const unitAmount = SITE_PLAN_PRICES_CENTS[plan];
  const found = await stripe.prices.list({ lookup_keys: [spec.lookupKey], limit: 1 });
  const current = found.data[0];
  if (current && current.unit_amount === unitAmount && current.product === productId) {
    return current.id;
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval: "month" },
    lookup_key: spec.lookupKey,
    transfer_lookup_key: true,
    metadata: { plan },
  });
  return created.id;
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

  const priceIds: Partial<Record<PlanKey, string>> = {};
  for (const plan of Object.keys(PRODUCTS) as PlanKey[]) {
    const productId = await ensureProduct(stripe, plan);
    const priceId = await ensurePrice(stripe, plan, productId);
    priceIds[plan] = priceId;
    console.info(`stripe:catalog ${plan} product=${productId} price=${priceId}`);
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
    STRIPE_PRICE_BASIC: priceIds.basic ?? "",
    STRIPE_PRICE_PREMIUM: priceIds.premium ?? "",
    STRIPE_PRICE_ENTERPRISE: priceIds.enterprise ?? "",
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
