"use client";

import type { Industry } from "@/data/suppliers";
import { industries } from "@/data/suppliers";

type SupplierFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  selectedIndustry: Industry | "All";
  onIndustryChange: (industry: Industry | "All") => void;
};

export default function SupplierFilters({
  search,
  onSearchChange,
  selectedIndustry,
  onIndustryChange,
}: SupplierFiltersProps) {
  const filters: (Industry | "All")[] = ["All", ...industries];

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="supplier-search" className="sr-only">
          Search suppliers
        </label>
        <input
          id="supplier-search"
          type="search"
          placeholder="Search supplier or industry..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-ink shadow-sm placeholder:text-ink-dim focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((industry) => (
          <button
            key={industry}
            type="button"
            onClick={() => onIndustryChange(industry)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedIndustry === industry
                ? "bg-navy text-white shadow-md"
                : "bg-slate-50 text-ink-muted border border-slate-200 hover:border-navy/30 hover:text-ink"
            }`}
          >
            {industry}
          </button>
        ))}
      </div>
    </div>
  );
}
