"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { INDUSTRIES } from "@/data/industries";
import SupplierCard from "@/components/SupplierCard";
import type { ListingSupplier } from "@/lib/supplier-listing";
import SupplierCardSkeleton from "@/components/SupplierCardSkeleton";
import SupplierFilters, {
  type SupplierFilterState,
} from "@/components/SupplierFilters";
import { Loader2, SearchX } from "lucide-react";
import {
  EMPTY_SUPPLIER_FILTERS,
  buildDirectoryQuery,
  shouldFetchDirectoryOnFilterChange,
  type SupplierDirectoryFacets,
} from "@/lib/supplier-directory";

type Props = {
  initialItems: ListingSupplier[];
  initialTotal: number;
  initialHasMore: boolean;
  pageSize: number;
  facets: SupplierDirectoryFacets;
};

export default function SuppliersClient({
  initialItems,
  initialTotal,
  initialHasMore,
  pageSize,
  facets,
}: Props) {
  const t = useTranslations("suppliers");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState<ListingSupplier[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SupplierFilterState>(EMPTY_SUPPLIER_FILTERS);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const previousFiltersRef = useRef<SupplierFilterState | null>(null);
  const activeFiltersRef = useRef<SupplierFilterState>(EMPTY_SUPPLIER_FILTERS);

  const fetchPage = useCallback(
    async (f: SupplierFilterState, nextPage: number, replace: boolean) => {
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await fetch(`/api/suppliers/directory?${buildDirectoryQuery(f, nextPage, pageSize)}`);
        if (!res.ok) throw new Error("bad response");
        const data = (await res.json()) as {
          items: ListingSupplier[];
          total: number;
          hasMore: boolean;
        };
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch {
        if (replace) {
          setItems([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize]
  );

  // Deep link from the Solutions menu: `/suppliers?industry=<id>` pre-selects
  // the matching directory category (or falls back to a text search). Read from
  // window.location so this statically rendered page needs no Suspense boundary.
  useEffect(() => {
    const industryId = new URLSearchParams(window.location.search).get("industry");
    if (!industryId) return;
    const industry = INDUSTRIES.find((i) => i.id === industryId);
    if (!industry) return;
    const category = industry.legacyCategories.find((c) => facets.categories.includes(c));
    setFilters((f) => (category ? { ...f, category } : { ...f, search: industry.name }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const previous = previousFiltersRef.current;
      previousFiltersRef.current = filters;
      if (!shouldFetchDirectoryOnFilterChange({ previous, next: filters })) {
        return;
      }
      activeFiltersRef.current = filters;
      fetchPage(filters, 1, true);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function patch(p: Partial<SupplierFilterState>) {
    setFilters((f) => ({ ...f, ...p }));
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  const compareHref = useMemo(
    () => `/suppliers/compare?ids=${compareIds.join(",")}`,
    [compareIds]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setCompareMode((m) => !m);
            if (compareMode) setCompareIds([]);
          }}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            compareMode
              ? "border-cyan bg-cyan/10 text-cyan"
              : "border-slate-200 text-ink-muted hover:border-cyan/40"
          }`}
        >
          {compareMode ? t("exitCompareMode") : t("compareSuppliers")}
        </button>
        {compareMode && compareIds.length >= 2 && (
          <Link
            href={compareHref}
            className="rounded-lg bg-cyan px-4 py-1.5 text-sm font-semibold text-white hover:bg-cyan/90"
          >
            {t("compareSelected", { count: compareIds.length })}
          </Link>
        )}
        {compareMode && (
          <span className="text-xs text-ink-dim">{t("selectSuppliersHint")}</span>
        )}
      </div>

      <SupplierFilters
        state={filters}
        categories={facets.categories}
        countries={facets.countries}
        onChange={patch}
        onReset={() => setFilters(EMPTY_SUPPLIER_FILTERS)}
        resultCount={total}
      />

      {loading ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SupplierCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-ink-dim">
          <SearchX className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
          <p className="font-semibold text-ink">{t("noMatchTitle")}</p>
          <p className="mt-1 text-sm">{t("noMatchSubtitle")}</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((supplier, index) => (
              <div key={supplier.id} id={supplier.id} className="relative">
                {compareMode && (
                  <label className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-xs shadow-sm">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(supplier.id)}
                      onChange={() => toggleCompare(supplier.id)}
                      disabled={!compareIds.includes(supplier.id) && compareIds.length >= 4}
                    />
                    {tCommon("compare")}
                  </label>
                )}
                <SupplierCard supplier={supplier} priority={page === 1 && index === 0} />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => fetchPage(activeFiltersRef.current, page + 1, false)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-cyan/40 hover:text-ink disabled:opacity-50"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {tCommon("showMore")}
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-ink-dim">
            {t("pageInfo", {
              current: page,
              total: totalPages,
              shown: items.length,
              totalResults: total,
            })}
          </p>
        </>
      )}
    </>
  );
}
