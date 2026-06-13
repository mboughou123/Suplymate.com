"use client";

import { useMemo, useState } from "react";
import type { Supplier, Industry } from "@/data/suppliers";
import SupplierCard from "@/components/SupplierCard";
import SupplierFilters from "@/components/SupplierFilters";

type Props = {
  initialSuppliers: Supplier[];
};

export default function SuppliersClient({ initialSuppliers }: Props) {
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | "All">("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return initialSuppliers.filter((s) => {
      const matchIndustry =
        selectedIndustry === "All" || s.industry === selectedIndustry;
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.industry.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.products.some((p) => p.toLowerCase().includes(q));
      return matchIndustry && matchSearch;
    });
  }, [search, selectedIndustry, initialSuppliers]);

  return (
    <>
      <SupplierFilters
        search={search}
        onSearchChange={setSearch}
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
      />

      <p className="mt-8 text-sm text-ink-muted">
        <span className="font-semibold text-ink">{filtered.length}</span> suppliers
        found · loaded from database
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {filtered.map((supplier) => (
          <div key={supplier.id} id={supplier.id}>
            <SupplierCard supplier={supplier} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-ink-dim">
          No suppliers match your search.
        </p>
      )}
    </>
  );
}
