import { describe, expect, it } from "vitest";
import { getSteelMetalLeaf } from "@/data/taxonomy/steel-metal";
import {
  buildRfqProductName,
  facetGroupsForLeaf,
  findPackListingsForLeaf,
  parseLeafFacetQuery,
  serializeLeafFacetQuery,
  type LeafFacetSelection,
} from "@/lib/steel-metal-listings";

describe("Steel & Metal leaf facets and RFQ copy", () => {
  it("exposes only populated taxonomy facets (no invented grades or prices)", () => {
    const row = getSteelMetalLeaf("carbon-mild-steel", "carbon-steel-sheet");
    expect(row).not.toBeNull();
    const groups = facetGroupsForLeaf(row!.leaf);
    expect(groups.map((g) => g.key)).toEqual([
      "form",
      "grade",
      "thickness",
      "finish",
      "standard",
    ]);
    expect(groups.find((g) => g.key === "grade")?.options).toContain("A36");
    expect(JSON.stringify(groups)).not.toMatch(/FOB|\$\d|USD\/ton/i);
  });

  it("omits empty facet groups (e.g. scrap has no thickness)", () => {
    const row = getSteelMetalLeaf("metal-scrap-secondary", "steel-iron-scrap");
    expect(row).not.toBeNull();
    const keys = facetGroupsForLeaf(row!.leaf).map((g) => g.key);
    expect(keys).not.toContain("thickness");
    expect(keys).not.toContain("finish");
    expect(keys).toContain("grade");
    expect(keys).toContain("form");
  });

  it("round-trips facet query params and builds RFQ-only product names", () => {
    const selection: LeafFacetSelection = {
      form: "sheet",
      grade: "A36",
      thickness: "1.5-6 mm (sheet)",
      finish: "hot rolled",
      standard: "ASTM A36",
    };
    const query = serializeLeafFacetQuery(selection);
    expect(parseLeafFacetQuery(query)).toEqual(selection);

    const row = getSteelMetalLeaf("carbon-mild-steel", "carbon-steel-sheet");
    const name = buildRfqProductName(row!.leaf, selection);
    expect(name).toContain("Carbon Steel Sheet");
    expect(name).toContain("A36");
    expect(name).not.toMatch(/FOB|\$\d/i);
  });

  it("matches pack-catalog RFQ stills to a leaf without exposing prices", () => {
    const row = getSteelMetalLeaf("pipe-tube", "pipeline-api5l");
    expect(row).not.toBeNull();
    const listings = findPackListingsForLeaf(row!.leaf);
    expect(listings.length).toBeGreaterThan(0);
    expect(listings.length).toBeLessThanOrEqual(6);
    for (const listing of listings) {
      expect(listing.imageUrl.startsWith("/images/")).toBe(true);
      expect(listing.href).toMatch(/^\/products\//);
      expect(listing).not.toHaveProperty("price");
      expect(listing).not.toHaveProperty("basePrice");
      expect(listing).not.toHaveProperty("priceLabel");
      expect(JSON.stringify(listing)).not.toMatch(/FOB|\$\d/i);
    }
    expect(listings.some((l) => /api 5l|line ?pipe/i.test(l.name))).toBe(true);
  });
});
