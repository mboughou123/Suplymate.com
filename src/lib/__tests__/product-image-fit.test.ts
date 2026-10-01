import { describe, expect, it } from "vitest";
import { packProducts } from "@/data/pack-catalog";
import { getRealProductImage } from "@/lib/image-fallback";
import {
  imageFitsProduct,
  imageObjectClass,
  productObjectClass,
} from "@/lib/product-image-fit";
import { getHomePageContent } from "@/lib/home-page-data";

describe("product photos agree with the SKU", () => {
  it("classifies Ball Corp cans separately from precision balls and valves", () => {
    expect(productObjectClass("Acrylic Ball", "Steel & Metals")).toBe("precision_ball");
    expect(productObjectClass("Neway Ball Valves", "Industrial Parts")).toBe("ball_valve");
    expect(productObjectClass("Ball Aluminum Aerosol Cans", "Packaging")).toBe("aerosol_can");
    expect(imageObjectClass("/images/products/ball/aerosol-cans.jpg")).toBe("aerosol_can");
  });

  it("rejects the spray-can still on an acrylic ball even when it is stored on the row", () => {
    const spray = "/images/products/ball/aerosol-cans.jpg";
    expect(imageFitsProduct(spray, "Acrylic Ball", "Steel & Metals")).toBe(false);
    expect(
      getRealProductImage({
        id: "all-metal-india-acrylic-ball",
        slug: "acrylic-ball",
        supplierId: "all-metal-india-pvt-ltd-pune",
        productName: "Acrylic Ball",
        category: "Steel & Metals",
        images: [spray],
      }),
    ).toBeUndefined();
  });

  it("keeps a mill's own valve photo and drops the stolen aerosol still", () => {
    expect(
      getRealProductImage({
        id: "pack-neway-valve-neway-ball-valves",
        slug: "neway-ball-valves",
        productName: "Neway Ball Valves",
        category: "Industrial Parts",
        images: ["/images/products/industrial/neway-valve/ball-valves.jpg"],
      }),
    ).toBe("/images/products/industrial/neway-valve/ball-valves.jpg");
  });

  it("never assigns an aerosol, spray-gun, or other-mill still on the homepage grid", () => {
    const home = getHomePageContent();
    expect(home.products.length).toBeGreaterThanOrEqual(12);
    expect(home.products[0]?.name).toMatch(/hot rolled coils/i);
    expect(home.products[0]?.image).toBe("/images/products/tata-steel/steelium-24.jpg");
    expect(home.products[0]?.image).not.toMatch(/inside-|aerosol|spray/);
    for (const item of home.products) {
      expect(imageFitsProduct(item.image, item.name, item.category), item.name).toBe(true);
      if (!/aerosol|spray/i.test(item.name)) {
        expect(item.image, item.name).not.toMatch(/aerosol|spray-gun|graco-spray/);
      }
    }
  });

  it("keeps every pack product photo on the object it names", () => {
    for (const product of packProducts) {
      const url = getRealProductImage({
        images: product.images,
        id: product.id,
        slug: product.slug,
        supplierId: product.supplierId,
        productName: product.name,
        category: product.category,
      });
      if (!url) continue;
      expect(imageFitsProduct(url, product.name, product.category), `${product.name} → ${url}`).toBe(
        true,
      );
      expect(url.startsWith("/images/products/"), product.name).toBe(true);
    }
  });
});
