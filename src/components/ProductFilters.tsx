"use client";

import { productCategories } from "@/data/products";

export type ProductFilterState = {
  category: string;
  priceMin: string;
  priceMax: string;
  maxDelivery: string;
  country: string;
  minReliability: string;
};

type ProductFiltersProps = {
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
};

export default function ProductFilters({ filters, onChange }: ProductFiltersProps) {
  const update = (key: keyof ProductFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-card">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-dim">
        Filters
      </h2>

      <div className="mt-6 space-y-5">
        <div>
          <label className="text-xs font-medium text-ink-muted">Category</label>
          <select
            value={filters.category}
            onChange={(e) => update("category", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
          >
            <option value="">All categories</option>
            {productCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-muted">Price range (USD)</label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceMin}
              onChange={(e) => update("priceMin", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.priceMax}
              onChange={(e) => update("priceMax", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-muted">Max shipping (days)</label>
          <select
            value={filters.maxDelivery}
            onChange={(e) => update("maxDelivery", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
          >
            <option value="">Any</option>
            <option value="7">≤ 7 days</option>
            <option value="14">≤ 14 days</option>
            <option value="21">≤ 21 days</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-muted">Supplier country</label>
          <select
            value={filters.country}
            onChange={(e) => update("country", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
          >
            <option value="">Any</option>
            <option value="USA">USA</option>
            <option value="France">France</option>
            <option value="Germany">Germany</option>
            <option value="China">China</option>
            <option value="EU">EU</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-muted">Min reliability</label>
          <select
            value={filters.minReliability}
            onChange={(e) => update("minReliability", e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-mustard focus:outline-none"
          >
            <option value="">Any</option>
            <option value="85">≥ 85%</option>
            <option value="90">≥ 90%</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() =>
            onChange({
              category: "",
              priceMin: "",
              priceMax: "",
              maxDelivery: "",
              country: "",
              minReliability: "",
            })
          }
          className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-ink-muted hover:bg-slate-50"
        >
          Reset filters
        </button>
      </div>
    </aside>
  );
}
