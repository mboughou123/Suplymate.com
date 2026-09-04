import { describe, expect, it } from "vitest";
import { parseRequirement } from "@/lib/ai/requirement-parser";
import { matchSuppliers } from "@/lib/ai/supplier-matching";
import { buildSourcingPlan, stageForIntent } from "@/lib/ai/sourcing-plan";
import { detectMaterials, MATERIAL_CATALOG } from "@/data/material-catalog";
import { materials } from "@/data/materials";
import type { Supplier } from "@/data/suppliers";

describe("requirement parser", () => {
  it("extracts material, quantity and destination", () => {
    const r = parseRequirement("I need 10 tons of steel delivered to San Diego.");
    expect(r.materials.map((m) => m.id)).toContain("steel");
    expect(r.quantity).toMatchObject({ value: 10, unit: "tons" });
    expect(r.location).toBe("San Diego");
    expect(r.intent).toBe("find_suppliers");
  });

  it("detects supplier discovery with a place", () => {
    const r = parseRequirement("Find aluminum suppliers in California.");
    expect(r.intent).toBe("find_suppliers");
    expect(r.materials[0]?.id).toBe("aluminum");
    expect(r.location).toBe("California");
  });

  it("routes beginners to a sourcing plan", () => {
    const r = parseRequirement("I want to build a house. What materials do I need?");
    expect(r.beginner).toBe(true);
    expect(r.intent).toBe("sourcing_plan");
  });

  it("recognises material comparisons and substitutions", () => {
    expect(parseRequirement("What's the difference between 6061 and 7075 aluminum?").intent).toBe("material_info");
    expect(parseRequirement("Can I replace this material with something cheaper?").intent).toBe("material_substitute");
  });
});

describe("material catalog", () => {
  it("only charts catalog materials", () => {
    const ids = new Set(MATERIAL_CATALOG.map((m) => m.id));
    for (const m of materials) expect(ids.has(m.id)).toBe(true);
    expect(materials.find((m) => m.id === "crude-oil")).toBeUndefined();
  });

  it("detects aliases", () => {
    expect(detectMaterials("304 stainless tanks").map((m) => m.id)).toContain("stainless-steel");
    expect(detectMaterials("HDPE bottles").map((m) => m.id)).toContain("plastics-index");
  });

  it("labels every seed price as seed", () => {
    for (const m of materials) expect(m.source).toBe("seed");
  });
});

const supplier = (over: Partial<Supplier>): Supplier => ({
  id: "x",
  name: "X",
  industry: "Metal",
  location: "Somewhere",
  products: [],
  deliveryRegions: [],
  moq: "Contact supplier",
  reliabilityScore: 50,
  ...over,
});

describe("supplier matching", () => {
  const req = parseRequirement("Find aluminum suppliers in California with ISO certification");
  const pool: Supplier[] = [
    supplier({
      id: "cal-alu",
      name: "California Aluminum Works",
      category: "Steel & Metals",
      country: "United States",
      city: "Los Angeles",
      location: "Los Angeles, California",
      products: ["Aluminum extrusions", "6061 plate"],
      deliveryRegions: ["North America"],
      verified: true,
      googleRating: 4.6,
      googleReviews: 120,
      trustScore: 82,
      moq: "500 kg",
    }),
    supplier({
      id: "eu-steel",
      name: "Ruhr Steel GmbH",
      category: "Steel & Metals",
      country: "Germany",
      products: ["Hot rolled coil"],
      googleRating: 4.2,
    }),
    supplier({
      id: "boxes",
      name: "Box Co",
      industry: "Plastics & Packaging",
      category: "Packaging",
      country: "Poland",
      products: ["Corrugated boxes"],
    }),
  ];

  it("ranks the relevant, local, verified supplier first and explains why", () => {
    const matches = matchSuppliers(pool, req);
    expect(matches[0].supplier.id).toBe("cal-alu");
    expect(matches[0].overall).toBeGreaterThan(70);
    expect(matches[0].breakdown.location).toBe(98);
    expect(matches[0].reasons.join(" ")).toMatch(/Aluminum/);
  });

  it("never invents scores for missing data", () => {
    const matches = matchSuppliers(pool, req);
    const steel = matches.find((m) => m.supplier.id === "eu-steel");
    // Relevant via category but no delivery data -> delivery is null, not a number.
    expect(steel?.breakdown.delivery).toBeNull();
    expect(steel?.breakdown.price).toBeNull();
  });

  it("drops suppliers with zero relevance to a specific request", () => {
    const matches = matchSuppliers(pool, req);
    expect(matches.find((m) => m.supplier.id === "boxes")).toBeUndefined();
  });
});

describe("sourcing plan", () => {
  it("produces the 8-step workflow with actions", () => {
    const req = parseRequirement("I'm starting a manufacturing company. What suppliers should I look for?");
    const steps = buildSourcingPlan(req, 0);
    expect(steps).toHaveLength(8);
    expect(steps[0].title).toBe("Define requirements");
    expect(steps.some((s) => s.action?.href === "/suppliers")).toBe(true);
    expect(stageForIntent(req, false)).toBe("requirement");
  });
});
