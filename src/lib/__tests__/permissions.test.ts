import { describe, expect, it } from "vitest";
import {
  BASIC_AI_RUNS,
  FREE_AI_RUNS,
  FREE_CATALOGUE_PRODUCTS,
  FREE_CATALOGUE_SUPPLIERS,
  PREMIUM_AI_RUNS,
  entitlementsFor,
  resolveEntitlements,
  usesLiveAi,
} from "@/lib/permissions";

describe("plan entitlements", () => {
  it("caps Free at 10 products and 10 suppliers and locks contact", () => {
    const free = entitlementsFor("free");
    expect(free.catalogueProductLimit).toBe(FREE_CATALOGUE_PRODUCTS);
    expect(free.catalogueSupplierLimit).toBe(FREE_CATALOGUE_SUPPLIERS);
    expect(FREE_CATALOGUE_PRODUCTS).toBe(10);
    expect(FREE_CATALOGUE_SUPPLIERS).toBe(10);
    expect(free.supplierMessaging).toBe(false);
    expect(free.rfqManagement).toBe(false);
    expect(free.aiMode).toBe("demo");
    expect(free.aiRunsLimit).toBe(FREE_AI_RUNS);
    expect(FREE_AI_RUNS).toBe(3);
    expect(free.materialsPriceTracking).toBe(false);
  });

  it("gives Basic unlimited supplier browse and a single demo Mate run", () => {
    const basic = entitlementsFor("basic");
    expect(basic.catalogueProductLimit).toBeNull();
    expect(basic.catalogueSupplierLimit).toBeNull();
    expect(basic.supplierMessaging).toBe(true);
    expect(basic.aiMode).toBe("demo");
    expect(basic.aiRunsLimit).toBe(BASIC_AI_RUNS);
    expect(BASIC_AI_RUNS).toBe(1);
    expect(basic.materialsPriceTracking).toBe(false);
    expect(usesLiveAi(basic)).toBe(false);
  });

  it("gives Premium 10× Basic Mate usage, live AI, and materials tracking", () => {
    const premium = entitlementsFor("premium");
    expect(premium.aiRunsLimit).toBe(PREMIUM_AI_RUNS);
    expect(PREMIUM_AI_RUNS).toBe(10);
    expect(premium.aiMode).toBe("live");
    expect(premium.materialsPriceTracking).toBe(true);
    expect(premium.teamSeats).toBe(10);
    expect(usesLiveAi(premium)).toBe(true);
  });

  it("keeps Enterprise seats and unlimited Mate after subscribe", () => {
    const enterprise = entitlementsFor("enterprise");
    expect(enterprise.teamSeats).toBe(100);
    expect(enterprise.aiRunsLimit).toBeNull();
    expect(enterprise.aiMode).toBe("live");
    expect(enterprise.materialsPriceTracking).toBe(true);
    expect(enterprise.supplierMessaging).toBe(true);
  });

  it("keeps Premium and Enterprise on demo Mate while trialing", () => {
    const trialPremium = resolveEntitlements("premium", "trialing");
    expect(trialPremium.aiMode).toBe("demo");
    expect(trialPremium.materialsPriceTracking).toBe(true);
    expect(resolveEntitlements("premium", "active").aiMode).toBe("live");
    expect(resolveEntitlements("enterprise", "trialing").aiMode).toBe("demo");
    expect(resolveEntitlements("basic", "trialing").aiMode).toBe("demo");
  });
});
