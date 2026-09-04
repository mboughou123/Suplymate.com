"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Supplier } from "@/data/suppliers";
import SupplierCard from "@/components/SupplierCard";
import SupplierCardSkeleton from "@/components/SupplierCardSkeleton";
import SupplierFilters, {
  type SupplierFilterState,
} from "@/components/SupplierFilters";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";

type Props = {
  initialSuppliers: Supplier[];
};

const PAGE_SIZE = 12;

const DEFAULT_FILTERS: SupplierFilterState = {
  search: "",
  category: "All",
  country: "All",
  minRating: 0,
  minReviews: 0,
  verifiedOnly: false,
};

function categoryOf(s: Supplier): string {
  return s.category ?? s.industry;
}

function ratingOf(s: Supplier): number {
  return s.googleRating ?? s.rating ?? 0;
}

function reviewsOf(s: Supplier): number {
  return s.googleReviews ?? s.reviewCount ?? 0;
}

export default function SuppliersClient({ initialSuppliers }: Props) {
  const t = useTranslations("suppliers");
  const tCommon = useTranslations("common");
  const [filters, setFilters] = useState<SupplierFilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  const categories = useMemo(
    () =>
      Array.from(new Set(initialSuppliers.map(categoryOf))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [initialSuppliers]
  );

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          initialSuppliers.map((s) => s.country ?? s.location.split(",").pop()!.trim())
        )
      ).sort((a, b) => a.localeCompare(b)),
    [initialSuppliers]
  );

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    return initialSuppliers
      .filter((s) => {
        if (filters.category !== "All" && categoryOf(s) !== filters.category)
          return false;
        const country = s.country ?? s.location.split(",").pop()!.trim();
        if (filters.country !== "All" && country !== filters.country) return false;
        if (ratingOf(s) < filters.minRating) return false;
        if (reviewsOf(s) < filters.minReviews) return false;
        if (filters.verifiedOnly && !s.verified) return false;
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          categoryOf(s).toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          (s.country ?? "").toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q) ||
          s.products.some((p) => p.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        // Image-bearing suppliers first (empty cards look untrustworthy),
        // then by Suplymate score, then alphabetically.
        const hasImg = (s: Supplier) =>
          s.imageUrl || (s.supplierImages && s.supplierImages.length > 0) ? 1 : 0;
        const img = hasImg(b) - hasImg(a);
        if (img) return img;
        const score =
          (b.score ?? b.reliabilityScore) - (a.score ?? a.reliabilityScore);
        if (score) return score;
        return a.name.localeCompare(b.name);
      });
  }, [filters, initialSuppliers]);

  // Reset to page 1 and show a brief loading state whenever filters change.
  useEffect(() => {
    setPage(1);
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 280);
    return () => clearTimeout(t);
  }, [filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function patch(p: Partial<SupplierFilterState>) {
    setFilters((f) => ({ ...f, ...p }));
  }

  function goToPage(n: number) {
    setPage(n);
    setLoading(true);
    setTimeout(() => setLoading(false), 200);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setCompareMode((m) => !m);
            if (compareMode) setCompareIds([]);
          }}
          className={
            compareMode
              ? "btn-accent !px-4 !py-2 text-sm"
              : "btn-secondary !px-4 !py-2 text-sm"
          }
        >
          {compareMode ? t("exitCompareMode") : t("compareSuppliers")}
        </button>
        {compareMode && compareIds.length >= 2 && (
          <Link href={compareHref} className="btn-primary !px-4 !py-2 text-sm">
            {t("compareSelected", { count: compareIds.length })}
          </Link>
        )}
        {compareMode && (
          <span className="text-xs text-ink-dim">{t("selectSuppliersHint")}</span>
        )}
      </div>

      <SupplierFilters
        state={filters}
        categories={categories}
        countries={countries}
        onChange={patch}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        resultCount={filtered.length}
      />

      {loading ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SupplierCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card mt-10 flex flex-col items-center px-6 py-16 text-center">
          <SearchX className="mb-3 h-10 w-10 text-slate-300" aria-hidden />
          <p className="font-display text-heading-sm text-ink">{t("noMatchTitle")}</p>
          <p className="mt-1 text-sm text-ink-muted">{t("noMatchSubtitle")}</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((supplier) => (
              <div key={supplier.id} id={supplier.id} className="relative">
                {compareMode && (
                  <label className="absolute right-3 top-3 z-10 flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium shadow-card">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(supplier.id)}
                      onChange={() => toggleCompare(supplier.id)}
                      disabled={!compareIds.includes(supplier.id) && compareIds.length >= 4}
                    />
                    {tCommon("compare")}
                  </label>
                )}
                <SupplierCard supplier={supplier} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
                className="btn-ghost !h-9 !px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {tCommon("prev")}
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const n = i + 1;
                // Compact pagination: show first, last, and neighbors.
                if (
                  n !== 1 &&
                  n !== totalPages &&
                  Math.abs(n - safePage) > 1
                ) {
                  if (n === 2 || n === totalPages - 1)
                    return (
                      <span key={n} className="px-1 text-ink-dim">
                        …
                      </span>
                    );
                  return null;
                }
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    className={`h-9 w-9 cursor-pointer rounded-xl text-sm font-semibold transition ${
                      n === safePage
                        ? "bg-navy text-white shadow-card"
                        : "border border-slate-200 bg-white text-ink-muted hover:border-slate-300 hover:bg-slate-50 hover:text-ink"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={safePage === totalPages}
                onClick={() => goToPage(safePage + 1)}
                className="btn-ghost !h-9 !px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {tCommon("next")}
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-ink-dim">
            {t("pageInfo", {
              current: safePage,
              total: totalPages,
              shown: pageItems.length,
              totalResults: filtered.length,
            })}
          </p>
        </>
      )}
    </>
  );
}
