import { supplierHasUsableCardImage } from "@/lib/image-fallback";
import {
  listingSupplierMatches,
  type ListingSupplier,
} from "@/lib/supplier-listing";

/** First HTML page: 24–48 cards. Full directory loads on demand. */
export const SUPPLIER_LIST_PAGE_SIZE = 36;

export type SupplierDirectoryFilters = {
  search: string;
  category: string;
  country: string;
  minRating: number;
  minReviews: number;
  verifiedOnly: boolean;
};

export const EMPTY_SUPPLIER_FILTERS: SupplierDirectoryFilters = {
  search: "",
  category: "All",
  country: "All",
  minRating: 0,
  minReviews: 0,
  verifiedOnly: false,
};

export type SupplierDirectoryFacets = {
  categories: string[];
  countries: string[];
};

function categoryOf(s: ListingSupplier): string {
  return s.category ?? s.industry;
}

function ratingOf(s: ListingSupplier): number {
  return s.googleRating ?? s.rating ?? 0;
}

function reviewsOf(s: ListingSupplier): number {
  return s.googleReviews ?? s.reviewCount ?? 0;
}

function countryOf(s: ListingSupplier): string {
  return s.country ?? s.location.split(",").pop()!.trim();
}

export function directoryFacets(all: ListingSupplier[]): SupplierDirectoryFacets {
  return {
    categories: Array.from(new Set(all.map(categoryOf))).sort((a, b) => a.localeCompare(b)),
    countries: Array.from(new Set(all.map(countryOf))).sort((a, b) => a.localeCompare(b)),
  };
}

export function directoryCounts(all: ListingSupplier[]): {
  total: number;
  verified: number;
  countries: number;
} {
  return {
    total: all.length,
    verified: all.filter((s) => s.verified).length,
    countries: new Set(all.map(countryOf)).size,
  };
}

export function filterAndSortListing(
  all: ListingSupplier[],
  filters: SupplierDirectoryFilters
): ListingSupplier[] {
  const q = filters.search.toLowerCase().trim();
  return all
    .filter((s) => {
      if (filters.category !== "All" && categoryOf(s) !== filters.category) return false;
      if (filters.country !== "All" && countryOf(s) !== filters.country) return false;
      if (ratingOf(s) < filters.minRating) return false;
      if (reviewsOf(s) < filters.minReviews) return false;
      if (filters.verifiedOnly && !s.verified) return false;
      if (!q) return true;
      return listingSupplierMatches(s, q);
    })
    .sort((a, b) => {
      const img = Number(supplierHasUsableCardImage(b)) - Number(supplierHasUsableCardImage(a));
      if (img) return img;
      const score =
        (b.score ?? b.reliabilityScore) - (a.score ?? a.reliabilityScore);
      if (score) return score;
      return a.name.localeCompare(b.name);
    });
}

export function paginateListing(
  rows: ListingSupplier[],
  page: number,
  pageSize: number = SUPPLIER_LIST_PAGE_SIZE
): {
  items: ListingSupplier[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} {
  const size = Math.min(Math.max(Math.floor(pageSize) || SUPPLIER_LIST_PAGE_SIZE, 1), 48);
  const safePage = Math.max(1, Math.floor(page) || 1);
  const total = rows.length;
  const start = (safePage - 1) * size;
  const items = rows.slice(start, start + size);
  return {
    items,
    total,
    page: safePage,
    pageSize: size,
    hasMore: start + items.length < total,
  };
}

export function parseDirectoryFilters(sp: URLSearchParams): SupplierDirectoryFilters {
  return {
    search: sp.get("search") ?? "",
    category: sp.get("category") || "All",
    country: sp.get("country") || "All",
    minRating: Number(sp.get("minRating")) || 0,
    minReviews: Number(sp.get("minReviews")) || 0,
    verifiedOnly: sp.get("verifiedOnly") === "1",
  };
}

export function supplierFiltersAreDefault(f: SupplierDirectoryFilters): boolean {
  return (
    !f.search.trim() &&
    (f.category === "All" || !f.category) &&
    (f.country === "All" || !f.country) &&
    !f.minRating &&
    !f.minReviews &&
    !f.verifiedOnly
  );
}

/**
 * The suppliers page already SSRs page 1 of the default query. Re-fetching
 * that same page on mount would flash skeletons over the cached HTML.
 */
export function shouldFetchDirectoryOnFilterChange(opts: {
  previous: SupplierDirectoryFilters | null;
  next: SupplierDirectoryFilters;
}): boolean {
  if (opts.previous === null && supplierFiltersAreDefault(opts.next)) return false;
  return true;
}

export function buildDirectoryQuery(
  filters: SupplierDirectoryFilters,
  page: number,
  pageSize: number = SUPPLIER_LIST_PAGE_SIZE
): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  if (filters.search.trim()) p.set("search", filters.search.trim());
  if (filters.category && filters.category !== "All") p.set("category", filters.category);
  if (filters.country && filters.country !== "All") p.set("country", filters.country);
  if (filters.minRating) p.set("minRating", String(filters.minRating));
  if (filters.minReviews) p.set("minReviews", String(filters.minReviews));
  if (filters.verifiedOnly) p.set("verifiedOnly", "1");
  return p.toString();
}
