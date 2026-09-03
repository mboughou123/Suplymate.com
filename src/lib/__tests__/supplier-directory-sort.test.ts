import { describe, expect, it } from "vitest";
import { compareForDirectory, isCuratedDirectoryMill } from "@/lib/supplier-directory-sort";
import { isPhase1Supplier, PHASE1_SUPPLIER_IDS } from "@/lib/phase1";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import { daily20260902Suppliers } from "@/lib/daily-2026-09-02-suppliers";
import type { Supplier } from "@/data/suppliers";

function stub(partial: Partial<Supplier> & Pick<Supplier, "id" | "name">): Supplier {
  return {
    industry: "Metal",
    location: "Test",
    products: [],
    deliveryRegions: [],
    moq: "",
    reliabilityScore: 50,
    ...partial,
  };
}

/** Older Outscraper / seed rows that are NOT in the phase-1 mill pack. */
const NOT_IN_PACK = [
  stub({
    id: "all-metal-india-pvt-ltd-pune",
    name: "ALL METAL INDIA PVT. LTD",
    score: 100,
    reliabilityScore: 99,
    imageUrl: "https://example.com/photo.jpg",
    verified: true,
  }),
  stub({
    id: "cables-house-wires-and-cables-trading-llc-ae",
    name: "CABLES HOUSE WIRES AND CABLES TRADING LLC",
    score: 100,
    imageUrl: "https://example.com/a.jpg",
    supplierImages: ["https://example.com/b.jpg"],
  }),
  stub({
    id: "cablesshop-barcelona",
    name: "CablesShop",
    score: 100,
    imageUrl: "https://example.com/c.jpg",
  }),
  stub({
    id: "duboxx-packaging-llc-ae",
    name: "Duboxx Packaging LLC",
    score: 100,
    imageUrl: "https://example.com/d.jpg",
  }),
  stub({
    id: "gm-tecnoedil-rome",
    name: "GM Tecnoedil",
    score: 100,
    imageUrl: "https://example.com/e.jpg",
  }),
];

describe("compareForDirectory", () => {
  it("treats the curated pack as exactly 59 mills, including Foliflex", () => {
    expect(phase1Suppliers).toHaveLength(59);
    expect(PHASE1_SUPPLIER_IDS.size).toBe(59);
    expect(isPhase1Supplier("foliflex-wires-cables-delhi")).toBe(true);
    for (const row of NOT_IN_PACK) {
      expect(isPhase1Supplier(row.id), row.name).toBe(false);
    }
  });

  it("ranks every phase-1 mill ahead of the named scraped leftovers", () => {
    const foliflex = phase1Suppliers.find((s) => s.id === "foliflex-wires-cables-delhi");
    expect(foliflex).toBeTruthy();

    const mixed = [...NOT_IN_PACK, ...phase1Suppliers, ...daily20260902Suppliers].sort(
      compareForDirectory,
    );
    const curatedCount = 59 + daily20260902Suppliers.length;
    const first = mixed.slice(0, curatedCount);
    expect(first.every((s) => isCuratedDirectoryMill(s))).toBe(true);
    expect(mixed.slice(curatedCount).some((s) => isCuratedDirectoryMill(s))).toBe(
      false,
    );
    expect(mixed.map((s) => s.id)).toContain("foliflex-wires-cables-delhi");
    expect(mixed.findIndex((s) => s.id === "foliflex-wires-cables-delhi")).toBeLessThan(
      curatedCount,
    );
    expect(mixed.findIndex((s) => s.id === "nucor")).toBeLessThan(curatedCount);

    for (const leftover of NOT_IN_PACK) {
      expect(mixed.findIndex((s) => s.id === leftover.id)).toBeGreaterThanOrEqual(
        curatedCount,
      );
      expect(compareForDirectory(foliflex!, leftover)).toBeLessThan(0);
    }
  });
});
