import { describe, expect, it } from "vitest";
import { outscraperSuppliers } from "@/data/outscraper-suppliers";
import { mergePackSuppliers } from "@/data/pack-catalog";
import { toListingSupplier } from "@/lib/supplier-listing";
import {
  SUPPLIER_LIST_PAGE_SIZE,
  buildDirectoryQuery,
  filterAndSortListing,
  paginateListing,
  parseDirectoryFilters,
  shouldFetchDirectoryOnFilterChange,
} from "@/lib/supplier-directory";

const all = mergePackSuppliers(outscraperSuppliers).map(toListingSupplier);

describe("supplier directory pagination", () => {
  it("keeps every mill id when paging — first HTML is a slice, not a drop", () => {
    const filtered = filterAndSortListing(all, {
      search: "",
      category: "All",
      country: "All",
      minRating: 0,
      minReviews: 0,
      verifiedOnly: false,
    });
    expect(filtered.map((s) => s.id).sort()).toEqual(all.map((s) => s.id).sort());
    expect(filtered.length).toBeGreaterThan(100);

    const page1 = paginateListing(filtered, 1, SUPPLIER_LIST_PAGE_SIZE);
    expect(page1.items).toHaveLength(SUPPLIER_LIST_PAGE_SIZE);
    expect(page1.total).toBe(filtered.length);
    expect(page1.hasMore).toBe(true);
    expect(page1.items.length).toBeLessThanOrEqual(48);
    expect(page1.items.length).toBeGreaterThanOrEqual(24);
  });

  it("serializes a first page far smaller than the full 719-row payload", () => {
    const filtered = filterAndSortListing(all, {
      search: "",
      category: "All",
      country: "All",
      minRating: 0,
      minReviews: 0,
      verifiedOnly: false,
    });
    const page1 = paginateListing(filtered, 1, SUPPLIER_LIST_PAGE_SIZE);
    const fullBytes = Buffer.byteLength(JSON.stringify(filtered));
    const pageBytes = Buffer.byteLength(JSON.stringify(page1.items));
    expect(fullBytes).toBeGreaterThan(400_000);
    expect(pageBytes).toBeLessThan(fullBytes * 0.15);
    expect(page1.items.length).toBeLessThan(filtered.length / 4);
  });

  it("still finds mills by name after paging", () => {
    const hit = all.find((s) => s.name.length > 8);
    expect(hit).toBeDefined();
    const filtered = filterAndSortListing(all, {
      search: hit!.name.slice(0, 8),
      category: "All",
      country: "All",
      minRating: 0,
      minReviews: 0,
      verifiedOnly: false,
    });
    expect(filtered.some((s) => s.id === hit!.id)).toBe(true);
  });

  it("skips the mount refetch when SSR already provided page 1", () => {
    expect(
      shouldFetchDirectoryOnFilterChange({
        previous: null,
        next: {
          search: "",
          category: "All",
          country: "All",
          minRating: 0,
          minReviews: 0,
          verifiedOnly: false,
        },
      })
    ).toBe(false);
  });

  it("round-trips filter query params for the directory API", () => {
    const qs = buildDirectoryQuery(
      {
        search: "posco",
        category: "Steel & Metals",
        country: "South Korea",
        minRating: 4,
        minReviews: 20,
        verifiedOnly: true,
      },
      2,
      36
    );
    const parsed = parseDirectoryFilters(new URLSearchParams(qs));
    expect(parsed.search).toBe("posco");
    expect(parsed.category).toBe("Steel & Metals");
    expect(parsed.country).toBe("South Korea");
    expect(parsed.minRating).toBe(4);
    expect(parsed.minReviews).toBe(20);
    expect(parsed.verifiedOnly).toBe(true);
    expect(new URLSearchParams(qs).get("page")).toBe("2");
  });
});
