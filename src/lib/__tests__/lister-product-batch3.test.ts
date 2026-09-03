import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LISTER_B3_SUPPLIER_ID_BY_SLUG,
  listerBatch3Count,
  listerBatch3ForSupplier,
  listerBatch3Products,
} from "@/lib/lister-product-batch3";
import { hasSourcedPrice } from "@/lib/public-products";
import { priceSourceBadgeLabel } from "@/lib/price-source";
import { isRealImageUrl } from "@/lib/image-fallback";
import { publicPathFromEnhancedDst } from "@/lib/lister-media";
import enhancedManifest from "../../../data/product-media-batch3-enhanced-manifest.json";

describe("Lister product-media batch 3", () => {
  it("loads all steel + cable SKUs", () => {
    expect(listerBatch3Count()).toBe(34);
    expect(listerBatch3Products.filter((p) => p.category === "Steel & Metals")).toHaveLength(18);
    expect(listerBatch3Products.filter((p) => p.category === "Cables & Electrical")).toHaveLength(16);
  });

  it("maps every supplier_slug_guess to a phase-1 supplier id", () => {
    for (const p of listerBatch3Products) {
      expect(Object.values(LISTER_B3_SUPPLIER_ID_BY_SLUG)).toContain(p.supplierId);
    }
  });

  it("keeps null unit_price as RFQ", () => {
    const rfq = listerBatch3Products.filter((p) => !hasSourcedPrice(p.basePrice));
    const priced = listerBatch3Products.filter((p) => hasSourcedPrice(p.basePrice));
    expect(rfq).toHaveLength(21);
    expect(priced).toHaveLength(13);
    for (const p of rfq) {
      expect(p.basePrice).toBeNull();
      expect(priceSourceBadgeLabel(p.priceSourceType, false)).toBeNull();
    }
  });

  it("labels Ferrite as Listed price (public listing, not mill FOB)", () => {
    const angles = listerBatch3Products.find((p) => p.name === "Ferrite Equal / Mild Steel Angles");
    expect(angles?.basePrice).toBe(58);
    expect(angles?.priceSourceType).toBe("public_listing");
    expect(priceSourceBadgeLabel(angles?.priceSourceType, true)).toBe("Listed price");
    expect(priceSourceBadgeLabel(angles?.priceSourceType, true)?.toLowerCase()).not.toContain("fob");
    expect(priceSourceBadgeLabel(angles?.priceSourceType, true)?.toLowerCase()).not.toContain("marketplace");
  });

  it("keeps Hadeed SKUs as RFQ with official product stills first", () => {
    const hadeed = listerBatch3Products.filter(
      (p) => p.supplierId === "saudi-iron-and-steel-company-hadeed-sa"
    );
    expect(hadeed).toHaveLength(3);
    for (const p of hadeed) {
      expect(p.basePrice).toBeNull();
      const primary = p.images[0];
      expect(primary.startsWith("/images/products/steel/hadeed/")).toBe(true);
      expect(/midrex|plant/i.test(primary)).toBe(false);
      expect(p.specifications["Photo credit"]).toBe("Hadeed product still");
      expect(p.imageSourceUrl).toMatch(/hadeed\.com\.sa/i);
      expect(p.imageSourceUrl).not.toMatch(/rajhi|midrex/i);
    }
    const hrc = hadeed.find((p) => /HRC/i.test(p.name));
    expect(hrc?.images[0]).toBe("/images/products/steel/hadeed/hrc.jpg");
    expect(hrc?.images).toContain("/images/products/steel/hadeed/flat-cate.jpg");
    const rod = hadeed.find((p) => /Wire Rod/i.test(p.name));
    expect(rod?.images[0]).toBe("/images/products/steel/hadeed/wire-rod.jpg");
    const rebar = hadeed.find((p) => /Reinforcing Bars/i.test(p.name));
    expect(rebar?.images[0]).toBe("/images/products/steel/hadeed/rebar-straight.jpg");
    expect(rebar?.images).toContain("/images/products/steel/hadeed/rebar-in-coil.jpg");
  });

  it("prefers local enhanced JPGs over remote image_urls", () => {
    for (const p of listerBatch3Products) {
      expect(p.images.length).toBeGreaterThan(0);
      for (const url of p.images) {
        expect(url.toLowerCase()).not.toContain(".pdf");
        expect(/^https?:\/\//i.test(url), url).toBe(false);
        expect(url.startsWith("/images/products/"), `${p.name} → ${url}`).toBe(true);
        expect(isRealImageUrl(url)).toBe(true);
        const abs = join(process.cwd(), "public", url.replace(/^\//, ""));
        expect(existsSync(abs), url).toBe(true);
        expect(/\.(webp|png)$/i.test(url)).toBe(false);
      }
    }
  });

  it("uses sealed steel/cable JPGs except Hadeed midrex/plant extras", () => {
    const used = new Set(listerBatch3Products.flatMap((p) => p.images));
    const skip = /hadeed\/(midrex|plant|product-s3a|s3a|s3b)/i;
    for (const entry of enhancedManifest as { dst_rel?: string }[]) {
      const pub = publicPathFromEnhancedDst(entry.dst_rel ?? "");
      expect(pub, entry.dst_rel).toBeTruthy();
      if (skip.test(pub!)) continue;
      expect(used.has(pub!), pub).toBe(true);
    }
  });

  it("surfaces Foliflex / EMSTEEL / Yuhui under the right mills", () => {
    expect(listerBatch3ForSupplier("foliflex-wires-cables-delhi")).toHaveLength(4);
    expect(listerBatch3ForSupplier("emsteel-building-materials-pjsc-emsteel-ae")).toHaveLength(3);
    expect(listerBatch3ForSupplier("jiangsu-yuhui-cable-co-ltd-cn")).toHaveLength(3);
  });

  it("maps Foliflex / cable primaries to sealed local JPGs", () => {
    const byName = (name: string) => listerBatch3Products.find((p) => p.name === name);
    expect(byName("Foliflex 1.5 mm PVC Housing Wire (90 m coil)")?.images[0]).toBe(
      "/images/products/cables/foliflex-cables/fr-housing-500.jpg"
    );
    expect(byName("Foliflex 2.5 sq mm PVC Housing Wire (FRLS / 90 m)")?.images[0]).toBe(
      "/images/products/cables/foliflex-cables/copper-90m-500.jpg"
    );
    expect(byName("Foliflex 2.5 mm Aluminum Cable (90 m)")?.images[0]).toBe(
      "/images/products/cables/foliflex-cables/al-2p5-500.jpg"
    );
    expect(byName("Foliflex 3 Core Submersible Flat Cable")?.images[0]).toBe(
      "/images/products/cables/foliflex-cables/submersible-flat.jpg"
    );
  });

  it("labels priced steel/cable SKUs as Listed price, never mill FOB", () => {
    const priced = listerBatch3Products.filter((p) => hasSourcedPrice(p.basePrice));
    for (const p of priced) {
      expect(["public_listing", "listed_public", "listed_fob", "marketplace_listing"]).toContain(
        p.priceSourceType
      );
      const badge = priceSourceBadgeLabel(p.priceSourceType, true);
      expect(badge).toBeTruthy();
      if (p.priceSourceType === "listed_fob") {
        expect(badge).toBe("Listed FOB");
      } else if (p.priceSourceType === "marketplace_listing") {
        expect(badge).toBe("Marketplace listing");
        expect(badge?.toLowerCase()).not.toContain("fob");
      } else {
        expect(badge).toBe("Listed price");
        expect(badge?.toLowerCase()).not.toContain("fob");
        expect(badge?.toLowerCase()).not.toContain("marketplace");
      }
    }
  });

  it("never uses HTML product pages as card images", () => {
    for (const p of listerBatch3Products) {
      for (const url of p.images) {
        expect(url.endsWith("/")).toBe(false);
        expect(/ferrite\.in\/[a-z0-9-]+\/?$/i.test(url)).toBe(false);
      }
    }
  });

  it("maps batch-3 dest_rel stems onto /images/products/{steel|cables}/…", () => {
    expect(publicPathFromEnhancedDst("steel/hadeed/hrc.jpg")).toBe(
      "/images/products/steel/hadeed/hrc.jpg"
    );
    expect(publicPathFromEnhancedDst("cables/foliflex-cables/copper-90m-500.jpg")).toBe(
      "/images/products/cables/foliflex-cables/copper-90m-500.jpg"
    );
  });
});
