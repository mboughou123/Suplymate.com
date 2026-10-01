import { describe, expect, it } from "vitest";
import { localStillsForProduct } from "@/lib/product-stills";

describe("localStillsForProduct", () => {
  it("does not map acrylic balls, ball valves, or bearings onto Ball Corporation aerosol stills", () => {
    const acrylic = localStillsForProduct({
      id: "all-metal-india-acrylic-ball",
      slug: "acrylic-ball",
      supplierId: "all-metal-india-pvt-ltd-pune",
    });
    expect(acrylic.some((u) => u.includes("/images/products/ball/"))).toBe(false);

    const stolen = localStillsForProduct({
      id: "pack-neway-valve-neway-ball-valves",
      slug: "neway-ball-valves",
    });
    expect(stolen.some((u) => u.includes("/images/products/ball/"))).toBe(false);

    const bearings = localStillsForProduct({
      id: "pack-wafangdian-bearing-zwz-deep-groove-ball-bearings",
      slug: "zwz-deep-groove-ball-bearings",
      supplierId: "wafangdian-bearing-group-corp-ltd-cn",
    });
    expect(bearings.some((u) => u.includes("/images/products/ball/"))).toBe(false);
    expect(bearings.some((u) => u.includes("/images/products/industrial/wafangdian-bearing/"))).toBe(
      true,
    );
  });

  it("still resolves a Ball Corporation slug to the ball folder", () => {
    const urls = localStillsForProduct({ id: "ball", slug: "ball-aluminum-aerosol-cans" });
    expect(urls.some((u) => u.startsWith("/images/products/ball/"))).toBe(true);
  });
});
