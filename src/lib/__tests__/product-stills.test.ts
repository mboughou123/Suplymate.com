import { describe, expect, it } from "vitest";
import { localStillsForProduct } from "@/lib/product-stills";

describe("localStillsForProduct", () => {
  it("does not map ball-valve / bearing slugs onto Ball Corporation aerosol stills", () => {
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
  });

  it("still resolves a Ball Corporation slug to the ball folder", () => {
    const urls = localStillsForProduct({ id: "ball", slug: "ball-aluminum-aerosol-cans" });
    expect(urls.some((u) => u.startsWith("/images/products/ball/"))).toBe(true);
  });
});
