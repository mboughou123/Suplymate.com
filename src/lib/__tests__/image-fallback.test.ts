import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyImageUrl,
  GENERIC_PRODUCT_PLACEHOLDER,
  getBestProductImage,
  getRealProductImage,
  hasRealProductImage,
  isGoogleMapsImageUrl,
  isIllustrativeImageUrl,
  isLocalStillUrl,
  isRealImageUrl,
  pickPreferredCardImage,
  resolveProductImage,
  supplierHasUsableCardImage,
} from "@/lib/image-fallback";
import { pickHomeProducts } from "@/lib/home-products";
import {
  imageFitsProduct,
  imageObjectClass,
  productObjectClass,
} from "@/lib/product-image-fit";
import {
  comparePublicProductCards,
  type PublicProductCard,
} from "@/lib/public-products";
import type { Product } from "@/data/products";

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

  it("does not use a category SVG when only Maps URLs exist", () => {
    expect(
      getBestProductImage({
        images: [MAPS_LH3],
        supplierImages: [MAPS_STREETVIEW],
        productName: "Hot-rolled coil",
        category: "Steel & Metals",
      }),
    ).toBe(GENERIC_PRODUCT_PLACEHOLDER);
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

  it("does not use a category SVG when only a third-party hotlink exists", () => {
    const hotlink = "https://s7d1.scene7.com/is/image/RockwellAutomation/foo";
    expect(
      getBestProductImage({
        images: [hotlink],
        slug: "no-such-product-slug-xyz",
        productName: "Mystery gasket",
        category: "Industrial Parts",
      }),
    ).toBe(GENERIC_PRODUCT_PLACEHOLDER);
    expect(
      getRealProductImage({
        images: [hotlink],
        slug: "no-such-product-slug-xyz",
      }),
    ).toBeUndefined();
  });
});

describe("classifyImageUrl", () => {
  it("treats local pack rasters as real photos", () => {
    expect(classifyImageUrl("/images/products/cables/foliflex-cables/al-2p5-500.jpg")).toBe(
      "real"
    );
    expect(classifyImageUrl("/images/suppliers/logos/logo-caicheng.png")).toBe("real");
    expect(isRealImageUrl("/images/products/steel-coils/hadeed-coil.webp")).toBe(true);
  });

  it("treats remote http(s) as real unless it is a Maps or dummy host", () => {
    expect(isRealImageUrl("https://www.arcelormittal.com/media/plant.jpg")).toBe(true);
    expect(isRealImageUrl(BLOB)).toBe(true);
    expect(isRealImageUrl(MAPS_LH3)).toBe(false);
  });

  it("rejects dummy slider assets even when they are remote rasters", () => {
    expect(
      classifyImageUrl(
        "https://cableshouse-me.com/modules/revsliderprestashop/public/assets/assets/dummy.png"
      )
    ).toBe("none");
  });

  it("treats generated rasters as illustrative, not real", () => {
    expect(classifyImageUrl("/images/generated/steel-ball.jpg")).toBe("illustrative");
    expect(isIllustrativeImageUrl("/images/generated/steel-ball.jpg")).toBe(true);
    expect(isRealImageUrl("/images/generated/steel-ball.jpg")).toBe(false);
  });

  it("rejects category SVGs and placeholders as photos", () => {
    expect(classifyImageUrl("/images/products/steel.svg")).toBe("category");
    expect(classifyImageUrl("/images/products/electrical.svg")).toBe("category");
    expect(classifyImageUrl("/images/placeholder-product.svg")).toBe("category");
    expect(isRealImageUrl("/images/products/steel.svg")).toBe(false);
  });
});

