import { describe, expect, it } from "vitest";
import {
  priceSourceBadgeLabel,
  priceSourceCaption,
  parsePriceSourceType,
} from "@/lib/price-source";
import { hasSourcedPrice } from "@/lib/public-products";
import { listerProductsForSupplier } from "@/lib/lister-product-batch1";
import { scrapedToProduct } from "@/lib/scraped-products-store";
import { getProductDetail } from "@/lib/product-detail";

describe("price source honesty", () => {
  it("labels dealer_list as Dealer list only when a unit price exists", () => {
    expect(priceSourceBadgeLabel("dealer_list", true)).toBe("Dealer list");
    expect(priceSourceBadgeLabel("dealer_list", false)).toBeNull();
    expect(priceSourceCaption("dealer_list", true)).toMatch(/not mill FOB/i);
    expect(parsePriceSourceType("dealer_list")).toBe("dealer_list");
  });

  it("tags priced APL Apollo SKUs as dealer_list, not mill FOB", () => {
    const apollo = listerProductsForSupplier("apl-apollo-tubes-limited-in");
    expect(apollo).toHaveLength(4);

    const priced = apollo.filter((p) => hasSourcedPrice(p.basePrice));
    const rfq = apollo.filter((p) => !hasSourcedPrice(p.basePrice));
    expect(priced).toHaveLength(3);
    expect(rfq).toHaveLength(1);

    for (const p of priced) {
      expect(p.priceSourceType).toBe("dealer_list");
      expect(p.specifications["Price source type"]).toBe("dealer_list");
      const cardLabel = priceSourceBadgeLabel(p.priceSourceType, true);
      expect(cardLabel).toBe("Dealer list");
      expect(cardLabel?.toLowerCase()).not.toContain("fob");
      expect(cardLabel?.toLowerCase()).not.toContain("mill");
      const detail = getProductDetail(scrapedToProduct(p));
      expect(detail.hasPublicPrice).toBe(true);
      expect(detail.priceSourceLabel).toBe("Dealer list");
      expect(detail.priceSourceCaption).toMatch(/not mill FOB/i);
    }

    for (const p of rfq) {
      expect(p.basePrice).toBeNull();
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
      const detail = getProductDetail(scrapedToProduct(p));
      expect(detail.hasPublicPrice).toBe(false);
      expect(detail.priceSourceLabel).toBeNull();
    }
  });
});
