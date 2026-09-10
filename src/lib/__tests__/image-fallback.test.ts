import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getBestProductImage,
  getProductFallbackImage,
  getRealProductImage,
  isGoogleMapsImageUrl,
  isLocalStillUrl,
  isRealImageUrl,
  pickPreferredCardImage,
  supplierHasUsableCardImage,
} from "@/lib/image-fallback";

const MAPS_LH3 =
  "https://lh3.googleusercontent.com/gps-cs-s/APNQkAGe4FB1KEoUkEXe2bH0-Be16nU3IdB9TT-M2DZ-T9Rv4e_B38K7Dyo0vzBbC08RA1j6U2DsiuNCSeeRx8LEcQ211Jw8WWJEmn-DEWaEfr_2MzehtpvE8SuMoP0Wh_BdPI3okrQkTQ=w800-h500-k-no";
const MAPS_STREETVIEW =
  "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=abc&w=800";
const LOCAL_MILL = "/images/suppliers/arcelormittal/arcelormittal_01.jpg";
const LOCAL_PRODUCT = "/images/products/steel-coil/steel-coil_01.jpg";
const BLOB =
  "https://abc123.public.blob.vercel-storage.com/mills/photo.jpg";
const MILL_SITE = "https://www.arcelormittal.com/media/plant.jpg";

describe("isGoogleMapsImageUrl", () => {
  it("flags googleusercontent, Street View, and Maps hosts", () => {
    expect(isGoogleMapsImageUrl(MAPS_LH3)).toBe(true);
    expect(isGoogleMapsImageUrl(MAPS_STREETVIEW)).toBe(true);
    expect(isGoogleMapsImageUrl("https://maps.gstatic.com/mapfiles/place.png")).toBe(
      true,
    );
    expect(isGoogleMapsImageUrl("https://lh5.googleusercontent.com/photo.jpg")).toBe(
      true,
    );
  });

  it("leaves Blob, mill sites, and local stills alone", () => {
    expect(isGoogleMapsImageUrl(BLOB)).toBe(false);
    expect(isGoogleMapsImageUrl(MILL_SITE)).toBe(false);
    expect(isGoogleMapsImageUrl(LOCAL_MILL)).toBe(false);
  });
});

describe("isRealImageUrl / isLocalStillUrl", () => {
  it("treats Maps URLs as not real card photos", () => {
    expect(isRealImageUrl(MAPS_LH3)).toBe(false);
    expect(isRealImageUrl(MAPS_STREETVIEW)).toBe(false);
  });

  it("accepts local mill and product rasters", () => {
    expect(isLocalStillUrl(LOCAL_MILL)).toBe(true);
    expect(isLocalStillUrl(LOCAL_PRODUCT)).toBe(true);
    expect(isRealImageUrl(LOCAL_MILL)).toBe(true);
    expect(isRealImageUrl(LOCAL_PRODUCT)).toBe(true);
    expect(isRealImageUrl("/images/products/x/y.jpg")).toBe(true);
  });

  it("rejects branded SVG tiles as real photos", () => {
    expect(isRealImageUrl("/images/products/steel.svg")).toBe(false);
    expect(isLocalStillUrl("/images/products/steel.svg")).toBe(false);
  });
});

describe("pickPreferredCardImage", () => {
  it("prefers a local mill still over a Maps URL listed first", () => {
    expect(pickPreferredCardImage([MAPS_LH3, LOCAL_MILL])).toBe(LOCAL_MILL);
  });

  it("prefers a local product still over a third-party hotlink", () => {
    expect(pickPreferredCardImage([MILL_SITE, LOCAL_PRODUCT])).toBe(LOCAL_PRODUCT);
  });

  it("returns undefined when only Maps URLs exist", () => {
    expect(pickPreferredCardImage([MAPS_LH3, MAPS_STREETVIEW])).toBeUndefined();
  });

  it("falls back to Blob or mill-site remotes when no local still exists", () => {
    expect(pickPreferredCardImage([MAPS_LH3, BLOB])).toBe(BLOB);
    expect(pickPreferredCardImage([MILL_SITE])).toBe(MILL_SITE);
  });
});

describe("supplierHasUsableCardImage", () => {
  it("is false for Maps-only supplier records", () => {
    expect(
      supplierHasUsableCardImage({
        imageUrl: MAPS_LH3,
        supplierImages: [MAPS_STREETVIEW],
      }),
    ).toBe(false);
  });

  it("is true when a local still is present alongside Maps URLs", () => {
    expect(
      supplierHasUsableCardImage({
        imageUrl: MAPS_LH3,
        supplierImages: [LOCAL_MILL],
      }),
    ).toBe(true);
  });
});

describe("getBestProductImage / getRealProductImage", () => {
  it("uses the local product still instead of Maps or hotlinks", () => {
    expect(
      getRealProductImage({
        images: [MAPS_LH3, LOCAL_PRODUCT],
        supplierImages: [MILL_SITE],
        productName: "Hot-rolled coil",
        category: "Steel & Metals",
      }),
    ).toBe(LOCAL_PRODUCT);
  });

  it("uses a branded category fallback when only Maps URLs exist", () => {
    const fallback = getProductFallbackImage("Hot-rolled coil", "Steel & Metals");
    expect(
      getBestProductImage({
        images: [MAPS_LH3],
        supplierImages: [MAPS_STREETVIEW],
        productName: "Hot-rolled coil",
        category: "Steel & Metals",
      }),
    ).toBe(fallback);
    expect(fallback).toMatch(/^\/images\/products\/.+\.svg$/);
    expect(
      getRealProductImage({
        images: [MAPS_LH3],
        supplierImages: [MAPS_STREETVIEW],
      }),
    ).toBeUndefined();
  });

  it("product cards prefer committed local stills over third-party hosts", () => {
    const hotlink = "https://www.allmetalindia.in/images/coil.jpg";
    const resolved = getBestProductImage({
      images: [hotlink],
      slug: "alpla",
      productName: "Alpla closures",
      category: "Packaging",
    });
    expect(resolved).toMatch(/^\/images\/products\/alpla\/.+\.(jpe?g|png|webp)$/i);
    expect(resolved).not.toContain("allmetalindia");
    expect(existsSync(resolve("public", resolved.replace(/^\//, "")))).toBe(true);
    const rockwool = getRealProductImage({
      images: ["https://cableshouse-me.com/cdn/cable.jpg"],
      supplierId: "rockwool-intl",
      productName: "Stone wool board",
      category: "Construction",
    });
    expect(rockwool).toMatch(/^\/images\/products\/rockwool\/.+\.(jpe?g|png|webp)$/i);
    expect(existsSync(resolve("public", (rockwool ?? "").replace(/^\//, "")))).toBe(true);
  });

  it("uses a branded category fallback when only a third-party hotlink exists", () => {
    const hotlink = "https://s7d1.scene7.com/is/image/RockwellAutomation/foo";
    const fallback = getProductFallbackImage("Mystery gasket", "Industrial Parts");
    expect(
      getBestProductImage({
        images: [hotlink],
        slug: "no-such-product-slug-xyz",
        productName: "Mystery gasket",
        category: "Industrial Parts",
      }),
    ).toBe(fallback);
    expect(
      getRealProductImage({
        images: [hotlink],
        slug: "no-such-product-slug-xyz",
      }),
    ).toBeUndefined();
  });
});
