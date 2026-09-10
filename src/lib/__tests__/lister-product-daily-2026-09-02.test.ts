import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LISTER_DAILY_SUPPLIER_ID_BY_SLUG,
  listerDaily20260902Count,
  listerDaily20260902ForSupplier,
  listerDaily20260902Products,
} from "@/lib/lister-product-daily-2026-09-02";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isListerProductId, publicPathFromDailyEnhancedDst } from "@/lib/lister-media";
import { isRealImageUrl } from "@/lib/image-fallback";
import { listerProductsForSupplier } from "@/lib/lister-catalogue";
import { scrapedToProduct } from "@/lib/scraped-products-store";
import enhancedManifest from "../../../data/daily-2026-09-02-products-enhanced-manifest.json";

describe("Lister daily expansion 2026-09-02", () => {
  it("loads all 51 SKUs across the six catalogue categories", () => {
    expect(listerDaily20260902Count()).toBe(51);
    expect(
      listerDaily20260902Products.filter((p) => p.category === "Steel & Metals"),
    ).toHaveLength(9);
    expect(
      listerDaily20260902Products.filter((p) => p.category === "Tubes & Pipes"),
    ).toHaveLength(8);
    expect(
      listerDaily20260902Products.filter((p) => p.category === "Cables & Electrical"),
    ).toHaveLength(8);
    expect(
      listerDaily20260902Products.filter((p) => p.category === "Construction"),
    ).toHaveLength(8);
    expect(
      listerDaily20260902Products.filter((p) => p.category === "Industrial Parts"),
    ).toHaveLength(8);
    expect(
      listerDaily20260902Products.filter((p) => p.category === "Packaging"),
    ).toHaveLength(10);
  });

  it("maps every mill slug to a stable supplier id", () => {
    for (const p of listerDaily20260902Products) {
      expect(Object.values(LISTER_DAILY_SUPPLIER_ID_BY_SLUG)).toContain(p.supplierId);
      expect(isListerProductId(p.id)).toBe(true);
    }
  });

  it("keeps RFQ null prices and labels Havells public listings", () => {
    const rfq = listerDaily20260902Products.filter((p) => !hasSourcedPrice(p.basePrice));
    const priced = listerDaily20260902Products.filter((p) => hasSourcedPrice(p.basePrice));
    expect(rfq).toHaveLength(49);
    expect(priced).toHaveLength(2);

    const guard = listerDaily20260902Products.find((p) =>
      p.slug.includes("lifeguard-fr-lsh"),
    );
    expect(guard?.basePrice).toBe(5353);
    expect(guard?.currency).toBe("INR");
    expect(guard?.priceSourceType).toBe("public_listing");
    expect(priceSourceBadgeLabel(guard?.priceSourceType, true)).toBe("Listed price");

    const line = listerDaily20260902Products.find((p) =>
      p.slug.includes("lifeline-fr"),
    );
    expect(line?.basePrice).toBe(8988);
    expect(line?.priceSourceType).toBe("public_listing");

    for (const p of rfq) {
      expect(p.basePrice).toBeNull();
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
    }
  });

  it("prefers enhanced local JPGs over remotes", () => {
    for (const p of listerDaily20260902Products) {
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

  it("labels only the Magicrete jointing-mortar photo as AI-generated", () => {
    const mortar = listerDaily20260902Products.find((p) =>
      p.slug.includes("block-jointing-mortar"),
    );
    expect(mortar).toBeDefined();
    expect(mortar?.aiGeneratedImage).toBe(true);
    expect(mortar?.specifications["Image note"]).toBe("AI-generated image");
    expect(mortar?.images[0]).toBe(
      "/images/products/magicrete-building-solutions/block-jointing-mortar-ai.jpg",
    );
    expect(scrapedToProduct(mortar!).aiGeneratedImage).toBe(true);

    const others = listerDaily20260902Products.filter(
      (p) => p.id !== mortar?.id,
    );
    expect(others.every((p) => !p.aiGeneratedImage)).toBe(true);
  });

  it("maps daily enhancer dst paths onto the flat public folder", () => {
    expect(
      publicPathFromDailyEnhancedDst(
        "/workspace/suppliers-phase1/daily/2026-09-02/enhanced/products/amcor/rigid-custom.jpg",
      ),
    ).toBe("/images/products/amcor/rigid-custom.jpg");
    expect(enhancedManifest.length).toBeGreaterThan(100);
  });

  it("surfaces known mills on the shared catalogue helper", () => {
    expect(
      listerDaily20260902ForSupplier("arabian-pipes-company-sa").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      listerProductsForSupplier("magicrete-building-solutions-private-limited-in").some(
        (p) => p.slug?.includes("block-jointing-mortar"),
      ),
    ).toBe(true);
  });
});
