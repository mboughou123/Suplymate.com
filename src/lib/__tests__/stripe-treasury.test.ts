import { describe, expect, it } from "vitest";
import { getTreasuryRecommendation, isTreasuryConfigured } from "@/lib/stripe-treasury";

describe("Treasury stub", () => {
  it("is not configured unless explicitly enabled", () => {
    expect(isTreasuryConfigured()).toBe(false);
  });

  it("recommends v2 Financial Accounts rather than legacy v1 Treasury", () => {
    const rec = getTreasuryRecommendation();
    expect(rec.product).toBe("v2 Financial Accounts");
    expect(rec.enabled).toBe(false);
    expect(rec.api).toContain("/v2/core/vault/financial_accounts");
  });
});
