import { describe, expect, it } from "vitest";
import {
  buildHomeBenefits,
  countSupplierCountries,
  GUEST_QUESTION_LIMIT,
} from "@/lib/home-benefits";

describe("countSupplierCountries", () => {
  it("counts distinct countries, preferring the explicit field over the location suffix", () => {
    const n = countSupplierCountries([
      { country: "India", location: "Mumbai, India" },
      { country: undefined, location: "Dubai, United Arab Emirates" },
      { country: "India", location: "Pune, India" },
      { country: undefined, location: " Houston,  United States " },
      { country: undefined, location: "" },
    ]);
    expect(n).toBe(3);
  });
});

describe("buildHomeBenefits", () => {
  it("returns five cards in display order when all data is present", () => {
    const items = buildHomeBenefits({ countryCount: 12, materialCount: 14 });
    expect(items.map((i) => i.key)).toEqual(["heldFunds", "countries", "materials", "guestQuestions", "alwaysOn"]);
    expect(items[0]).toMatchObject({ value: 0, prefix: "$" });
    expect(items[1].value).toBe(12);
    expect(items[2].value).toBe(14);
    expect(items[3].value).toBe(GUEST_QUESTION_LIMIT);
    expect(items[4]).toMatchObject({ value: null, display: "24/7" });
  });

  it("drops data-driven cards whose count is zero instead of showing 0", () => {
    const keys = buildHomeBenefits({ countryCount: 0, materialCount: 0 }).map((i) => i.key);
    expect(keys).toEqual(["heldFunds", "guestQuestions", "alwaysOn"]);
  });
});
