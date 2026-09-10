import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LISTER_GAPS2_SUPPLIER_ID_BY_SLUG,
  listerGapsFill2Count,
  listerGapsFill2ForSupplier,
  listerGapsFill2Products,
} from "@/lib/lister-product-gaps-fill-2";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isListerProductId } from "@/lib/lister-media";
import { isRealImageUrl } from "@/lib/image-fallback";
import { listerProductsForSupplier } from "@/lib/lister-catalogue";

describe("Lister product-gap fill pass 2", () => {
  it("loads all 54 SKUs for 18 mills", () => {
    expect(listerGapsFill2Count()).toBe(54);
    expect(new Set(listerGapsFill2Products.map((p) => p.supplierId)).size).toBe(18);
    expect(
      listerGapsFill2Products.filter((p) => p.category === "Steel & Metals"),
    ).toHaveLength(12);
    expect(
      listerGapsFill2Products.filter((p) => p.category === "Cables & Electrical"),
    ).toHaveLength(15);
    expect(
      listerGapsFill2Products.filter((p) => p.category === "Construction"),
    ).toHaveLength(12);
    expect(
      listerGapsFill2Products.filter((p) => p.category === "Industrial Parts"),
    ).toHaveLength(15);
  });

  it("maps every mill to a phase-1 supplier id", () => {
    for (const p of listerGapsFill2Products) {
      expect(Object.values(LISTER_GAPS2_SUPPLIER_ID_BY_SLUG)).toContain(p.supplierId);
      expect(isListerProductId(p.id)).toBe(true);
    }
  });

  it("keeps RFQ null prices and labels Polycab MRP + Luxing Listed FOB", () => {
    const rfq = listerGapsFill2Products.filter((p) => !hasSourcedPrice(p.basePrice));
    const priced = listerGapsFill2Products.filter((p) => hasSourcedPrice(p.basePrice));
    expect(rfq).toHaveLength(50);
    expect(priced).toHaveLength(4);

    const green = listerGapsFill2Products.find((p) =>
      p.slug.includes("polycab-green-wire"),
    );
    expect(green?.basePrice).toBe(6550);
    expect(green?.currency).toBe("INR");
    expect(green?.priceSourceType).toBe("printed_mrp");
    expect(priceSourceBadgeLabel(green?.priceSourceType, true)).toBe("MRP");

    const luxing = listerGapsFill2ForSupplier("shandong-new-luxing-cable-co-ltd-cn");
    expect(luxing).toHaveLength(3);
    for (const p of luxing) {
      expect(p.basePrice).toBeGreaterThan(0);
      expect(p.priceSourceType).toBe("listed_fob");
      expect(priceSourceBadgeLabel(p.priceSourceType, true)).toBe("Listed FOB");
    }

    for (const p of rfq) {
      expect(p.basePrice).toBeNull();
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
    }
  });

  it("prefers enhanced local JPGs over remotes / PDFs", () => {
    for (const p of listerGapsFill2Products) {
      expect(p.images.length, p.name).toBeGreaterThan(0);
      for (const url of p.images) {
        expect(url.toLowerCase()).not.toContain(".pdf");
        expect(/^https?:\/\//i.test(url), url).toBe(false);
        expect(url.startsWith("/images/products/"), `${p.name} → ${url}`).toBe(true);
        expect(isRealImageUrl(url)).toBe(true);
        const abs = join(process.cwd(), "public", url.replace(/^\//, ""));
        expect(existsSync(abs), url).toBe(true);
      }
    }
  });

  it("surfaces mills on the shared catalogue helper", () => {
    expect(listerProductsForSupplier("jsw-steel-limited-in")).toHaveLength(3);
    expect(listerGapsFill2ForSupplier("kei-industries-limited-in")).toHaveLength(3);
  });
});
