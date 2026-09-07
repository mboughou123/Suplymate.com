import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260907_HOLD_MILL_PRODUCT_OK_SLUGS,
  DAILY_20260907_HOLD_PRODUCT_FAIL_SLUGS,
  daily20260907ProductSupplierId,
  isDaily20260907QaHeld,
  listerDaily20260907Count,
  listerDaily20260907ForSupplier,
  listerDaily20260907HeldCount,
  listerDaily20260907HeldProducts,
  listerDaily20260907Products,
  listerDaily20260907PublicCount,
  listerDaily20260907PublicProducts,
  publicPathFromDailyLocalImage,
} from "@/lib/lister-product-daily-2026-09-07";
import {
  DAILY_20260907_HOLD_SLUGS,
  daily20260907Suppliers,
  dailySupplierIdForSlug20260907,
} from "@/lib/daily-2026-09-07-suppliers";
import { hasSourcedPrice, getPublicProductsPage } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isListerProductId } from "@/lib/lister-media";
import { isRealImageUrl } from "@/lib/image-fallback";
import { listerProductsForSupplier } from "@/lib/lister-catalogue";
import { scrapedToProduct } from "@/lib/scraped-products-store";
import rawDaily from "../../../data/daily-2026-09-07-products.json";
import rawSeal from "../../../data/daily-2026-09-07-researcher-products-seal.json";

const WIRED_MILL_SLUGS = [
  "jfe-steel",
  "sick",
  "ingersoll-rand",
  "sandvik",
  "oi-glass",
] as const;

