import { describe, expect, it } from "vitest";
import { hasSourcedPrice, productHasPublicPrice } from "@/lib/public-products";
import { scrapedToProduct } from "@/lib/scraped-products-store";
import { getProductDetail } from "@/lib/product-detail";
import type { ScrapedProduct } from "@/data/scraped-products";

describe("hasSourcedPrice", () => {
  it("rejects null, undefined, zero, and negative", () => {
    expect(hasSourcedPrice(null)).toBe(false);
    expect(hasSourcedPrice(undefined)).toBe(false);
    expect(hasSourcedPrice(0)).toBe(false);
    expect(hasSourcedPrice(-1)).toBe(false);
  });

  it("accepts positive finite prices", () => {
    expect(hasSourcedPrice(0.01)).toBe(true);
    expect(hasSourcedPrice(12.5)).toBe(true);
  });
});

describe("scrapedToProduct pricing honesty", () => {
  const base: ScrapedProduct = {
    id: "test-p",
    supplierId: "test-s",
    supplierName: "Test Mill",
    supplierLogo: null,
    supplierCountry: "UAE",
    name: "Test pipe",
    slug: "test-pipe",
    category: "Tubes & Pipes",
    images: [],
    videos: [],
    basePrice: null,
    priceUnit: "unit",
    commissionRate: null,
    currency: "USD",
    moq: "2 tons",
    shippingTime: null,
    description: null,
    shortDescription: null,
    specifications: {},
    customizationOptions: [],
    certifications: [],
    rating: null,
    reviewCount: null,
    sourceUrl: "https://example.com",
    productUrl: null,
    verifiedSupplier: true,
    status: "approved",
    scrapedAt: "2026-09-01T00:00:00.000Z",
  };

  it("marks null basePrice as not public (avoids $0.00)", () => {
    const p = scrapedToProduct(base);
    expect(p.hasPublicPrice).toBe(false);
    expect(p.basePrice).toBeUndefined();
  });

  it("marks zero basePrice as not public", () => {
    const p = scrapedToProduct({ ...base, basePrice: 0 });
    expect(p.hasPublicPrice).toBe(false);
    expect(p.basePrice).toBeUndefined();
  });

  it("keeps positive basePrice as public", () => {
    const p = scrapedToProduct({ ...base, basePrice: 14.2 });
    expect(p.hasPublicPrice).toBe(true);
    expect(p.basePrice).toBe(14.2);
  });

  it("never surfaces $0.00 on RFQ detail / recommended labels", () => {
    const p = scrapedToProduct(base);
    expect(productHasPublicPrice(p)).toBe(false);
    const detail = getProductDetail(p);
    expect(detail.hasPublicPrice).toBe(false);
    expect(detail.displayFromLabel).toBe("RFQ");
    expect(detail.displayFromLabel).not.toContain("$0");
    expect(detail.recommended.every((r) => !r.priceFromLabel.includes("$0"))).toBe(
      true
    );
  });
});
