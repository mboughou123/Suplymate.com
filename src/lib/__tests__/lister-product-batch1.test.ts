import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LISTER_SUPPLIER_ID_BY_SLUG,
  listerBatch1Count,
  listerBatch1Products,
  listerProductsForSupplier,
} from "@/lib/lister-product-batch1";
import { hasSourcedPrice } from "@/lib/public-products";
import { isRealImageUrl } from "@/lib/image-fallback";
import { MATE_TAGLINE } from "@/lib/mate-branding";

describe("Lister product-media batch 1", () => {
  it("loads all 33 packaging + tubes SKUs", () => {
    expect(listerBatch1Count()).toBe(33);
    expect(listerBatch1Products).toHaveLength(33);
  });

  it("maps every supplier_slug_guess to a phase-1 supplier id", () => {
    for (const p of listerBatch1Products) {
      expect(p.supplierId.length).toBeGreaterThan(3);
      expect(Object.values(LISTER_SUPPLIER_ID_BY_SLUG)).toContain(p.supplierId);
    }
  });

  it("never invents prices — null unit_price stays RFQ", () => {
    const rfq = listerBatch1Products.filter((p) => !hasSourcedPrice(p.basePrice));
    const priced = listerBatch1Products.filter((p) => hasSourcedPrice(p.basePrice));
    expect(rfq.length).toBe(22); // 17 pack + 16 tubes − 8 − 3
    expect(priced.length).toBe(11);
    for (const p of rfq) {
      expect(p.basePrice).toBeNull();
    }
    for (const p of priced) {
      expect(p.commissionRate).toBe(0);
      expect(p.basePrice).toBeGreaterThan(0);
    }
  });

  it("attaches local product photographs (not PDF catalogs)", () => {
    for (const p of listerBatch1Products) {
      expect(p.images.length).toBeGreaterThan(0);
      const primary = p.images[0];
      expect(primary.toLowerCase()).not.toContain(".pdf");
      expect(isRealImageUrl(primary)).toBe(true);
      if (primary.startsWith("/images/products/")) {
        const abs = join(process.cwd(), "public", primary.replace(/^\//, ""));
        expect(existsSync(abs), primary).toBe(true);
      }
    }
  });

  it("surfaces Caicheng / AJ Steel / APL Apollo SKUs under the right mills", () => {
    expect(
      listerProductsForSupplier("dongguan-caicheng-printing-factory-cn").length
    ).toBe(4);
    expect(listerProductsForSupplier("aj-steel-icad2-ae").length).toBe(3);
    expect(listerProductsForSupplier("apl-apollo-tubes-limited-in").length).toBe(4);
  });

  it("keeps Mate tagline locked", () => {
    expect(MATE_TAGLINE).toBe(
      "Meet Mate — 1 AI, 3 agents (Scout / Compare / Watch) working for you."
    );
  });
});