describe("Lister daily expansion 2026-09-07 V2 (9 SKUs)", () => {
  it("loads exactly 9 RFQ SKUs — all approved, none held", () => {
    expect(listerDaily20260907Count()).toBe(9);
    expect(listerDaily20260907PublicCount()).toBe(9);
    expect(listerDaily20260907HeldCount()).toBe(0);
    expect(listerDaily20260907HeldProducts()).toHaveLength(0);
    expect(listerDaily20260907Products.every((p) => p.status === "approved")).toBe(
      true,
    );
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Tubes & Pipes"),
    ).toHaveLength(5);
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Packaging"),
    ).toHaveLength(1);
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Industrial Parts"),
    ).toHaveLength(3);
  });

  it("maps Hardware & Motion onto Industrial Parts and keeps SICK approved", () => {
    const sick = listerDaily20260907Products.find((p) => p.supplierId === "sick");
    expect(sick).toBeTruthy();
    expect(sick?.category).toBe("Industrial Parts");
    expect(sick?.status).toBe("approved");
    expect(sick?.name).toBe(
      "SICK Industrial Sensors, Safety Systems and Machine Vision",
    );
  });

  it("does not wire HOLD product-stills-fail slugs (berg-pipe, abb, …)", () => {
    const slugs = new Set(
      (rawDaily as { products: { supplier_slug_guess: string }[] }).products.map(
        (p) => p.supplier_slug_guess,
      ),
    );
    const ids = listerDaily20260907Products.map((p) => p.id).join(" ");
    const supplierIds = new Set(listerDaily20260907Products.map((p) => p.supplierId));
    expect((rawSeal as { hold_product_stills_fail: string[] }).hold_product_stills_fail)
      .toEqual([...DAILY_20260907_HOLD_PRODUCT_FAIL_SLUGS]);
    for (const fail of DAILY_20260907_HOLD_PRODUCT_FAIL_SLUGS) {
      expect(slugs.has(fail), fail).toBe(false);
      expect(supplierIds.has(fail), fail).toBe(false);
      expect(ids.includes(fail), fail).toBe(false);
    }
    expect(slugs.has("berg-pipe")).toBe(false);
    expect(slugs.has("abb")).toBe(false);
    expect(slugs.has("american-spiralweld")).toBe(false);
    expect(slugs.has("tpco")).toBe(false);
  });

  it("wires Interpipe onto a slug id without inventing a mill card", () => {
    const millIds = new Set(daily20260907Suppliers.map((s) => s.id));
    expect(DAILY_20260907_HOLD_SLUGS).toContain("interpipe");
    expect(millIds.has("interpipe")).toBe(false);
    expect(daily20260907ProductSupplierId("interpipe")).toBe("interpipe");
    expect(listerDaily20260907ForSupplier("interpipe")).toHaveLength(1);
    expect(listerDaily20260907ForSupplier("interpipe")[0].status).toBe("approved");
    expect(DAILY_20260907_HOLD_MILL_PRODUCT_OK_SLUGS).toContain("interpipe");
  });

  it("attaches wired-mill SKUs (incl. cleared Saudi/Corinth/Mueller) to directory ids", () => {
    const millIds = new Set(daily20260907Suppliers.map((s) => s.id));
    const wiredWithProducts = [
      ...WIRED_MILL_SLUGS,
      "saudi-steel-pipe",
      "corinth-pipeworks",
      "mueller-industries",
    ] as const;
    for (const slug of wiredWithProducts) {
      const id = dailySupplierIdForSlug20260907(slug);
      expect(millIds.has(id), slug).toBe(true);
      expect(daily20260907ProductSupplierId(slug)).toBe(id);
      const skus = listerDaily20260907ForSupplier(id);
      expect(skus.length, slug).toBe(1);
      expect(skus[0].status).toBe("approved");
      expect(listerProductsForSupplier(id).some((p) => p.id.startsWith("lister-b7-"))).toBe(
        true,
      );
    }
  });

  it("adds a soft campus note on the O-I Glass SKU", () => {
    const oi = listerDaily20260907Products.find((p) => p.supplierId === "oi-glass");
    expect(oi).toBeTruthy();
    expect(oi?.description).toMatch(/plant campus/i);
    expect(String(oi?.specifications?.["Campus still"] ?? "")).toMatch(/soft-OK/i);
  });

  it("surfaces the 9 SKUs on the public products overlay", async () => {
    const page = await getPublicProductsPage({ page: 1, pageSize: 50, search: "JFE Steel Line" });
    expect(
      page.items.some((i) => i.id.startsWith("lister-b7-jfe-steel-")),
    ).toBe(true);
    const oi = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "O-I Glass Food",
    });
    expect(oi.items.some((i) => i.id.startsWith("lister-b7-oi-glass-"))).toBe(true);
    const interpipe = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "Interpipe Seamless",
    });
    expect(
      interpipe.items.some((i) => i.id.startsWith("lister-b7-interpipe-")),
    ).toBe(true);
  });

  it("uses lister-b7 ids and keeps every SKU RFQ with null prices", () => {
    for (const p of listerDaily20260907Products) {
      expect(isListerProductId(p.id)).toBe(true);
      expect(p.id.startsWith("lister-b7-")).toBe(true);
      expect(p.supplierId).toBeTruthy();
      expect(p.basePrice).toBeNull();
      expect(p.priceSourceType).toBe("rfq");
      expect(hasSourcedPrice(p.basePrice)).toBe(false);
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
      expect(String(p.specifications?.["Price note"] ?? "")).toMatch(/RFQ/i);
      expect(String(p.specifications?.["Price note"] ?? "").toLowerCase()).not.toMatch(
        /\blisted fob\b/,
      );
    }
    const raw = (rawDaily as { products: { unit_price: number | null }[] }).products;
    expect(raw).toHaveLength(9);
    expect(raw.every((p) => p.unit_price == null)).toBe(true);
    expect(isDaily20260907QaHeld("jfe-steel", "anything")).toBe(false);
  });

  it("uses on-disk local JPGs only (no remotes, no stock, no AI badges)", () => {
    for (const p of listerDaily20260907Products) {
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
    const byName = new Map(listerDaily20260907PublicProducts().map((p) => [p.name, p]));
    expect(byName.get("JFE Steel Line Pipe and Structural Steel Pipe")?.images).toEqual(
      expect.arrayContaining([
        "/images/products/jfe-steel/jfe-line-pipe.jpg",
        "/images/products/jfe-steel/jfe-structural-pipe.jpg",
      ]),
    );
    expect(
      byName.get("O-I Glass Food and Beverage Glass Containers")?.images,
    ).toEqual(
      expect.arrayContaining([
        "/images/products/oi-glass/oi-glass-containers.jpg",
        "/images/products/oi-glass/oi-beverage-glass.jpg",
      ]),
    );
  });

  it("maps workspace local_images onto the flat public products folder", () => {
    expect(
      publicPathFromDailyLocalImage(
        "/workspace/suppliers-phase1/daily/2026-09-07/images/products/jfe-steel/jfe-line-pipe.jpg",
      ),
    ).toBe("/images/products/jfe-steel/jfe-line-pipe.jpg");
  });
});
