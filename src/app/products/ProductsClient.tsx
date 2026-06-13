"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import ProductFilters, {
  type ProductFilterState,
} from "@/components/ProductFilters";

const defaultFilters: ProductFilterState = {
  category: "",
  priceMin: "",
  priceMax: "",
  maxDelivery: "",
  country: "",
  minReliability: "",
};

type Props = {
  initialProducts: Product[];
};

export default function ProductsClient({ initialProducts }: Props) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ProductFilterState>(defaultFilters);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialProducts.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false;
      }
      if (filters.category && p.category !== filters.category) return false;
      if (filters.priceMin && p.priceMax < Number(filters.priceMin)) return false;
      if (filters.priceMax && p.priceMin > Number(filters.priceMax)) return false;
      if (filters.maxDelivery && p.bestDeliveryDays > Number(filters.maxDelivery)) {
        return false;
      }
      return true;
    });
  }, [search, filters, initialProducts]);

  return (
    <>
      <div className="mb-8 max-w-2xl">
        <input
          type="search"
          placeholder="Search steel, cables, tubes, packaging…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm shadow-sm focus:border-mustard focus:outline-none focus:ring-2 focus:ring-mustard/20"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <ProductFilters filters={filters} onChange={setFilters} />
        <div>
          <p className="text-sm text-ink-muted mb-6">
            <span className="font-semibold text-ink">{filtered.length}</span> products ·
            from database
          </p>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="py-12 text-center text-ink-dim">No products match your filters.</p>
          )}
        </div>
      </div>
    </>
  );
}
