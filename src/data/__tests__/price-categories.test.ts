import { describe, expect, it } from "vitest";
import { PRICE_CATEGORIES, priceCategoriesFor } from "@/data/price-categories";
import { supplierCategories } from "@/data/suppliers";
import { KEYWORD_SECTORS } from "@/data/industries";
import { materials } from "@/data/materials";
import { isCatalogMaterial } from "@/data/material-catalog";

const seedIds = materials.map((m) => m.id);

describe("price chart categories", () => {
  it("uses the catalogue / supplier directory categories plus the directory's sector chips", () => {
    expect(PRICE_CATEGORIES.map((c) => c.name)).toEqual([
      ...supplierCategories,
      ...KEYWORD_SECTORS.map((s) => s.name),
    ]);
    expect(PRICE_CATEGORIES.map((c) => c.name)).toEqual([
      "Steel & Metals",
      "Cables & Electrical",
      "Tubes & Pipes",
      "Packaging",
      "Construction",
      "Industrial Parts",
      "Machinery",
      "Hardware Components",
      "Biomedical & Medical Manufacturing",
    ]);
    expect(new Set(PRICE_CATEGORIES.map((c) => c.id)).size).toBe(PRICE_CATEGORIES.length);
  });

  it("only lists catalog materials that have a price series, without duplicates", () => {
    for (const c of PRICE_CATEGORIES) {
      expect(c.materials.length, c.name).toBeGreaterThan(0);
      expect(new Set(c.materials).size, c.name).toBe(c.materials.length);
      for (const id of c.materials) {
        expect(isCatalogMaterial(id), `${c.name}: ${id}`).toBe(true);
        expect(seedIds, `${c.name}: ${id}`).toContain(id);
      }
    }
  });

  it("puts every charted material under at least one category", () => {
    const listed = new Set(PRICE_CATEGORIES.flatMap((c) => c.materials));
    expect(seedIds.filter((id) => !listed.has(id))).toEqual([]);
  });

  it("shows every category when all series are available", () => {
    expect(priceCategoriesFor(seedIds)).toHaveLength(PRICE_CATEGORIES.length);
  });

  it("hides chips that would be empty and trims the rest to available materials", () => {
    const shown = priceCategoriesFor(["cement", "platinum"]);
    expect(shown.map((c) => c.name)).toEqual(["Construction", "Biomedical & Medical Manufacturing"]);
    expect(shown[0].materials).toEqual(["cement"]);
    expect(shown[1].materials).toEqual(["platinum"]);
    expect(priceCategoriesFor([])).toEqual([]);
  });
});

describe("reference series", () => {
  it("has 12 positive monthly points ending at the current price", () => {
    for (const m of materials) {
      expect(m.history.length, m.id).toBeGreaterThanOrEqual(12);
      expect(m.history.every((v) => v > 0), m.id).toBe(true);
      expect(m.history[m.history.length - 1], m.id).toBe(m.currentPrice);
      expect(m.source, m.id).toBe("seed");
    }
  });
});
