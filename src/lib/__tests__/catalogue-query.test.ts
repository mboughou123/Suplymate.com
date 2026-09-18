import { describe, expect, it } from "vitest";
import {
  EMPTY_CATALOGUE_FILTERS,
  buildCatalogueQuery,
  isDefaultCatalogueFilters,
} from "@/lib/catalogue-query";

describe("catalogue query", () => {
  it("treats the empty filter set as default so the listing can keep SSR results", () => {
    expect(isDefaultCatalogueFilters(EMPTY_CATALOGUE_FILTERS)).toBe(true);
    expect(isDefaultCatalogueFilters({ ...EMPTY_CATALOGUE_FILTERS, search: "  " })).toBe(true);
    expect(isDefaultCatalogueFilters({ ...EMPTY_CATALOGUE_FILTERS, category: "Steel & Metals" })).toBe(
      false,
    );
  });

  it("omits empty filters from the API query string", () => {
    expect(buildCatalogueQuery(EMPTY_CATALOGUE_FILTERS, 1, 24)).toBe("page=1&pageSize=24");
    expect(
      buildCatalogueQuery({ ...EMPTY_CATALOGUE_FILTERS, search: "coil", verifiedOnly: true }, 2, 24),
    ).toBe("page=2&pageSize=24&search=coil&verifiedOnly=1");
  });
});
