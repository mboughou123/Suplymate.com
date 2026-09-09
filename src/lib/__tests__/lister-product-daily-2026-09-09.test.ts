import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260909_HOLD_PRODUCT_SLUGS,
  DAILY_20260909_PRODUCT_OK_SLUGS,
  DAILY_20260909_PRODUCT_SOFT_SLUGS,
  daily20260909ProductSupplierId,
  listerDaily20260909Count,
  listerDaily20260909ForSupplier,
  listerDaily20260909HeldCount,
  listerDaily20260909Products,
  listerDaily20260909PublicCount,
  publicPathFromDailyLocalImage,
} from "@/lib/lister-product-daily-2026-09-09";
import { DAILY_20260909_SLUGS } from "@/lib/daily-2026-09-09-ids";
import { listerDaily20260908PublicCount } from "@/lib/lister-product-daily-2026-09-08";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isListerProductId } from "@/lib/lister-media";
import { listerProductsForSupplier } from "@/lib/lister-catalogue";
import { scrapedToProduct } from "@/lib/scraped-products-store";
import { isRealImageUrl } from "@/lib/image-fallback";
import rawDaily from "../../../data/daily-2026-09-09-products.json";

describe("Lister daily expansion 2026-09-09 (OK 1 + soft 15)", () => {
  it("loads exactly 16 approved RFQ SKUs", () => {
    expect((rawDaily as { products: unknown[] }).products).toHaveLength(16);
    expect(listerDaily20260909Count()).toBe(16);
    expect(listerDaily20260909PublicCount()).toBe(16);
    expect(listerDaily20260909HeldCount()).toBe(0);
    expect(listerDaily20260909Products.every((p) => p.status === "approved")).toBe(
      true,
    );
    expect(DAILY_20260909_PRODUCT_OK_SLUGS).toHaveLength(1);
    expect(DAILY_20260909_PRODUCT_SOFT_SLUGS).toHaveLength(15);
    expect(DAILY_20260909_HOLD_PRODUCT_SLUGS).toHaveLength(34);
  });

  it("wires OK+SOFT slugs and keeps HOLD 34 (incl. pepperl-fuchs) absent", () => {
    const ids = new Set(listerDaily20260909Products.map((p) => p.supplierId));
    for (const slug of [...DAILY_20260909_PRODUCT_OK_SLUGS, ...DAILY_20260909_PRODUCT_SOFT_SLUGS]) {
      const id = daily20260909ProductSupplierId(slug);
      expect(listerDaily20260909ForSupplier(id).length, slug).toBe(1);
    }
    for (const slug of DAILY_20260909_HOLD_PRODUCT_SLUGS) {
      expect(ids.has(slug), slug).toBe(false);
      expect(ids.has(`daily-20260909-${slug}`), slug).toBe(false);
      expect(
        listerDaily20260909Products.some((p) => p.id.includes(`-${slug}-`)),
        slug,
      ).toBe(false);
    }
    expect(ids.has("pepperl-fuchs")).toBe(false);
    expect(
      listerDaily20260909Products.some((p) => p.id.includes("pepperl-fuchs")),
    ).toBe(false);
    expect(
      existsSync(join(process.cwd(), "public", "images", "products", "pepperl-fuchs")),
    ).toBe(false);
  });

  it("uses the sealed sew-gearmotor still", () => {
    const sku = listerDaily20260909ForSupplier(
      daily20260909ProductSupplierId("sew-eurodrive"),
    )[0];
    expect(sku).toBeTruthy();
    expect(sku.images).toEqual(["/images/products/sew-eurodrive/sew-gearmotor.jpg"]);
    expect(sku.images[0].endsWith("sew-gearmotor.jpg")).toBe(true);
    expect(
      existsSync(
        join(
          process.cwd(),
          "public",
          "images",
          "products",
          "sew-eurodrive",
          "sew-gearmotor.jpg",
        ),
      ),
    ).toBe(true);
  });

  it("attaches marcegaglia SKU to the wired HOLD36 mill card", () => {
    expect(DAILY_20260909_SLUGS).toContain("marcegaglia");
    expect(daily20260909ProductSupplierId("marcegaglia")).toBe("marcegaglia");
    const sku = listerDaily20260909ForSupplier("marcegaglia")[0];
    expect(sku).toBeTruthy();
    expect(sku.status).toBe("approved");
    expect(sku.supplierId).toBe("marcegaglia");
    expect(sku.images).toEqual(["/images/products/marcegaglia/marcegaglia-tube.jpg"]);
    expect(
      listerProductsForSupplier("marcegaglia").some((p) =>
        p.id.startsWith("lister-b9-marcegaglia-"),
      ),
    ).toBe(true);
  });

  it("attaches sew / kaeser / yokogawa / daido-steel to wired mill cards", () => {
    for (const slug of ["sew-eurodrive", "kaeser", "yokogawa", "daido-steel"] as const) {
      expect(DAILY_20260909_SLUGS).toContain(slug);
      expect(daily20260909ProductSupplierId(slug)).toBe(slug);
      expect(listerDaily20260909ForSupplier(slug).length, slug).toBe(1);
    }
  });

  it("maps Hardware & Motion onto Industrial Parts and Tube & Pipes", () => {
    const sew = listerDaily20260909ForSupplier("sew-eurodrive")[0];
    expect(sew?.category).toBe("Industrial Parts");
    const tube = listerDaily20260909ForSupplier("marcegaglia")[0];
    expect(tube?.category).toBe("Tubes & Pipes");
  });

  it("keeps every SKU RFQ with null prices", () => {
    for (const p of listerDaily20260909Products) {
      expect(isListerProductId(p.id)).toBe(true);
      expect(p.id.startsWith("lister-b9-")).toBe(true);
      expect(p.basePrice).toBeNull();
      expect(p.priceSourceType).toBe("rfq");
      expect(hasSourcedPrice(p.basePrice)).toBe(false);
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
      expect(String(p.specifications?.["Price note"] ?? "")).toMatch(/RFQ/i);
      expect(p.description).toMatch(/RFQ/i);
      expect(p.description.length).toBeGreaterThan(40);
      expect(p.aiGeneratedImage).toBe(false);
    }
    const raw = (rawDaily as { products: { unit_price: number | null }[] }).products;
    expect(raw.every((p) => p.unit_price == null)).toBe(true);
  });

  it("uses on-disk local JPGs only (no remotes)", () => {
    for (const p of listerDaily20260909Products) {
      expect(p.images.length, p.name).toBe(1);
      expect(scrapedToProduct(p).aiGeneratedImage).toBeFalsy();
      for (const url of p.images) {
        expect(/^https?:\/\//i.test(url), url).toBe(false);
        expect(url.startsWith("/images/products/")).toBe(true);
        expect(isRealImageUrl(url)).toBe(true);
        const abs = join(process.cwd(), "public", url.replace(/^\//, ""));
        expect(existsSync(abs), url).toBe(true);
      }
    }
    expect(
      publicPathFromDailyLocalImage(
        "/workspace/suppliers-phase1/daily/2026-09-09/enhanced/products/sew-eurodrive/sew-gearmotor.jpg",
      ),
    ).toBe("/images/products/sew-eurodrive/sew-gearmotor.jpg");
  });

  it("leaves the 09-08 product pack at 50 approved SKUs", () => {
    expect(listerDaily20260908PublicCount()).toBe(50);
  });
});
