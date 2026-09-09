import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260908_HOLD_PRODUCT_SLUGS,
  DAILY_20260908_PRODUCT_OK_SLUGS,
  DAILY_20260908_PRODUCT_SOFT_SLUGS,
  daily20260908ProductSupplierId,
  listerDaily20260908Count,
  listerDaily20260908ForSupplier,
  listerDaily20260908HeldCount,
  listerDaily20260908Products,
  listerDaily20260908PublicCount,
  publicPathFromDailyLocalImage,
} from "@/lib/lister-product-daily-2026-09-08";
import { DAILY_20260908_SLUGS } from "@/lib/daily-2026-09-08-ids";
import { listerDaily20260907PublicCount } from "@/lib/lister-product-daily-2026-09-07";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isListerProductId } from "@/lib/lister-media";
import { listerProductsForSupplier } from "@/lib/lister-catalogue";
import { scrapedToProduct } from "@/lib/scraped-products-store";
import { isRealImageUrl } from "@/lib/image-fallback";
import rawDaily from "../../../data/daily-2026-09-08-products.json";

describe("Lister daily expansion 2026-09-08 (OK 4 + soft 34)", () => {
  it("loads exactly 38 approved RFQ SKUs", () => {
    expect((rawDaily as { products: unknown[] }).products).toHaveLength(38);
    expect(listerDaily20260908Count()).toBe(38);
    expect(listerDaily20260908PublicCount()).toBe(38);
    expect(listerDaily20260908HeldCount()).toBe(0);
    expect(listerDaily20260908Products.every((p) => p.status === "approved")).toBe(
      true,
    );
    expect(DAILY_20260908_PRODUCT_OK_SLUGS).toHaveLength(4);
    expect(DAILY_20260908_PRODUCT_SOFT_SLUGS).toHaveLength(34);
    expect(DAILY_20260908_HOLD_PRODUCT_SLUGS).toHaveLength(12);
  });

  it("wires OK+SOFT slugs and keeps HOLD 12 absent", () => {
    const ids = new Set(listerDaily20260908Products.map((p) => p.supplierId));
    const guesses = new Set(
      listerDaily20260908Products.map((p) => p.id.replace(/^lister-b8-/, "").split("-")[0]),
    );
    for (const slug of [...DAILY_20260908_PRODUCT_OK_SLUGS, ...DAILY_20260908_PRODUCT_SOFT_SLUGS]) {
      const id = daily20260908ProductSupplierId(slug);
      expect(listerDaily20260908ForSupplier(id).length, slug).toBe(1);
    }
    for (const slug of DAILY_20260908_HOLD_PRODUCT_SLUGS) {
      expect(ids.has(slug), slug).toBe(false);
      expect(ids.has(`daily-20260908-${slug}`), slug).toBe(false);
      expect(
        listerDaily20260908Products.some((p) => p.id.includes(`-${slug}-`)),
        slug,
      ).toBe(false);
      expect(
        existsSync(join(process.cwd(), "public", "images", "products", slug)),
        slug,
      ).toBe(false);
    }
    expect(guesses.has("can")).toBe(false);
  });

  it("uses the sealed still filenames for OK + Siemens", () => {
    const still: Record<string, string> = {
      schuetz: "schuetz-ibc.jpg",
      komatsu: "komatsu-mining.jpg",
      "volvo-ce": "volvo-ce-excavators.jpg",
      siemens: "siemens-automation.jpg",
    };
    for (const [slug, file] of Object.entries(still)) {
      const sku = listerDaily20260908ForSupplier(daily20260908ProductSupplierId(slug))[0];
      expect(sku, slug).toBeTruthy();
      expect(sku.images).toEqual([`/images/products/${slug}/${file}`]);
      expect(existsSync(join(process.cwd(), "public", "images", "products", slug, file))).toBe(
        true,
      );
    }
  });

  it("wires the nvent SKU without a mill card", () => {
    expect(DAILY_20260908_SLUGS).not.toContain("nvent");
    expect(daily20260908ProductSupplierId("nvent")).toBe("nvent");
    const sku = listerDaily20260908ForSupplier("nvent")[0];
    expect(sku).toBeTruthy();
    expect(sku.status).toBe("approved");
    expect(sku.supplierId).toBe("nvent");
    expect(sku.images).toEqual(["/images/products/nvent/mill-fallback-2.jpg"]);
    expect(listerProductsForSupplier("nvent").some((p) => p.id.startsWith("lister-b8-nvent-"))).toBe(
      true,
    );
  });

  it("maps Hardware & Motion onto Industrial Parts", () => {
    for (const slug of ["rittal", "nvent", "oriental-motor"] as const) {
      const sku = listerDaily20260908ForSupplier(daily20260908ProductSupplierId(slug))[0];
      expect(sku?.category, slug).toBe("Industrial Parts");
    }
    const eew = listerDaily20260908ForSupplier("eew")[0];
    expect(eew?.category).toBe("Tubes & Pipes");
  });

  it("keeps every SKU RFQ with null prices and honesty notes", () => {
    for (const p of listerDaily20260908Products) {
      expect(isListerProductId(p.id)).toBe(true);
      expect(p.id.startsWith("lister-b8-")).toBe(true);
      expect(p.basePrice).toBeNull();
      expect(p.priceSourceType).toBe("rfq");
      expect(hasSourcedPrice(p.basePrice)).toBe(false);
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
      expect(String(p.specifications?.["Price note"] ?? "")).toMatch(/RFQ/i);
      expect(p.description).toMatch(/RFQ/i);
      expect(p.description.length).toBeGreaterThan(40);
      expect(p.aiGeneratedImage).toBe(false);
    }
    const raw = (rawDaily as { products: { unit_price: number | null; honesty_note?: string }[] })
      .products;
    expect(raw.every((p) => p.unit_price == null)).toBe(true);
    expect(raw.every((p) => (p.honesty_note ?? "").trim().length > 0)).toBe(true);
  });

  it("uses on-disk local JPGs only (no remotes)", () => {
    for (const p of listerDaily20260908Products) {
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
        "/workspace/suppliers-phase1/daily/2026-09-08/enhanced/products/schuetz/schuetz-ibc.jpg",
      ),
    ).toBe("/images/products/schuetz/schuetz-ibc.jpg");
  });

  it("leaves the 09-07 product pack at 36 approved SKUs", () => {
    expect(listerDaily20260907PublicCount()).toBe(36);
  });
});
