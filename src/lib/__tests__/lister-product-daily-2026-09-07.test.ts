import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DAILY_20260907_HOLD_MILL_PRODUCT_OK_SLUGS,
  DAILY_20260907_HOLD_PRODUCT_FAIL_SLUGS,
  DAILY_20260907_HOLD_PRODUCT_WIRE_SLUGS,
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
import type { ProductCategory } from "@/data/products";
import rawDaily from "../../../data/daily-2026-09-07-products.json";
import rawHoldSeal from "../../../data/daily-2026-09-07-researcher-hold-products-seal.json";

const CATEGORY_ALIASES: Record<string, ProductCategory> = {
  "Steel & Metals": "Steel & Metals",
  "Tubes & Pipes": "Tubes & Pipes",
  "Tube & Pipes": "Tubes & Pipes",
  "Cables & Electrical": "Cables & Electrical",
  Construction: "Construction",
  "Industrial Parts": "Industrial Parts",
  "Hardware & Motion": "Industrial Parts",
  Packaging: "Packaging",
};

const PREFERRED_9 = [
  "jfe-steel",
  "interpipe",
  "corinth-pipeworks",
  "mueller-industries",
  "saudi-steel-pipe",
  "oi-glass",
  "sandvik",
  "ingersoll-rand",
  "sick",
] as const;

const WIRED_MILL_WITH_PRODUCTS = [
  "jfe-steel",
  "sick",
  "ingersoll-rand",
  "sandvik",
  "oi-glass",
  "saudi-steel-pipe",
  "corinth-pipeworks",
  "mueller-industries",
  "stupp",
  "interpipe",
] as const;

