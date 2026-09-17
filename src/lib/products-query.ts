export type ProductListFilters = {
  search: string;
  category: string;
  supplierId: string;
  country: string;
  verifiedOnly: boolean;
  hasPrice: boolean;
};

export const EMPTY_PRODUCT_FILTERS: ProductListFilters = {
  search: "",
  category: "",
  supplierId: "",
  country: "",
  verifiedOnly: false,
  hasPrice: false,
};

export const PRODUCT_LIST_PAGE_SIZE = 12;

export function productFiltersAreDefault(f: ProductListFilters): boolean {
  return (
    !f.search.trim() &&
    !f.category &&
    !f.supplierId &&
    !f.country &&
    !f.verifiedOnly &&
    !f.hasPrice
  );
}

/**
 * The products page already SSRs page 1 of the default query. Re-fetching
 * that same page on mount costs a dynamic TTFB on phones for no new data.
 */
export function shouldFetchProductsOnFilterChange(opts: {
  previous: ProductListFilters | null;
  next: ProductListFilters;
}): boolean {
  if (opts.previous === null && productFiltersAreDefault(opts.next)) return false;
  return true;
}
