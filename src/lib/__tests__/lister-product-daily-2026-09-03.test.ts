import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  daily20260903SupplierId,
  isDaily20260903QaHeld,
  listerDaily20260903Count,
  listerDaily20260903ForSupplier,
  listerDaily20260903HeldCount,
  listerDaily20260903HeldProducts,
  listerDaily20260903Products,
  listerDaily20260903PublicCount,
  listerDaily20260903PublicProducts,
  publicPathFromDailyLocalImage,
} from "@/lib/lister-product-daily-2026-09-03";
import { hasSourcedPrice, getPublicProductsPage } from "@/lib/public-products";
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

  it("holds 12 Research QA rejects from public /products (58 remain approved)", () => {
    // 6 Jiuli + Flowserve butterfly + KSB valves + Huhtamaki flexible +
    // Tenaris coiled tubing + NSK spherical + Ball aerosol = 12.
    expect(listerDaily20260903HeldCount()).toBe(12);
    expect(listerDaily20260903PublicCount()).toBe(58);
    expect(listerDaily20260903HeldCount() + listerDaily20260903PublicCount()).toBe(
      70,
    );

    const held = listerDaily20260903HeldProducts();
    expect(held.every((p) => p.status === "needs_info")).toBe(true);
    expect(held.filter((p) => p.supplierId === "jiuli")).toHaveLength(6);
    const heldNames = new Set(held.map((p) => p.name));
    for (const name of [
      "Flowserve Butterfly Valves",
      "KSB Industrial Valves (Globe / Butterfly / Gate)",
      "Huhtamaki Flexible Food Packaging Films and Pouches",
      "Tenaris Coiled Tubing and Industrial Pipe",
      "NSK Spherical Roller Bearings",
      "Ball Aluminum Aerosol Cans",
    ]) {
      expect(heldNames.has(name), name).toBe(true);
    }

    // Soft-but-OK remain public.
    const pubNames = new Set(listerDaily20260903PublicProducts().map((p) => p.name));
    expect(pubNames.has("Ball Aluminum Beverage Cans")).toBe(true);
    expect(pubNames.has("SKF Explorer Deep Groove Ball Bearings")).toBe(true);
    expect(
      pubNames.has("Smurfit Westrock Sustainable Packaging Design and Containerboard"),
    ).toBe(true);
    expect(pubNames.has("Tetra Pak Tetra Prisma Aseptic Carton Packages")).toBe(true);
    expect(pubNames.has("Ball Aluminum Aerosol Cans")).toBe(false);
    expect(isDaily20260903QaHeld("jiuli", "anything")).toBe(true);
    expect(isDaily20260903QaHeld("ball", "ball-aluminum-beverage-cans")).toBe(false);
  });

  it("excludes held SKUs from the public products overlay", async () => {
    const page = await getPublicProductsPage({ page: 1, pageSize: 200, search: "Jiuli" });
    expect(page.items.filter((i) => i.id.startsWith("lister-b7-"))).toHaveLength(0);
    const aerosol = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "Ball Aluminum Aerosol",
    });
    expect(aerosol.items.some((i) => i.id.includes("aerosol"))).toBe(false);
    const beverage = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "Ball Aluminum Beverage",
    });
    expect(
      beverage.items.some((i) => i.id === "lister-b7-ball-ball-aluminum-beverage-cans"),
    ).toBe(true);
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
    // Pack still retains Jiuli records; public helper hides QA holds.
    expect(listerDaily20260903ForSupplier("jiuli")).toHaveLength(6);
    expect(listerProductsForSupplier("jiuli")).toHaveLength(0);
    expect(
      listerProductsForSupplier("youfa").some((p) => p.id.startsWith("lister-b7-")),
    ).toBe(true);
  });
});
