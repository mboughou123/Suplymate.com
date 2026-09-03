import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  daily20260903SupplierId,
  listerDaily20260903Count,
  listerDaily20260903ForSupplier,
  listerDaily20260903Products,
  publicPathFromDailyLocalImage,
} from "@/lib/lister-product-daily-2026-09-03";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isListerProductId } from "@/lib/lister-media";
import { isRealImageUrl } from "@/lib/image-fallback";
import { listerProductsForSupplier } from "@/lib/lister-catalogue";
import { scrapedToProduct } from "@/lib/scraped-products-store";
import rawDaily from "../../../data/daily-2026-09-03-products.json";

describe("Lister daily expansion 2026-09-03", () => {
  it("loads all 70 RFQ SKUs across the six catalogue categories", () => {
    expect(listerDaily20260903Count()).toBe(70);
    expect(
      listerDaily20260903Products.filter((p) => p.category === "Tubes & Pipes"),
    ).toHaveLength(18);
    expect(
      listerDaily20260903Products.filter((p) => p.category === "Packaging"),
    ).toHaveLength(18);
    expect(
      listerDaily20260903Products.filter((p) => p.category === "Industrial Parts"),
    ).toHaveLength(16);
    expect(
      listerDaily20260903Products.filter((p) => p.category === "Steel & Metals"),
    ).toHaveLength(8);
    expect(
      listerDaily20260903Products.filter((p) => p.category === "Cables & Electrical"),
    ).toHaveLength(6);
    expect(
      listerDaily20260903Products.filter((p) => p.category === "Construction"),
    ).toHaveLength(4);
  });

  it("maps every mill slug onto an existing phase-1 / daily mill id (no new mills)", () => {
    for (const p of listerDaily20260903Products) {
      expect(isListerProductId(p.id)).toBe(true);
      expect(p.id.startsWith("lister-b7-")).toBe(true);
      expect(p.supplierId).toBeTruthy();
    }
    expect(daily20260903SupplierId("youfa")).toBe("youfa");
    expect(daily20260903SupplierId("ducab")).toBe(
      "ducab-dubai-cable-company-pvt-ltd-ae",
    );
  });

  it("keeps every SKU RFQ with null prices (never invents FOB)", () => {
    expect(listerDaily20260903Products.every((p) => !hasSourcedPrice(p.basePrice))).toBe(
      true,
    );
    for (const p of listerDaily20260903Products) {
      expect(p.basePrice).toBeNull();
      expect(p.priceSourceType).toBe("rfq");
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
      expect(String(p.specifications?.["Price note"] ?? "")).toMatch(/RFQ/i);
      expect(String(p.specifications?.["Price note"] ?? "").toLowerCase()).not.toMatch(
        /\blisted fob\b/,
      );
    }
    const raw = (rawDaily as { products: { unit_price: number | null }[] }).products;
    expect(raw.every((p) => p.unit_price == null)).toBe(true);
  });

  it("uses on-disk local JPGs only (no remotes, no stock, no AI badges)", () => {
    for (const p of listerDaily20260903Products) {
      expect(p.images.length, p.name).toBeGreaterThan(0);
      expect(p.aiGeneratedImage).toBe(false);
      expect(scrapedToProduct(p).aiGeneratedImage).toBeFalsy();
      for (const url of p.images) {
        expect(url.toLowerCase()).not.toContain(".pdf");
        expect(/^https?:\/\//i.test(url), url).toBe(false);
        expect(url.startsWith("/images/products/"), `${p.name} → ${url}`).toBe(true);
        expect(url).toMatch(/^\/images\/products\/[^/]+\/[^/]+\.(jpe?g|png|webp)$/i);
        expect(isRealImageUrl(url)).toBe(true);
        const abs = join(process.cwd(), "public", url.replace(/^\//, ""));
        expect(existsSync(abs), url).toBe(true);
      }
    }
  });

  it("maps workspace local_images onto the flat public products folder", () => {
    expect(
      publicPathFromDailyLocalImage(
        "/workspace/suppliers-phase1/daily/2026-09-03/images/products/youfa/hdg-erw-pipe.jpg",
      ),
    ).toBe("/images/products/youfa/hdg-erw-pipe.jpg");
  });

  it("surfaces known mills on the shared catalogue helper", () => {
    expect(listerDaily20260903ForSupplier("youfa").length).toBeGreaterThanOrEqual(1);
    expect(
      listerProductsForSupplier("jiuli").some((p) => p.id.startsWith("lister-b7-")),
    ).toBe(true);
  });
});
