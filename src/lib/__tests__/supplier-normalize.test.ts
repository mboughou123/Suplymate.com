import { describe, expect, it } from "vitest";
import {
  extractSupplierCity,
  generateSupplierDescription,
  normalizeSupplierInput,
} from "@/lib/supplier-normalize";

describe("supplier normalization", () => {
  it("uses the country alone when no city can be recovered", () => {
    const supplier = normalizeSupplierInput({
      name: "No City Supply",
      category: "Packaging",
      country: "Germany",
    });

    expect(supplier.city).toBeNull();
    expect(supplier.location).toBe("Germany");
    expect(supplier.description).not.toContain("null");
  });

  it("replaces an ISO-code city with a city from the address", () => {
    const supplier = normalizeSupplierInput({
      name: "Cables House",
      category: "Cables & Electrical",
      city: "AE",
      country: "United Arab Emirates",
      location: "AE, United Arab Emirates",
      address: "Naif - Deira - Dubai - United Arab Emirates",
    });

    expect(supplier.city).toBe("Dubai");
    expect(supplier.location).toBe("Dubai, United Arab Emirates");
    expect(supplier.description).not.toContain("AE,");
  });

  it("does not expose a bare ISO code when no replacement city exists", () => {
    expect(
      extractSupplierCity({
        city: "DE",
        country: "Germany",
        location: "DE, Germany",
      })
    ).toBeNull();
  });

  // The country column holds the English exonym while the address ends with the
  // endonym, so a plain string comparison lets the country through as the city.
  it("does not mistake a country endonym for a city", () => {
    expect(
      extractSupplierCity({
        city: "TR",
        country: "Turkey",
        address: "Zühtüpaşa, Rüştiye Sk. No: 8/3, 34724 Kadıköy/İstanbul, Türkiye",
      })
    ).toBe("İstanbul");
  });

  it("strips a leading postcode from the city segment", () => {
    expect(
      extractSupplierCity({
        city: "DE",
        country: "Germany",
        address: "Dieselstraße 4, 47228 Rheinhausen, Germany",
      })
    ).toBe("Rheinhausen");
  });

  // Google formats these as "District/Province"; the province is the useful half.
  it("takes the province from a district/province pair", () => {
    expect(
      extractSupplierCity({
        city: "TR",
        country: "Turkey",
        address: "Velimeşe OSB, 7. Km., 59930 Çorlu/Tekirdağ, Türkiye",
      })
    ).toBe("Tekirdağ");
  });

  it("ignores a US state and ZIP tail, which is never a city", () => {
    expect(
      extractSupplierCity({
        country: "United States",
        address: "1 Industrial Park Rd, Johnson City, TN 37604",
      })
    ).toBe("Johnson City");
  });

  it("agrees the indefinite article with a vowel-initial category", () => {
    expect(
      generateSupplierDescription(
        {
          name: "Al Nihal Trading",
          category: "Industrial Parts",
          country: "United Arab Emirates",
          city: "Sharjah",
        },
        0
      )
    ).toContain("as an industrial parts supplier");
  });

  it("uses 'a' for a consonant-initial category", () => {
    expect(
      generateSupplierDescription(
        {
          name: "AJ Steel",
          category: "Tubes & Pipes",
          country: "United Arab Emirates",
          city: "Abu Dhabi",
        },
        0
      )
    ).toContain("as a tubes & pipes supplier");
  });

  it("keeps a city that is already valid", () => {
    expect(
      extractSupplierCity({
        city: "Casablanca",
        country: "Morocco",
        address: "Zone Industrielle, Casablanca, Maroc",
      })
    ).toBe("Casablanca");
  });

  it("labels a supplier with no category or industry as uncategorized", () => {
    const supplier = normalizeSupplierInput({
      name: "Open Directory Entry",
      country: "Mexico",
    });

    expect(supplier.category).toBeNull();
    expect(supplier.industry).toBe("Uncategorized");
    expect(supplier.description).toContain("Uncategorized");
  });

  it("preserves non-Latin supplier names", () => {
    const supplier = normalizeSupplierInput({
      name: "東京鋼材株式会社",
      category: "Steel & Metals",
      city: "東京",
      country: "Japan",
    });

    expect(supplier.name).toBe("東京鋼材株式会社");
    expect(supplier.description).toContain("東京鋼材株式会社");
  });

  it("cycles description shapes for sequential imports", () => {
    const input = {
      name: "Sequence Supply",
      category: "Industrial Parts",
      city: "Pune",
      country: "India",
    };

    expect(generateSupplierDescription(input, 0)).not.toBe(
      generateSupplierDescription(input, 1)
    );
  });
});
