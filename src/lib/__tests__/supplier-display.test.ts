import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { phase1Suppliers } from "@/data/phase1-suppliers";
import { getFactoryPhotoUrl } from "@/lib/phase1";
import {
  LOGO_SLUG_BY_ID,
  localLogoPathForSupplierId,
} from "@/lib/local-supplier-logos";
import {
  inferBusinessType,
  looksLikeTrader,
  toDisplaySupplier,
} from "@/lib/supplier-display";
import type { Supplier } from "@/data/suppliers";

function stub(partial: Partial<Supplier> & Pick<Supplier, "id" | "name">): Supplier {
  return {
    industry: "Metal",
    location: "Test",
    products: ["Hot-rolled coil", "Rebar"],
    deliveryRegions: [],
    moq: "",
    reliabilityScore: 50,
    ...partial,
  };
}

describe("toDisplaySupplier commercial honesty", () => {
  it("shows RFQ instead of invented price bands", () => {
    const d = toDisplaySupplier(
      stub({ id: "demo-mill", name: "Demo Mill", products: ["Coil", "Plate", "Pipe"] })
    );
    expect(d.products.length).toBeGreaterThan(0);
    for (const p of d.products) {
      expect(p.price).toBe("RFQ");
      expect(p.hasRealPrice).toBe(false);
      expect(p.price).not.toMatch(/\$\d/);
    }
  });

  it("omits MOQ unless the supplier record has a real value", () => {
    const without = toDisplaySupplier(stub({ id: "a", name: "A", moq: "" }));
    expect(without.products[0]?.hasRealMoq).toBe(false);

    const withMoq = toDisplaySupplier(stub({ id: "b", name: "B", moq: "20 tons" }));
    expect(withMoq.products[0]?.hasRealMoq).toBe(true);
    expect(withMoq.products[0]?.moq).toBe("20 tons");
  });

  it("does not invent ratings, reviews, years, or staff counts", () => {
    const d = toDisplaySupplier(stub({ id: "bare", name: "Bare Mill" }));
    expect(d.rating).toBeNull();
    expect(d.reviewCount).toBeNull();
    expect(d.hasRealRating).toBe(false);
    expect(d.yearsInBusiness).toBeNull();
    expect(d.employees).toBeNull();
  });

  it("hides leftover seed ratings / MOQ that are not from the Lister pack", () => {
    const leftover = toDisplaySupplier(
      stub({
        id: "all-metal-india-pvt-ltd-pune",
        name: "ALL METAL INDIA PVT. LTD",
        googleRating: 5,
        googleReviews: 349,
        rating: 5,
        reviewCount: 349,
        moq: "5 tons",
        products: ["Steel coils"],
      })
    );
    expect(leftover.rating).toBeNull();
    expect(leftover.reviewCount).toBeNull();
    expect(leftover.hasRealRating).toBe(false);
    expect(leftover.hasRealReviews).toBe(false);
    expect(leftover.products[0]?.price).toBe("RFQ");
    expect(leftover.products[0]?.hasRealMoq).toBe(false);
    expect(leftover.moq).toBe("");
  });

  it("keeps Lister-sourced ratings on phase-1 mills", () => {
    const foliflex = phase1Suppliers.find((s) => s.id === "foliflex-wires-cables-delhi");
    expect(foliflex).toBeTruthy();
    const d = toDisplaySupplier(foliflex!);
    expect(d.hasRealRating).toBe(Boolean(foliflex!.googleRating ?? foliflex!.rating));
    if (foliflex!.googleRating != null) {
      expect(d.rating).toBe(foliflex!.googleRating);
    }
  });
});

describe("trader vs mill labels", () => {
  it("does not present Cables House as a manufacturer", () => {
    expect(
      looksLikeTrader("CABLES HOUSE WIRES AND CABLES TRADING LLC")
    ).toBe(true);
    expect(
      inferBusinessType({
        id: "cables-house-wires-and-cables-trading-llc-ae",
        name: "CABLES HOUSE WIRES AND CABLES TRADING LLC",
      })
    ).toBe("Trader / distributor");
  });

  it("labels phase-1 rows as manufacturers", () => {
    const mill = phase1Suppliers[0];
    expect(looksLikeTrader(mill.name)).toBe(false);
    expect(inferBusinessType(mill)).toBe("Manufacturer");
  });
});

describe("factory photos and local logos", () => {
  it("rejects Magicrete's IndiaMART 120×120 logo as a factory header", () => {
    const magicrete = phase1Suppliers.find((s) => s.name.includes("Magicrete"));
    expect(magicrete).toBeTruthy();
    expect(getFactoryPhotoUrl(magicrete!)).toBeUndefined();
    const d = toDisplaySupplier(magicrete!);
    expect(d.factoryPhotoUrl).toBeUndefined();
  });

  it("maps every local logo-{slug}.png pack file onto a known mill id", () => {
    for (const [id, slug] of Object.entries(LOGO_SLUG_BY_ID)) {
      const rel = localLogoPathForSupplierId(id);
      expect(rel).toBe(`/images/suppliers/logos/logo-${slug}.png`);
      const abs = resolve(process.cwd(), "public", rel!.replace(/^\//, ""));
      expect(existsSync(abs), abs).toBe(true);
    }
  });

  it("prefers the local Al Gharbia reverse logo over a remote banner", () => {
    const mill = phase1Suppliers.find((s) => s.id === "al-gharbia-pipe-company-llc-ae")!;
    const d = toDisplaySupplier({
      ...mill,
      logoUrl: "https://example.com/remote-banner.png",
    });
    expect(d.logoUrl).toBe("/images/suppliers/logos/logo-al-gharbia.png");
    expect(d.logoDarkChip).toBe(true);
  });
});
