import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { packStats } from "@/data/pack-catalog";
import { getHomePageContent } from "@/lib/home-page-data";

describe("homepage content (no database)", () => {
  it("uses curated pack stats instead of loading the full supplier/product tables", () => {
    const home = getHomePageContent();
    expect(home.supplierCount).toBe(packStats.suppliers);
    expect(home.supplierCount).toBeGreaterThan(0);
    expect(home.industryCount).toBeGreaterThan(0);
    expect(home.materialCount).toBeGreaterThan(0);
    expect(home.countryCount).toBeGreaterThan(0);
  });

  it("picks photo-bearing products whose stills exist on disk", () => {
    const home = getHomePageContent();
    expect(home.products.length).toBeGreaterThanOrEqual(12);
    for (const p of home.products.slice(0, 12)) {
      expect(p.image.startsWith("/images/")).toBe(true);
      const abs = resolve(process.cwd(), "public", p.image.replace(/^\//, ""));
      expect(existsSync(abs), p.image).toBe(true);
    }
  });
});
