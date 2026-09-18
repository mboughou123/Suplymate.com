/**
 * Treasury is not in the first billing slice. New money-movement work should
 * use v2 Financial Accounts (`POST /v2/core/vault/financial_accounts`), not
 * the legacy v1 Treasury Financial Accounts API.
 *
 * Enable later when Suplymate holds supplier funds, issues payouts, or adds
 * embedded financial accounts. Until then this module is a typed stub.
 */

export type TreasuryRecommendation = {
  enabled: boolean;
  product: "v2 Financial Accounts";
  api: string;
  nextStep: string;
};

export function isTreasuryConfigured(): boolean {
  return process.env.STRIPE_TREASURY_ENABLED === "true";
}

export function getTreasuryRecommendation(): TreasuryRecommendation {
  return {
    enabled: isTreasuryConfigured(),
    product: "v2 Financial Accounts",
    api: "POST /v2/core/vault/financial_accounts",
    nextStep:
      "Leave disabled until supplier payouts or escrow are in scope. Then enable Treasury on the Stripe account and provision Financial Accounts per connected seller — do not use POST /v1/treasury/financial_accounts for a new integration.",
  };
}
