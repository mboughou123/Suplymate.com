import { describe, expect, it } from "vitest";
import { approvedPackProducts } from "@/data/pack-catalog";
import {
  HOME_PRODUCTS_PER_CATEGORY,
  HOME_PRODUCTS_VISIBLE,
  homeProductSectors,
  pickHomeProducts,
} from "@/lib/home-products";

describe("homepage sector chips", () => {
  const items = pickHomeProducts(approvedPackProducts());

  it("offers Machinery, Hardware Components and Biomedical chips", () => {
    expect(homeProductSectors(items).map((s) => s.id)).toEqual(["machinery", "hardware-components", "biomedical"]);
  });

  it("tops each sector up without changing the unfiltered grid", () => {
    const base = pickHomeProducts(approvedPackProducts()).slice(0, HOME_PRODUCTS_VISIBLE);
    expect(items.slice(0, HOME_PRODUCTS_VISIBLE)).toEqual(base);
    for (const sector of homeProductSectors(items)) {
      const count = items.filter((i) => i.sectors.includes(sector.id)).length;
      expect(count).toBeGreaterThanOrEqual(Math.min(3, HOME_PRODUCTS_PER_CATEGORY));
    }
  });

  it("tags products by name and supplier, not by catalogue category", () => {
    const vials = items.find((i) => /vials/i.test(i.name));
    expect(vials?.category).toBe("Packaging");
    expect(vials?.sectors).toContain("biomedical");
    const pump = items.find((i) => /centrifugal pump/i.test(i.name));
    expect(pump?.sectors).toContain("machinery");
    const bearing = items.find((i) => /bearing/i.test(i.name));
    expect(bearing?.sectors).toContain("hardware-components");
    // Cables have their own chip; they must not flood Hardware components.
    const cable = items.find((i) => /power cable/i.test(i.name));
    expect(cable?.sectors).not.toContain("hardware-components");
  });
});
