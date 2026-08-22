import { describe, expect, it } from "vitest";
import { isRealProductName, nonProductNameFilter } from "@/lib/product-quality";

describe("isRealProductName", () => {
  it("rejects scraped navigation labels", () => {
    for (const label of [
      "Our Products",
      "Buy Metals",
      "Buildings",
      "Distribution",
      "Contact Us",
      "Home",
    ]) {
      expect(isRealProductName(label), label).toBe(false);
    }
  });

  it("rejects labels regardless of casing or surrounding space", () => {
    expect(isRealProductName("  our products  ")).toBe(false);
    expect(isRealProductName("OUR PRODUCTS")).toBe(false);
  });

  it("rejects blanks, stubs and names with no letters", () => {
    expect(isRealProductName(null)).toBe(false);
    expect(isRealProductName(undefined)).toBe(false);
    expect(isRealProductName("")).toBe(false);
    expect(isRealProductName("  ")).toBe(false);
    expect(isRealProductName("ok")).toBe(false);
    expect(isRealProductName("2024")).toBe(false);
    expect(isRealProductName("---")).toBe(false);
  });

  // Alloy grades are short, all-caps and digit-bearing, so any casing- or
  // digit-based heuristic would silently delete real catalogue entries.
  it("keeps legitimate alloy and grade names", () => {
    for (const name of [
      "HASTELLOY C-276",
      "Monel 400 / K500",
      "17-4 PH Stainless Steel",
      "SAE 8620 Case Hardening Steel",
      "Super Duplex Steel F53 / F55",
      "Titanium Gr 2 / Gr 5",
      "Teflon PTFE Bush",
      "Nitronic 50 / 60",
    ]) {
      expect(isRealProductName(name), name).toBe(true);
    }
  });

  it("keeps product names that merely contain a stoplist word", () => {
    expect(isRealProductName("Distribution Transformer")).toBe(true);
    expect(isRealProductName("Home Appliance Steel Sheet")).toBe(true);
  });
});

describe("nonProductNameFilter", () => {
  it("builds a case-insensitive Prisma NOT clause", () => {
    const filter = nonProductNameFilter();
    expect(filter.NOT.OR.length).toBeGreaterThan(0);
    for (const clause of filter.NOT.OR) {
      expect(clause.name.mode).toBe("insensitive");
      expect(clause.name.equals).toBe(clause.name.equals.toLowerCase());
    }
  });
});
