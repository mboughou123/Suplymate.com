"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, Loader2, PackageX } from "lucide-react";
import PublicProductCard from "@/components/PublicProductCard";
import type {
  PublicProductCard as PublicProduct,
  CatalogueFacets,
} from "@/lib/public-products";

type Props = {
  initialItems: PublicProduct[];
  initialTotal: number;
  initialHasMore: boolean;
  pageSize: number;
  facets: CatalogueFacets;
};

type Filters = {
  search: string;
  category: string;
  supplierId: string;
  country: string;
  verifiedOnly: boolean;
  hasPrice: boolean;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  category: "",
  supplierId: "",
  country: "",
  verifiedOnly: false,
  hasPrice: false,
};

function buildQuery(f: Filters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  if (f.search.trim()) p.set("search", f.search.trim());
  if (f.category) p.set("category", f.category);
  if (f.supplierId) p.set("supplierId", f.supplierId);
  if (f.country) p.set("country", f.country);
  if (f.verifiedOnly) p.set("verifiedOnly", "1");
  if (f.hasPrice) p.set("hasPrice", "1");
  return p.toString();
}

function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="h-44 w-full animate-pulse bg-slate-200" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-12 w-full animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-auto flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export default function ProductsClient({
  initialItems,
  initialTotal,
  initialHasMore,
  pageSize,
  facets,
}: Props) {
  const [items, setItems] = useState<PublicProduct[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(false);

  // Track the "active" filter set we're paginating against to avoid races.
  const activeFiltersRef = useRef<Filters>(EMPTY_FILTERS);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (f: Filters, nextPage: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products?${buildQuery(f, nextPage, pageSize)}`);
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as {
          items: PublicProduct[];
          total: number;
          hasMore: boolean;
        };
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch {
        setError("Could not load products. Please try again.");
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    },
    [pageSize]
  );

  // Debounced reload whenever filters change.
  useEffect(() => {
    const handle = setTimeout(() => {
      activeFiltersRef.current = filters;
      setInitialLoad(true);
      fetchPage(filters, 1, true);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Infinite scroll via IntersectionObserver.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          fetchPage(activeFiltersRef.current, page + 1, false);
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchPage]);

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.supplierId ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.hasPrice ? 1 : 0);

  return (
    <>
      {/* Search */}
      <div className="mb-8 max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            type="search"
            placeholder="Search steel, cables, tubes, packaging…"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm shadow-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-card lg:self-start">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-dim">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-ink-muted">Category</label>
              <select
                value={filters.category}
                onChange={(e) => update("category", e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
              >
                <option value="">All categories</option>
                {facets.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted">Supplier</label>
              <select
                value={filters.supplierId}
                onChange={(e) => update("supplierId", e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
              >
                <option value="">All suppliers</option>
                {facets.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted">Supplier country</label>
              <select
                value={filters.country}
                onChange={(e) => update("country", e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
              >
                <option value="">Any country</option>
                {facets.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) => update("verifiedOnly", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
              />
              Verified suppliers only
            </label>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={filters.hasPrice}
                onChange={(e) => update("hasPrice", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
              />
              Public price available
            </label>

            {(activeFilterCount > 0 || filters.search) && (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-ink-muted hover:bg-white"
              >
                Reset filters
              </button>
            )}
          </div>
        </aside>

        {/* Results */}
        <div>
          <p className="mb-6 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{total.toLocaleString()}</span>{" "}
            {total === 1 ? "product" : "products"}
            {activeFilterCount > 0 ? " match your filters" : ""}
          </p>

          {error && (
            <div className="mb-6 flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{error}</span>
              <button
                onClick={() => fetchPage(activeFiltersRef.current, 1, true)}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {initialLoad ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
              <PackageX className="h-10 w-10 text-slate-300" aria-hidden />
              <p className="mt-3 font-semibold text-ink">No products found</p>
              <p className="mt-1 text-sm text-ink-muted">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <PublicProductCard key={item.id} data={item} />
                ))}
              </div>

              {/* Infinite-scroll sentinel + loader */}
              <div ref={sentinelRef} className="h-10" />
              {loading && !initialLoad && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading more…
                </div>
              )}
              {!hasMore && items.length > 0 && (
                <p className="mt-8 text-center text-xs text-ink-dim">
                  You&rsquo;ve reached the end · {items.length} of {total} shown
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
