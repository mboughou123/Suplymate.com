"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
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
    <div className="glass-card flex h-full flex-col overflow-hidden p-0">
      <div className="shimmer h-44 w-full bg-slate-100" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="shimmer h-4 w-3/4 rounded bg-slate-100" />
        <div className="shimmer h-3 w-1/2 rounded bg-slate-100" />
        <div className="shimmer mt-2 h-12 w-full rounded-xl bg-slate-100" />
        <div className="mt-auto flex gap-2">
          <div className="shimmer h-10 flex-1 rounded-xl bg-slate-100" />
          <div className="shimmer h-10 flex-1 rounded-xl bg-slate-100" />
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
  const t = useTranslations("products");
  const tErrors = useTranslations("errors");
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
        setError(tErrors("generic"));
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
      <div className="mb-8 max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm shadow-card placeholder:text-ink-dim focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="glass-card p-6 lg:self-start">
          <h2 className="eyebrow flex items-center gap-2 text-cyan">
            <SlidersHorizontal className="h-4 w-4" /> {t("filters")}
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="text-xs font-medium text-ink-muted">{t("category")}</label>
              <select
                value={filters.category}
                onChange={(e) => update("category", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              >
                <option value="">{t("allCategories")}</option>
                {facets.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted">{t("supplier")}</label>
              <select
                value={filters.supplierId}
                onChange={(e) => update("supplierId", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              >
                <option value="">{t("allSuppliers")}</option>
                {facets.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-ink-muted">{t("supplierCountry")}</label>
              <select
                value={filters.country}
                onChange={(e) => update("country", e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
              >
                <option value="">{t("anyCountry")}</option>
                {facets.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) => update("verifiedOnly", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
              />
              {t("verifiedSuppliersOnly")}
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={filters.hasPrice}
                onChange={(e) => update("hasPrice", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan focus:ring-cyan"
              />
              {t("publicPriceAvailable")}
            </label>

            {(activeFilterCount > 0 || filters.search) && (
              <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="btn-ghost w-full !py-2">
                {t("resetFilters")}
              </button>
            )}
          </div>
        </aside>

        {/* Results */}
        <div>
          <p className="mb-6 text-sm text-ink-muted">
            {t("productCount", { count: total })}
            {activeFilterCount > 0 ? ` ${t("matchFilters")}` : ""}
          </p>

          {error && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-down/20 bg-down-bg px-4 py-3 text-sm text-down">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => fetchPage(activeFiltersRef.current, 1, true)}
                className="cursor-pointer font-semibold text-down underline-offset-2 hover:underline"
              >
                {t("retry")}
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
            <div className="glass-card flex flex-col items-center justify-center px-6 py-20 text-center">
              <PackageX className="h-10 w-10 text-slate-300" aria-hidden />
              <p className="mt-3 font-display text-heading-sm text-ink">{t("noProductsTitle")}</p>
              <p className="mt-1 text-sm text-ink-muted">{t("noProductsSubtitle")}</p>
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
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("loadingMore")}
                </div>
              )}
              {!hasMore && items.length > 0 && (
                <p className="mt-8 text-center text-xs text-ink-dim">
                  {t("endOfResults", { shown: items.length, total })}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
