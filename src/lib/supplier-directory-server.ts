import { getSuppliersFromDb } from "@/lib/data-service";
import { toListingSupplier } from "@/lib/supplier-listing";
import {
  EMPTY_SUPPLIER_FILTERS,
  SUPPLIER_LIST_PAGE_SIZE,
  directoryCounts,
  directoryFacets,
  filterAndSortListing,
  paginateListing,
  type SupplierDirectoryFacets,
  type SupplierDirectoryFilters,
} from "@/lib/supplier-directory";
import type { ListingSupplier } from "@/lib/supplier-listing";

export type SupplierDirectoryPage = {
  items: ListingSupplier[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: SupplierDirectoryFacets;
  counts: {
    total: number;
    verified: number;
    countries: number;
  };
};

/** First HTML + /api/suppliers/directory share this so filters stay consistent. */
export async function getPublicSupplierDirectoryPage(opts?: {
  filters?: SupplierDirectoryFilters;
  page?: number;
  pageSize?: number;
}): Promise<SupplierDirectoryPage> {
  const all = (await getSuppliersFromDb()).map(toListingSupplier);
  const filters = opts?.filters ?? EMPTY_SUPPLIER_FILTERS;
  const filtered = filterAndSortListing(all, filters);
  const page = paginateListing(
    filtered,
    opts?.page ?? 1,
    opts?.pageSize ?? SUPPLIER_LIST_PAGE_SIZE
  );
  return {
    ...page,
    facets: directoryFacets(all),
    counts: directoryCounts(all),
  };
}
