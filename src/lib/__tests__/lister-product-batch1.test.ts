import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAICHENG_FOLDING_GIFT_BOX_IMAGE,
  LISTER_SUPPLIER_ID_BY_SLUG,
  listerBatch1Count,
  listerBatch1Products,
  listerProductsForSupplier,
} from "@/lib/lister-product-batch1";
import { hasSourcedPrice } from "@/lib/public-products";
import { isRealImageUrl } from "@/lib/image-fallback";
import { MATE_TAGLINE } from "@/lib/mate-branding";
import enhancedManifest from "../../../data/product-media-batch1-enhanced-manifest.json";

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

  it("prefers enhanced local public paths over remote image_urls", () => {
    for (const p of listerBatch1Products) {
      expect(p.images.length).toBeGreaterThan(0);
      for (const url of p.images) {
        expect(url.startsWith("/images/products/")).toBe(true);
        expect(url.toLowerCase()).not.toContain(".pdf");
        expect(/^https?:\/\//i.test(url)).toBe(false);
        expect(isRealImageUrl(url)).toBe(true);
        const abs = join(process.cwd(), "public", url.replace(/^\//, ""));
        expect(existsSync(abs), url).toBe(true);
      }
    }
  });

  it("maps Folding Gift Box to the Caicheng packaging JPEG", () => {
    const box = listerBatch1Products.find((p) => p.name === "Folding Gift Box");
    expect(box).toBeDefined();
    expect(box!.supplierId).toBe("dongguan-caicheng-printing-factory-cn");
    expect(box!.images[0]).toBe(CAICHENG_FOLDING_GIFT_BOX_IMAGE);
    expect(box!.images).toContain(
      "/images/products/packaging/dongguan-caicheng-printing/folding-gift-box-2.jpg"
    );
    expect(box!.basePrice).toBeNull();
  });

  it("attaches secondary enhanced JPGs from the 51-file manifest", () => {
    const withSecondaries = listerBatch1Products.filter((p) =>
      p.images.some((u) => /-\d+\.jpe?g$/i.test(u))
    );
    expect(withSecondaries.length).toBeGreaterThanOrEqual(17);
    expect(enhancedManifest).toHaveLength(51);

    const used = new Set(listerBatch1Products.flatMap((p) => p.images));
    for (const entry of enhancedManifest as { repo_path: string }[]) {
      const pub = `/${entry.repo_path.replace(/^public\//, "")}`;
      expect(used.has(pub), pub).toBe(true);
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
