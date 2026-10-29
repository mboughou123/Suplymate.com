import { describe, expect, it } from "vitest";
import { mergePackSuppliers, packStats } from "@/data/pack-catalog";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import { getSupplierProfile } from "@/lib/supplier-profile";
import { publicSupplierStats } from "@/lib/sourced-facts";

describe("public supplier counts", () => {
  it("counts every listed directory supplier, not the curated media-pack subset", () => {
    const listed = mergePackSuppliers(outscraperSuppliers);
    const stats = publicSupplierStats(listed);
    expect(stats.supplierCount).toBe(listed.length);
    expect(stats.supplierCount).toBeGreaterThan(packStats.suppliers);
    expect(new Set(listed.map((s) => s.id)).size).toBe(listed.length);
  });
});

describe("Al Gharbia public profile", () => {
  const supplier = mergePackSuppliers(outscraperSuppliers).find(
    (s) => s.id === "al-gharbia-pipe-company-llc-ae",
  )!;

  it("keeps sourced Google rating and real certificates", () => {
    const profile = getSupplierProfile(supplier);
    expect(profile.base.googleRating).toBe(4.8);
    expect(profile.base.googleReviews).toBe(48);
    expect(profile.certifications.length).toBeGreaterThan(0);
    expect(profile.certifications.every((c) => c.isReal)).toBe(true);
    expect(profile.trust.trustScore).toBeGreaterThan(0);
  });

  it("does not publish seeded performance metrics or fake reviews", () => {
    const profile = getSupplierProfile(supplier);
    expect(profile.trust.onTimeDelivery).toBeNull();
    expect(profile.trust.repeatBuyerRate).toBeNull();
    expect(profile.trust.responseTime).toBeNull();
    expect(profile.trust.aiConfidence).toBeNull();
    expect(profile.trust.trends).toBeNull();
    expect(profile.reviews).toEqual([]);
    expect(profile.ai.analysis).toBe("");
    expect(profile.ai.cards).toEqual([]);
    expect(profile.metaDescription).not.toMatch(/on-time/i);
    expect(profile.metaDescription).not.toMatch(/trust score/i);
    expect(profile.metaDescription).toMatch(/Google rating 4\.8/);
    expect(profile.metaDescription).toMatch(/Suplymate score/);
    expect(profile.company.factorySize).toBeNull();
    expect(profile.company.moq).toBeNull();
  });
});
