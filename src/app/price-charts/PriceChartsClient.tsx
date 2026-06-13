"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Material } from "@/data/materials";
import MarketSummaryCard from "@/components/MarketSummaryCard";
import PriceAlertForm from "@/components/PriceAlertForm";

const PriceChart = dynamic(() => import("@/components/PriceChart"), {
  loading: () => (
    <div className="glass-card h-[360px] animate-pulse p-6">
      <div className="h-6 w-40 rounded bg-slate-100" />
      <div className="mt-6 h-[260px] rounded-xl bg-slate-50" />
    </div>
  ),
});

type Props = {
  initialMaterials: Material[];
};

export default function PriceChartsClient({ initialMaterials }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(initialMaterials[0]?.id ?? "steel");

  const filtered = initialMaterials.filter((m) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.id.includes(q);
  });

  const selected =
    initialMaterials.find((m) => m.id === selectedId) ?? initialMaterials[0];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <input
          type="search"
          placeholder="Search material: steel, copper, aluminum, oil…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm lg:hidden"
        />
        {selected && <PriceChart material={selected} />}
      </div>

      <aside className="space-y-6">
        <div className="hidden lg:block rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-card max-h-[480px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-ink mb-3">Materials</h3>
          <div className="space-y-2">
            {filtered.map((m) => (
              <MarketSummaryCard
                key={m.id}
                material={m}
                selected={m.id === selectedId}
                onClick={() => setSelectedId(m.id)}
              />
            ))}
          </div>
        </div>

        <div className="lg:hidden grid gap-2 sm:grid-cols-2">
          {filtered.map((m) => (
            <MarketSummaryCard
              key={m.id}
              material={m}
              selected={m.id === selectedId}
              onClick={() => setSelectedId(m.id)}
            />
          ))}
        </div>

        <PriceAlertForm materials={initialMaterials} />
      </aside>
    </div>
  );
}
