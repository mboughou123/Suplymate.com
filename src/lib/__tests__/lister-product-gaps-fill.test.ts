import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LISTER_GAPS_SUPPLIER_ID_BY_SLUG,
  listerGapsFillCount,
  listerGapsFillForSupplier,
  listerGapsFillProducts,
} from "@/lib/lister-product-gaps-fill";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isListerProductId, publicPathFromEnhancedDst } from "@/lib/lister-media";
import { isRealImageUrl } from "@/lib/image-fallback";
import { listerProductsForSupplier } from "@/lib/lister-catalogue";
import enhancedManifest from "../../../data/product-media-gaps-fill-enhanced-manifest.json";

describe("Lister product-gap fill", () => {
  it("loads all 27 SKUs for the 9 previously empty mills", () => {
    expect(listerGapsFillCount()).toBe(27);
    expect(
      listerGapsFillProducts.filter((p) => p.category === "Packaging"),
    ).toHaveLength(15);
    expect(
      listerGapsFillProducts.filter((p) => p.category === "Tubes & Pipes"),
    ).toHaveLength(12);
    expect(new Set(listerGapsFillProducts.map((p) => p.supplierId)).size).toBe(9);
  });

  it("maps every supplier_slug_guess to a phase-1 supplier id", () => {
    for (const p of listerGapsFillProducts) {
      expect(Object.values(LISTER_GAPS_SUPPLIER_ID_BY_SLUG)).toContain(p.supplierId);
      expect(isListerProductId(p.id)).toBe(true);
    }
  });

  it("keeps null unit_price as RFQ and never invents $0.00", () => {
    const rfq = listerGapsFillProducts.filter((p) => !hasSourcedPrice(p.basePrice));
    const priced = listerGapsFillProducts.filter((p) => hasSourcedPrice(p.basePrice));
    expect(rfq).toHaveLength(21);
    expect(priced).toHaveLength(6);
    for (const p of rfq) {
      expect(p.basePrice).toBeNull();
      expect(p.priceSourceType).toBe("rfq");
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
    }
    for (const p of priced) {
      expect(p.basePrice).toBeGreaterThan(0);
      expect(p.commissionRate).toBe(0);
      expect(p.priceSourceType).toBe("listed_fob");
      expect(priceSourceBadgeLabel(p.priceSourceType, true)).toBe("Listed FOB");
    }
  });

  it("labels Jieyuan / Shangyue / Dingsheng listed lows as Listed FOB", () => {
    const byName = (name: string) =>
      listerGapsFillProducts.find((p) => p.name === name);

    const ibc = byName("1000L IBC Tank for Chemical Transportation");
    expect(ibc?.basePrice).toBe(68);
    expect(ibc?.priceSourceType).toBe("listed_fob");
    expect(priceSourceBadgeLabel(ibc?.priceSourceType, true)).toBe("Listed FOB");

    const food = byName("1000L Food-Grade IBC Tank");
    expect(food?.basePrice).toBeNull();
    expect(food?.priceSourceType).toBe("rfq");

    const labels = byName("30-up Laser & Inkjet Address Labels (Avery 5160 Template)");
    expect(labels?.basePrice).toBe(2);
    expect(labels?.priceUnit).toBe("per bag");

    const dingsheng = byName("White Anti-static 1000L IBC Tank");
    expect(dingsheng?.basePrice).toBeNull();
    expect(String(dingsheng?.specifications?.["Price note"] ?? "")).toMatch(
      /placeholder/i,
    );
  });

  it("prefers enhanced local JPGs over remote image_urls", () => {
    for (const p of listerGapsFillProducts) {
      expect(p.images.length).toBeGreaterThan(0);
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

  it("uses all 50 gap-fill enhanced JPGs", () => {
    expect(enhancedManifest).toHaveLength(50);
    const used = new Set(listerGapsFillProducts.flatMap((p) => p.images));
    for (const entry of enhancedManifest as { dst?: string }[]) {
      const pub = publicPathFromEnhancedDst(entry.dst ?? "");
      expect(pub, entry.dst).toBeTruthy();
      expect(used.has(pub!), pub).toBe(true);
    }
  });

  it("surfaces the nine mills on the shared catalogue helper", () => {
    expect(listerGapsFillForSupplier("jiangsu-jieyuan-container-co-ltd-cn")).toHaveLength(3);
    expect(listerGapsFillForSupplier("man-industries-india-limited-in")).toHaveLength(3);
    expect(listerGapsFillForSupplier("uflex-limited-in")).toHaveLength(3);
    expect(listerProductsForSupplier("jiangsu-jieyuan-container-co-ltd-cn")).toHaveLength(3);
    expect(listerProductsForSupplier("al-jazeera-steel-products-co-saog-om")).toHaveLength(3);
    expect(listerProductsForSupplier("ratnamani-metals-tubes-limited-in")).toHaveLength(3);
  });
});
