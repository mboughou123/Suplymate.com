import type { Entitlements } from "@/lib/permissions";

export type CappedList<T> = {
  items: T[];
  /** Full matching count before the Free cap. */
  total: number;
  hasMore: boolean;
  visibleLimit: number | null;
  lockedCount: number;
};

/**
 * Slice a listing to the Free catalogue cap. `items` must already be the
 * current page. When a cap applies, later pages are empty and infinite-scroll
 * stops — remaining rows are locked behind a paid plan, not listed.
 */
export function applyCatalogueCap<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  limit: number | null | undefined,
): CappedList<T> {
  if (limit == null || limit <= 0) {
    return {
      items,
      total,
      hasMore: page * pageSize < total,
      visibleLimit: null,
      lockedCount: 0,
    };
  }
  const lockedCount = Math.max(0, total - limit);
  const start = (page - 1) * pageSize;
  if (start >= limit) {
    return { items: [], total, hasMore: false, visibleLimit: limit, lockedCount };
  }
  const take = Math.min(items.length, Math.max(0, limit - start));
  return {
    items: items.slice(0, take),
    total,
    hasMore: start + take < limit,
    visibleLimit: limit,
    lockedCount,
  };
}

export function catalogueCapsFor(ent: Entitlements): {
  productLimit: number | null;
  supplierLimit: number | null;
} {
  return {
    productLimit: ent.catalogueProductLimit,
    supplierLimit: ent.catalogueSupplierLimit,
  };
}
