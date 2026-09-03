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

  it("approves all 70 SKUs with no remaining Research QA holds", () => {
    expect(listerDaily20260903HeldCount()).toBe(0);
    expect(listerDaily20260903PublicCount()).toBe(70);
    expect(listerDaily20260903HeldProducts()).toHaveLength(0);
    expect(listerDaily20260903Products.every((p) => p.status === "approved")).toBe(true);

    const pub = listerDaily20260903PublicProducts();
    const pubNames = new Set(pub.map((p) => p.name));
    expect(pubNames.has("Ball Aluminum Beverage Cans")).toBe(true);
    expect(pubNames.has("Ball Aluminum Aerosol Cans")).toBe(true);
    expect(pubNames.has("SKF Explorer Deep Groove Ball Bearings")).toBe(true);
    expect(
      pubNames.has("Smurfit Westrock Sustainable Packaging Design and Containerboard"),
    ).toBe(true);
    expect(pubNames.has("Tetra Pak Tetra Prisma Aseptic Carton Packages")).toBe(true);
    expect(pubNames.has("Flowserve Butterfly Valves")).toBe(true);
    expect(pubNames.has("KSB Industrial Valves (Globe / Butterfly / Gate)")).toBe(true);
    expect(
      pubNames.has("Huhtamaki Flexible Food Packaging Films and Pouches"),
    ).toBe(true);
    expect(pubNames.has("Tenaris Coiled Tubing and Industrial Pipe")).toBe(true);
    expect(pubNames.has("NSK Spherical Roller Bearings")).toBe(true);

    const byName = new Map(pub.map((p) => [p.name, p]));
    expect(byName.get("Ball Aluminum Aerosol Cans")?.images[0]).toBe(
      "/images/products/ball/aerosol-cans.jpg",
    );
    expect(byName.get("Flowserve Butterfly Valves")?.images).toEqual(
      expect.arrayContaining([
        "/images/products/flowserve/butterfly-fallback-local.jpg",
        "/images/products/flowserve/butterfly-fallback-local-2.jpg",
      ]),
    );
    expect(byName.get("KSB Industrial Valves (Globe / Butterfly / Gate)")?.images).toEqual(
      expect.arrayContaining(["/images/products/ksb/ksb-valves-fallback-local.jpg"]),
    );
    expect(
      byName.get("Huhtamaki Flexible Food Packaging Films and Pouches")?.images,
    ).toEqual(
      expect.arrayContaining([
        "/images/products/huhtamaki/flexible-food-pack.jpg",
        "/images/products/huhtamaki/picnic-flex.jpg",
      ]),
    );
    expect(byName.get("Tenaris Coiled Tubing and Industrial Pipe")?.images).toEqual(
      expect.arrayContaining(["/images/products/tenaris/coiled-tubing.jpg"]),
    );
    expect(byName.get("NSK Spherical Roller Bearings")?.images).toEqual(
      expect.arrayContaining([
        "/images/products/nsk/nsk-spherical-comp.jpg",
        "/images/products/nsk/nsk-cutaway.jpg",
      ]),
    );

    const jiuli = pub.filter((p) => p.supplierId === "jiuli");
    expect(jiuli).toHaveLength(6);
    for (const p of jiuli) {
      expect(p.status, p.name).toBe("approved");
      expect(p.images.length, p.name).toBeGreaterThan(0);
    }

    expect(isDaily20260903QaHeld("jiuli", "anything")).toBe(false);
    expect(isDaily20260903QaHeld("ball", "ball-aluminum-aerosol-cans")).toBe(false);
    expect(isDaily20260903QaHeld("ball", "ball-aluminum-beverage-cans")).toBe(false);
    expect(isDaily20260903QaHeld("flowserve", "flowserve-butterfly-valves")).toBe(false);
    expect(
      isDaily20260903QaHeld("ksb", "ksb-industrial-valves-globe-butterfly-gate"),
    ).toBe(false);
  });

  it("surfaces Jiuli and Ball aerosol on the public products overlay", async () => {
    const page = await getPublicProductsPage({ page: 1, pageSize: 200, search: "Jiuli" });
    expect(page.items.filter((i) => i.id.startsWith("lister-b7-jiuli-"))).toHaveLength(6);
    const aerosol = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "Ball Aluminum Aerosol",
    });
    expect(
      aerosol.items.some((i) => i.id === "lister-b7-ball-ball-aluminum-aerosol-cans"),
    ).toBe(true);
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
    expect(listerDaily20260903ForSupplier("jiuli")).toHaveLength(6);
    expect(listerProductsForSupplier("jiuli")).toHaveLength(6);
    expect(
      listerProductsForSupplier("youfa").some((p) => p.id.startsWith("lister-b7-")),
    ).toBe(true);
  });
});
