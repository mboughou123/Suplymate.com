import { describe, expect, it } from "vitest";
import { compareForDirectory } from "@/lib/supplier-directory-sort";
import { phase1Suppliers } from "@/data/phase1-suppliers";
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

describe("compareForDirectory", () => {
  it("ranks phase-1 mills ahead of older scraped rows", () => {
    const phase1 = phase1Suppliers[0];
    expect(phase1).toBeTruthy();

    const scraped = stub({
      id: "all-metal-india-pvt-ltd",
      name: "ALL METAL INDIA PVT. LTD",
      score: 99,
      reliabilityScore: 99,
      imageUrl: "https://example.com/photo.jpg",
      verified: true,
    });

    const ordered = [scraped, phase1].sort(compareForDirectory);
    expect(ordered[0].id).toBe(phase1.id);
    expect(ordered[1].id).toBe(scraped.id);
  });

  it("keeps phase-1 ahead even when the scraped row has images + higher score", () => {
    const a = stub({
      id: phase1Suppliers[1]?.id ?? "phase1-a",
      name: "Phase One Mill",
      score: 10,
    });
    // Force membership via real phase-1 id when available.
    const phase1Id = phase1Suppliers[1]?.id;
    const phase1Row = stub({
      id: phase1Id ?? a.id,
      name: "Foliflex Wires & Cables",
      score: 10,
    });
    const scraped = stub({
      id: "cables-house-wires",
      name: "CABLES HOUSE WIRES AND CABLES TRADING LLC",
      score: 100,
      imageUrl: "https://example.com/a.jpg",
      supplierImages: ["https://example.com/b.jpg"],
    });

    expect(compareForDirectory(phase1Row, scraped)).toBeLessThan(0);
  });
});
