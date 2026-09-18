import { describe, expect, it } from "vitest";
import {
  imageFitsProduct,
  imageObjectClass,
  isBrandToken,
  productObjectClass,
} from "@/lib/product-image-fit";

describe("productObjectClass / imageObjectClass", () => {
  it("classifies ball valves and bearings separately from Ball Corp cans", () => {
    expect(productObjectClass("Neway Ball Valves", "Industrial Parts")).toBe("ball_valve");
    expect(productObjectClass("ZWZ Deep Groove Ball Bearings", "Industrial Parts")).toBe(
      "bearing",
    );
    expect(productObjectClass("Ball Aluminum Aerosol Cans", "Packaging")).toBe("aerosol_can");
    expect(imageObjectClass("/images/products/ball/aerosol-cans.jpg")).toBe("aerosol_can");
    expect(imageObjectClass("/images/products/industrial/neway-valve/ball-valves.jpg")).toBe(
      "ball_valve",
    );
  });

  it("treats the Ball Corporation folder name as a brand token", () => {
    expect(isBrandToken("ball")).toBe(true);
    expect(isBrandToken("neway")).toBe(true);
  });
});

describe("imageFitsProduct", () => {
  it("rejects aerosol stills on valve and bearing SKUs", () => {
    const aerosol = "/images/products/ball/aerosol-cans.jpg";
    expect(imageFitsProduct(aerosol, "Neway Ball Valves", "Industrial Parts")).toBe(false);
    expect(
      imageFitsProduct(aerosol, "ZWZ Deep Groove Ball Bearings", "Industrial Parts"),
    ).toBe(false);
  });

  it("allows a mill's own valve photo on that mill's valve SKU", () => {
    expect(
      imageFitsProduct(
        "/images/products/industrial/neway-valve/ball-valves.jpg",
        "Neway Ball Valves",
        "Industrial Parts",
      ),
    ).toBe(true);
  });
});