function expectedCategoryCounts(): Record<ProductCategory, number> {
  const counts: Record<string, number> = {};
  for (const sku of (rawDaily as { products: { category?: string }[] }).products) {
    const cat = CATEGORY_ALIASES[sku.category?.trim() ?? ""];
    if (!cat) continue;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts as Record<ProductCategory, number>;
}

describe("Lister daily expansion 2026-09-07 (Preferred-9 + HOLD-27)", () => {
  it("loads exactly 36 RFQ SKUs — all approved, none held", () => {
    expect(listerDaily20260907Count()).toBe(36);
    expect(listerDaily20260907PublicCount()).toBe(36);
    expect(listerDaily20260907HeldCount()).toBe(0);
    expect(listerDaily20260907HeldProducts()).toHaveLength(0);
    expect(listerDaily20260907Products.every((p) => p.status === "approved")).toBe(
      true,
    );
    expect((rawDaily as { products: unknown[] }).products).toHaveLength(36);

    const expected = expectedCategoryCounts();
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Tubes & Pipes"),
    ).toHaveLength(expected["Tubes & Pipes"]);
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Packaging"),
    ).toHaveLength(expected.Packaging);
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Industrial Parts"),
    ).toHaveLength(expected["Industrial Parts"]);
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Steel & Metals"),
    ).toHaveLength(expected["Steel & Metals"]);
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Cables & Electrical"),
    ).toHaveLength(expected["Cables & Electrical"]);
    expect(
      listerDaily20260907Products.filter((p) => p.category === "Construction"),
    ).toHaveLength(expected.Construction);
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

  it("wires all 27 HOLD OK+SOFT slugs and keeps the fail list empty", () => {
    expect(DAILY_20260907_HOLD_PRODUCT_FAIL_SLUGS).toEqual([]);
    expect(DAILY_20260907_HOLD_PRODUCT_WIRE_SLUGS).toHaveLength(27);
    expect((rawHoldSeal as { hold: string[] }).hold).toEqual([]);
    expect((rawHoldSeal as { wireable_slugs: string[] }).wireable_slugs).toEqual(
      [...DAILY_20260907_HOLD_PRODUCT_WIRE_SLUGS],
    );

    const bySupplier = new Map(
      listerDaily20260907Products.map((p) => [p.supplierId, p]),
    );
    for (const slug of DAILY_20260907_HOLD_PRODUCT_WIRE_SLUGS) {
      const id = daily20260907ProductSupplierId(slug);
      const sku = bySupplier.get(id) ?? listerDaily20260907ForSupplier(id)[0];
      expect(sku, slug).toBeTruthy();
      expect(sku.status, slug).toBe("approved");
    }

    for (const slug of PREFERRED_9) {
      const id = daily20260907ProductSupplierId(slug);
      expect(listerDaily20260907ForSupplier(id).length, slug).toBe(1);
    }
  });

  it("attaches Stupp + Interpipe product SKUs to their mill cards", () => {
    const millIds = new Set(daily20260907Suppliers.map((s) => s.id));
    expect(DAILY_20260907_HOLD_MILL_PRODUCT_OK_SLUGS).toEqual([]);
    expect(DAILY_20260907_HOLD_SLUGS).toEqual([]);
    for (const slug of ["interpipe", "stupp"] as const) {
      expect(millIds.has(slug), slug).toBe(true);
      expect(daily20260907ProductSupplierId(slug)).toBe(slug);
      expect(daily20260907ProductSupplierId(slug)).toBe(
        dailySupplierIdForSlug20260907(slug),
      );
      const skus = listerDaily20260907ForSupplier(slug);
      expect(skus, slug).toHaveLength(1);
      expect(skus[0].status).toBe("approved");
      expect(skus[0].supplierId).toBe(slug);
      expect(listerProductsForSupplier(slug).some((p) => p.id.startsWith("lister-b7-"))).toBe(
        true,
      );
    }
  });

  it("attaches wired-mill SKUs (incl. cleared Saudi/Corinth/Mueller) to directory ids", () => {
    const millIds = new Set(daily20260907Suppliers.map((s) => s.id));
    for (const slug of WIRED_MILL_WITH_PRODUCTS) {
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

  it("keeps webco and sika approved (SOFT, not held) and notes O-I campus", () => {
    const webco = listerDaily20260907ForSupplier(
      daily20260907ProductSupplierId("webco"),
    )[0];
    const sika = listerDaily20260907ForSupplier(
      daily20260907ProductSupplierId("sika"),
    )[0];
    expect(webco?.status).toBe("approved");
    expect(sika?.status).toBe("approved");

    const oi = listerDaily20260907Products.find((p) => p.supplierId === "oi-glass");
    expect(oi).toBeTruthy();
    expect(oi?.description).toMatch(/plant campus/i);
    expect(String(oi?.specifications?.["Campus still"] ?? "")).toMatch(/soft-OK/i);
  });

  it("keeps SIG as SlimlineBloc / COMBIBLOC — not Tetra Pak", () => {
    const sig = listerDaily20260907ForSupplier(
      daily20260907ProductSupplierId("sig-group"),
    )[0];
    expect(sig).toBeTruthy();
    const blob = `${sig.name} ${sig.description} ${JSON.stringify(sig.specifications)}`;
    expect(blob.toLowerCase()).not.toMatch(/tetra\s*pak/);
    const rawSig = (rawDaily as { products: { supplier_slug_guess: string; product_name: string; price_note: string | null }[] }).products.find(
      (p) => p.supplier_slug_guess === "sig-group",
    );
    const rawBlob = `${rawSig?.product_name ?? ""} ${rawSig?.price_note ?? ""}`;
    if (/slimlinebloc|combibloc/i.test(rawBlob)) {
      expect(blob).toMatch(/SlimlineBloc|COMBIBLOC/i);
    }
    expect((rawHoldSeal as { sig_check: string }).sig_check).toMatch(/PASS/i);
    expect((rawHoldSeal as { sig_check: string }).sig_check).toMatch(/SlimlineBloc|COMBIBLOC/i);
  });

  it("surfaces Preferred-9 and HOLD SKUs on the public products overlay", async () => {
    const jfe = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "JFE Steel Line",
    });
    expect(jfe.items.some((i) => i.id.startsWith("lister-b7-jfe-steel-"))).toBe(true);
    const stupp = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "Stupp DSAW",
    });
    expect(stupp.items.some((i) => i.id.startsWith("lister-b7-stupp-"))).toBe(true);
    const interpipe = await getPublicProductsPage({
      page: 1,
      pageSize: 50,
      search: "Interpipe Seamless",
    });
    expect(interpipe.items.some((i) => i.id.startsWith("lister-b7-interpipe-"))).toBe(
      true,
    );
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
    expect(raw).toHaveLength(36);
    expect(raw.every((p) => p.unit_price == null)).toBe(true);
    expect(isDaily20260907QaHeld("jfe-steel", "anything")).toBe(false);
    expect(isDaily20260907QaHeld("stupp", "anything")).toBe(false);
  });

  it("uses on-disk local JPGs only (no remotes, no stock, no AI badges)", () => {
    const rawBySlug = new Map(
      (rawDaily as { products: { supplier_slug_guess: string }[] }).products.map(
        (p) => [p.supplier_slug_guess, p],
      ),
    );
    for (const p of listerDaily20260907Products) {
      expect(p.images.length, p.name).toBeGreaterThan(0);
      expect(p.aiGeneratedImage).toBe(false);
      expect(scrapedToProduct(p).aiGeneratedImage).toBeFalsy();
      const guess =
        [...rawBySlug.keys()].find((slug) => p.id.includes(`lister-b7-${slug}-`)) ??
        p.supplierId;
      const dir = join(process.cwd(), "public", "images", "products", guess);
      expect(existsSync(dir), dir).toBe(true);
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
    expect(byName.get("Stupp DSAW / Spiral-Weld Oil & Gas Line Pipe")?.images.length).toBeGreaterThan(
      0,
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
