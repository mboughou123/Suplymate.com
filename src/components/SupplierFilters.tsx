"use client";

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

const RATING_OPTIONS = [
  { label: "Any rating", value: 0 },
  { label: "4.0+", value: 4.0 },
  { label: "4.5+", value: 4.5 },
];

const REVIEW_OPTIONS = [
  { label: "Any reviews", value: 0 },
  { label: "20+", value: 20 },
  { label: "100+", value: 100 },
  { label: "500+", value: 500 },
];

export default function SupplierFilters({
  state,
  categories,
  countries,
  onChange,
  onReset,
  resultCount,
}: Props) {
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
          placeholder="Search by company, product, city, or country…"
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
            {cat}
          </button>
        ))}
      </div>

      {/* Dropdowns + toggles */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-ink-dim">
          Country
          <select
            value={state.country}
            onChange={(e) => onChange({ country: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          >
            <option value="All">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-ink-dim">
          Minimum rating
          <select
            value={state.minRating}
            onChange={(e) => onChange({ minRating: Number(e.target.value) })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          >
            {RATING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-ink-dim">
          Minimum reviews
          <select
            value={state.minReviews}
            onChange={(e) => onChange({ minReviews: Number(e.target.value) })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-2 focus:ring-cyan/20"
          >
            {REVIEW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-end pb-0.5">
          <span className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink">
            <span className="font-medium">Verified only</span>
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
          <span className="font-semibold text-ink">{resultCount}</span> suppliers
          {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters > 1 ? "s" : ""} active`}
        </p>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-cyan hover:underline"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
