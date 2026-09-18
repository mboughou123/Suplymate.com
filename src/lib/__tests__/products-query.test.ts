import { describe, expect, it } from "vitest";
import {
  EMPTY_PRODUCT_FILTERS,
  productFiltersAreDefault,
  shouldFetchProductsOnFilterChange,
} from "@/lib/products-query";

describe("product list query", () => {
  it("treats the SSR empty filter set as default", () => {
    expect(productFiltersAreDefault(EMPTY_PRODUCT_FILTERS)).toBe(true);
    expect(
      productFiltersAreDefault({ ...EMPTY_PRODUCT_FILTERS, search: "  coil  " })
    ).toBe(false);
  });

  it("skips the mount refetch when SSR already provided page 1", () => {
    expect(
      shouldFetchProductsOnFilterChange({
        previous: null,
        next: EMPTY_PRODUCT_FILTERS,
      })
    ).toBe(false);
  });

  it("fetches when the buyer actually changes filters", () => {
    expect(
      shouldFetchProductsOnFilterChange({
        previous: EMPTY_PRODUCT_FILTERS,
        next: { ...EMPTY_PRODUCT_FILTERS, category: "Steel & Metals" },
      })
    ).toBe(true);
  });
});
