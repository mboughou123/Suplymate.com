"use client";

import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type SupplierFilterState = {
  search: string;
  category: string;
  country: string;
  minRating: number;
  minReviews: number;
  verifiedOnly: boolean;
};

type Props = {
  state: SupplierFilterState;
  categories: string[];
  countries: string[];
  onChange: (patch: Partial<SupplierFilterState>) => void;
  onReset: () => void;
  resultCount: number;
};

const RATING_VALUES = [0, 4.0, 4.5] as const;
const REVIEW_VALUES = [0, 20, 100, 500] as const;

export default function SupplierFilters({
  state,
  categories,
  countries,
  onChange,
  onReset,
  resultCount,
}: Props) {
  const t = useTranslations("suppliers");
  const tCommon = useTranslations("common");

  const ratingOptions = [
    { label: t("anyRating"), value: 0 },
    ...RATING_VALUES.filter((v) => v > 0).map((value) => ({
      label: `${value}+`,
      value,
    })),
  ];

  const reviewOptions = [
    { label: t("anyReviews"), value: 0 },
    ...REVIEW_VALUES.filter((v) => v > 0).map((value) => ({
      label: `${value}+`,
      value,
    })),
  ];

  const activeFilters =
    (state.category !== "All" ? 1 : 0) +
    (state.country !== "All" ? 1 : 0) +
    (state.minRating > 0 ? 1 : 0) +
    (state.minReviews > 0 ? 1 : 0) +
    (state.verifiedOnly ? 1 : 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
          aria-hidden
        />
        <input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={state.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-ink placeholder:text-ink-dim focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
        />
      </div>

      {/* Category chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {["All", ...categories].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange({ category: cat })}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              state.category === cat
                ? "bg-navy text-white shadow-sm"
                : "border border-slate-200 bg-white text-ink-muted hover:border-navy/30 hover:text-ink"
            }`}
          >
            {cat === "All" ? tCommon("all") : cat}
          </button>
        ))}
      </div>

      {/* Dropdowns + toggles */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-dim">
          {t("country")}
          <select
            value={state.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          >
            <option value="All">{t("allCountries")}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-ink-dim">
          {t("minimumRating")}
          <select
            value={state.minRating}
            onChange={(e) => onChange({ minRating: Number(e.target.value) })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          >
            {ratingOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-ink-dim">
          {t("minimumReviews")}
          <select
            value={state.minReviews}
            onChange={(e) => onChange({ minReviews: Number(e.target.value) })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          >
            {reviewOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end pb-0.5">
          <span className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink">
            <span className="font-medium">{t("verifiedOnly")}</span>
            <input
              type="checkbox"
              checked={state.verifiedOnly}
              onChange={(e) => onChange({ verifiedOnly: e.target.checked })}
              className="h-4 w-4 accent-emerald-600"
            />
          </span>
        </label>
      </div>

      {/* Footer row */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="flex items-center gap-1.5 text-xs text-ink-dim">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          {t("suppliersFound", { count: resultCount })}
          {activeFilters > 0 && ` · ${t("activeFilters", { count: activeFilters })}`}
        </p>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