describe("object-class agreement", () => {
  it("does not let Acrylic Ball inherit a spray-can still", () => {
    expect(productObjectClass("Acrylic Ball", "Industrial Parts")).toBe("precision_ball");
    expect(imageObjectClass("/images/products/ball/aerosol-cans.jpg")).toBe("aerosol_can");
    expect(
      imageFitsProduct(
        "/images/products/ball/aerosol-cans.jpg",
        "Acrylic Ball",
        "Industrial Parts"
      )
    ).toBe(false);
    expect(
      resolveProductImage({
        images: ["/images/products/ball/aerosol-cans.jpg"],
        productName: "Nylon Ball",
        category: "Industrial Parts",
      }).kind
    ).toBe("none");
  });

  it("does not let Nexans cable SKUs inherit a spray-gun still", () => {
    expect(productObjectClass("Nexans Transmission", "Cables & Electrical")).toBe("cable");
    expect(imageObjectClass("/images/products/industrial/spray-gun.jpg")).toBe("spray_gun");
    expect(
      imageFitsProduct(
        "/images/products/industrial/spray-gun.jpg",
        "Nexans Buildings",
        "Cables & Electrical"
      )
    ).toBe(false);
    expect(
      getRealProductImage({
        images: ["/images/products/industrial/spray-gun.jpg"],
        productName: "Nexans Distribution",
        category: "Cables & Electrical",
      })
    ).toBeUndefined();
  });

  it("keeps Ball Corporation aerosol cans on the aerosol photo", () => {
    expect(
      imageFitsProduct(
        "/images/products/ball/aerosol-cans.jpg",
        "Ball Aluminum Aerosol Cans",
        "Packaging"
      )
    ).toBe(true);
  });

  it("accepts a mill pipe still for a steel-grade pipe SKU", () => {
    expect(
      imageFitsProduct(
        "/images/products/arabian-pipes/mill-slide-3.jpg",
        "100cr6 Seamless Steel Pipes",
        "Tubes & Pipes"
      )
    ).toBe(true);
  });

  it("does not use a category SVG as the catalogue hero", () => {
    const resolved = resolveProductImage({
      images: ["/images/products/steel.svg"],
      productName: "16MnCr5",
      category: "Steel & Metals",
    });
    expect(resolved.kind).toBe("none");
    expect(hasRealProductImage({
      images: ["/images/products/electrical.svg"],
      productName: "10GXE0202",
      category: "Cables & Electrical",
    })).toBe(false);
    expect(
      getBestProductImage({
        images: ["/images/products/steel.svg"],
        productName: "17-4 PH",
        category: "Steel & Metals",
      })
    ).toBe("/images/placeholder-product.svg");
  });
});

function product(partial: Partial<Product> & Pick<Product, "id" | "name">): Product {
  return {
    category: "Steel & Metals",
    priceMin: 1,
    priceMax: 2,
    currency: "USD",
    bestDeliveryDays: 10,
    supplierCount: 1,
    unit: "ton",
    status: "approved",
    ...partial,
  };
}

describe("pickHomeProducts", () => {
  it("hides spray-can and spray-gun mismatches and prefers pack stills", () => {
    const items = pickHomeProducts([
      product({
        id: "acrylic-ball",
        name: "Acrylic Ball",
        category: "Industrial Parts",
        supplierName: "ALL METAL INDIA PVT. LTD",
        images: ["/images/products/ball/aerosol-cans.jpg"],
      }),
      product({
        id: "nexans-tx",
        name: "Nexans Transmission",
        category: "Cables & Electrical",
        supplierName: "Nexans S.A.",
        images: ["/images/products/industrial/spray-gun.jpg"],
      }),
      product({
        id: "nexans-tx-banner",
        name: "Transmission",
        category: "Cables & Electrical",
        supplierName: "Nexans",
        images: ["https://www.nexans.com/app/uploads/2024/01/banner-power-usage.jpg"],
      }),
      product({
        id: "foliflex",
        name: "Foliflex Housing Wire",
        category: "Cables & Electrical",
        supplierName: "Foliflex Cables",
        images: ["/images/products/cables/foliflex-cables/housing-wire-gold.jpg"],
      }),
      product({
        id: "grade-only",
        name: "440C",
        category: "Steel & Metals",
        supplierName: "ALL METAL INDIA PVT. LTD",
        images: ["/images/products/steel.svg"],
      }),
    ]);

    expect(items.map((i) => i.id)).toEqual(["foliflex"]);
    expect(items[0].image).toContain("foliflex-cables");
  });
});

function card(
  partial: Pick<PublicProductCard, "id" | "name" | "imageKind">
): PublicProductCard {
  return {
    category: "Steel & Metals",
    supplierId: "",
    supplierName: "Test",
    supplierCountry: null,
    supplierVisible: false,
    verified: false,
    imageUrl: "",
    hasRealPhoto: partial.imageKind === "real",
    priceLabel: null,
    priceUnit: null,
    moq: null,
    shippingTime: null,
    productUrl: null,
    ...partial,
  };
}

describe("catalogue photo ranking", () => {
  it("sorts real photos ahead of illustrative, then the rest", () => {
    const items = [
      card({ id: "none", name: "440C", imageKind: "none" }),
      card({ id: "real", name: "Foliflex Cable", imageKind: "real" }),
      card({ id: "illus", name: "Steel Ball", imageKind: "illustrative" }),
    ].sort(comparePublicProductCards);
    expect(items.map((i) => i.id)).toEqual(["real", "illus", "none"]);
  });
});
