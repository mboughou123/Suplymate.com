import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STEEL_METAL_PATH,
  STEEL_METAL_SUBCATEGORY_IDS,
  STEEL_METAL_MILL_NAV_IDS,
  STEEL_METAL_MORE_METALS_IDS,
  STEEL_METAL_HOLD_IDS,
  browseLaneFor,
  getSteelMetalTaxonomy,
  getSteelMetalSubcategory,
  getSteelMetalLeaf,
  isHeldFromMillNav,
  listMillNavSubcategories,
  listMoreMetalsSubcategories,
  listSteelMetalLeaves,
  steelMetalHubHref,
  steelMetalSubcategoryHref,
  steelMetalLeafHref,
  steelMetalLeafParams,
  steelMetalSubcategoryParams,
  taxonomyHasPricingFields,
} from "@/data/taxonomy/steel-metal";

const EXPECTED_SUBCATS = [
  "carbon-mild-steel",
  "stainless-steel",
  "alloy-steel",
  "tool-steel",
  "galvanized-coated-steels",
  "structural-steel",
  "pipe-tube",
  "wire-rebar-mesh",
  "flat-products-specialty",
  "aluminum",
  "copper-brass-bronze",
  "other-non-ferrous",
  "metal-scrap-secondary",
] as const;

describe("Steel & Metal taxonomy", () => {
  it("loads 13 subcategories and 85 unique leaf ids from JSON", () => {
    const taxonomy = getSteelMetalTaxonomy();
    expect(taxonomy.top_level).toBe("Steel & Metal");
    expect(taxonomy.pricing_policy).toMatch(/no FOB|variants only/i);
    expect(taxonomy.categories.map((c) => c.id)).toEqual([...EXPECTED_SUBCATS]);
    expect(STEEL_METAL_SUBCATEGORY_IDS).toEqual(EXPECTED_SUBCATS);

    const leaves = listSteelMetalLeaves();
    expect(leaves).toHaveLength(85);
    const ids = leaves.map((row) => row.leaf.id);
    expect(new Set(ids).size).toBe(85);
    expect(ids).toContain("carbon-steel-sheet");
    expect(ids).toContain("ss-sheet-plate");
    expect(ids).toContain("h-beam");
    expect(ids).toContain("seamless-pipe");
    expect(ids).toContain("rebar");
  });

  it("keeps researcher-stable leaf ids and never invents prices", () => {
    expect(taxonomyHasPricingFields(getSteelMetalTaxonomy())).toBe(false);
    const sheet = getSteelMetalLeaf("carbon-mild-steel", "carbon-steel-sheet");
    expect(sheet?.leaf.name).toBe("Carbon Steel Sheet");
    expect(sheet?.leaf.variants.grades).toContain("A36");
    expect(sheet?.leaf.variants.form).toContain("sheet");
    expect(JSON.stringify(sheet)).not.toMatch(/FOB|USD\/|\$\d/i);
  });

  it("looks up subcategory and leaf or returns null", () => {
    expect(getSteelMetalSubcategory("pipe-tube")?.name).toMatch(/Pipe/i);
    expect(getSteelMetalSubcategory("does-not-exist")).toBeNull();
    expect(getSteelMetalLeaf("pipe-tube", "seamless-pipe")?.leaf.id).toBe("seamless-pipe");
    expect(getSteelMetalLeaf("pipe-tube", "carbon-steel-sheet")).toBeNull();
    expect(getSteelMetalLeaf("missing", "seamless-pipe")).toBeNull();
  });

  it("builds locale-free browse hrefs from stable ids", () => {
    expect(STEEL_METAL_PATH).toBe("/steel-metal");
    expect(steelMetalHubHref()).toBe("/steel-metal");
    expect(steelMetalSubcategoryHref("carbon-mild-steel")).toBe(
      "/steel-metal/carbon-mild-steel",
    );
    expect(steelMetalLeafHref("carbon-mild-steel", "carbon-steel-sheet")).toBe(
      "/steel-metal/carbon-mild-steel/carbon-steel-sheet",
    );
  });

  it("ships mill nav v1 as 11 subcats in steel-first order and holds scrap", () => {
    expect([...STEEL_METAL_MILL_NAV_IDS]).toEqual([
      "carbon-mild-steel",
      "stainless-steel",
      "alloy-steel",
      "tool-steel",
      "galvanized-coated-steels",
      "structural-steel",
      "pipe-tube",
      "wire-rebar-mesh",
      "flat-products-specialty",
      "aluminum",
      "copper-brass-bronze",
    ]);
    expect(listMillNavSubcategories().map((c) => c.id)).toEqual([...STEEL_METAL_MILL_NAV_IDS]);
    expect([...STEEL_METAL_MORE_METALS_IDS]).toEqual(["other-non-ferrous"]);
    expect(listMoreMetalsSubcategories().map((c) => c.id)).toEqual(["other-non-ferrous"]);
    expect([...STEEL_METAL_HOLD_IDS]).toEqual(["metal-scrap-secondary"]);
    expect(browseLaneFor("carbon-mild-steel")).toBe("mill");
    expect(browseLaneFor("other-non-ferrous")).toBe("more-metals");
    expect(browseLaneFor("metal-scrap-secondary")).toBe("hold");
    expect(isHeldFromMillNav("metal-scrap-secondary")).toBe(true);
    expect(listMillNavSubcategories().some((c) => c.id === "metal-scrap-secondary")).toBe(false);
  });

  it("applies Researcher display remaps without changing ids", () => {
    const plate = getSteelMetalLeaf("alloy-steel", "alloy-steel-plate");
    expect(plate?.leaf.id).toBe("alloy-steel-plate");
    expect(plate?.leaf.variants.grades).toContain("AR400");
    expect(plate?.leaf.variants.grades).toContain("AR500");
    expect(plate?.leaf.variants.grades).toContain("NM400");
    expect(plate?.leaf.variants.grades).not.toContain("Hardox-equiv");

    const zmg = getSteelMetalLeaf("galvanized-coated-steels", "zmg-zn-al-mg");
    expect(zmg?.leaf.common_names).toContain("Zn-Al-Mg");
    expect(zmg?.leaf.common_names).toContain("ZM coated");
    expect(zmg?.leaf.common_names.join(" ")).not.toMatch(/SuperDyma/i);

    const weathering = getSteelMetalLeaf("flat-products-specialty", "weathering-corten");
    expect(weathering?.leaf.id).toBe("weathering-corten");
    expect(weathering?.leaf.name).toBe("Weathering Steel");
    expect(weathering?.leaf.common_names).toEqual(expect.arrayContaining(["Corten", "COR-TEN"]));

    const roofing = getSteelMetalLeaf("galvanized-coated-steels", "gi-corrugated-roofing");
    expect(roofing?.leaf.common_names).toEqual(
      expect.arrayContaining(["corrugated sheet", "trapezoidal sheet", "wave profile"]),
    );
    expect(roofing?.leaf.common_names.join(" ")).not.toMatch(/Ibrahim/i);
  });

  it("enumerates public browse params without the held scrap subtree", () => {
    const params = steelMetalLeafParams();
    expect(params).toContainEqual({
      subcategory: "carbon-mild-steel",
      leaf: "carbon-steel-sheet",
    });
    expect(params.some((p) => p.subcategory === "metal-scrap-secondary")).toBe(false);
    expect(steelMetalSubcategoryParams().map((p) => p.subcategory)).toEqual([
      ...STEEL_METAL_MILL_NAV_IDS,
      ...STEEL_METAL_MORE_METALS_IDS,
    ]);
    expect(listSteelMetalLeaves()).toHaveLength(85);
  });

  it("is wired to hub, subcategory, and leaf App Router pages", () => {
    const root = resolve(process.cwd(), "src/app/[locale]/steel-metal");
    expect(existsSync(resolve(root, "page.tsx"))).toBe(true);
    expect(existsSync(resolve(root, "[subcategory]/page.tsx"))).toBe(true);
    expect(existsSync(resolve(root, "[subcategory]/[leaf]/page.tsx"))).toBe(true);
  });
});
