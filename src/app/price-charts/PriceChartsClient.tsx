"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Material } from "@/data/materials";
import MarketSummaryCard from "@/components/MarketSummaryCard";
import PriceAlertForm from "@/components/PriceAlertForm";
import { explainSignal } from "@/lib/market-intelligence";
import { Star } from "lucide-react";

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
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : { watchlist: [] }))
      .then((d) => setWatchlist(d.watchlist ?? []))
      .catch(() => {});
  }, []);

  const toggleWatch = async (materialId: string) => {
    const on = watchlist.includes(materialId);
    const res = await fetch(on ? `/api/watchlist?materialId=${materialId}` : "/api/watchlist", {
      method: on ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: on ? undefined : JSON.stringify({ materialId }),
    });
    if (res.ok) {
      setWatchlist((w) => (on ? w.filter((id) => id !== materialId) : [...w, materialId]));
    }
  };

  const filtered = initialMaterials.filter((m) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || m.id.includes(q);
  });

  const selected =
    initialMaterials.find((m) => m.id === selectedId) ?? initialMaterials[0];
  const signalInfo = selected ? explainSignal(selected) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong>Provenance:</strong> Prices and signals are indicative demo series until live market
          feeds are connected. Always confirm with your supplier before large orders.
        </div>
        <input
          type="search"
          placeholder="Search material: steel, copper, aluminum, oil…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm lg:hidden"
        />
        {selected && (
          <>
            <PriceChart material={selected} />
            {signalInfo && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-ink">Signal: {signalInfo.label}</p>
                <p className="mt-1 text-xs text-ink-muted">{signalInfo.reason}</p>
                <p className="mt-2 text-[11px] text-ink-dim">
                  Source: {signalInfo.source} · Updated {signalInfo.lastUpdated}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="space-y-6">
        <div className="hidden lg:block rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-card max-h-[480px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-ink mb-3">Materials</h3>
          <div className="space-y-2">
            {filtered.map((m) => (
              <div key={m.id} className="relative">
                <MarketSummaryCard
                  material={m}
                  selected={m.id === selectedId}
                  onClick={() => setSelectedId(m.id)}
                />
                <button
                  type="button"
                  onClick={() => toggleWatch(m.id)}
                  className="absolute right-2 top-2 rounded p-1 text-ink-dim hover:text-gold"
                  aria-label={watchlist.includes(m.id) ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Star className={`h-4 w-4 ${watchlist.includes(m.id) ? "fill-gold text-gold" : ""}`} />
                </button>
              </div>
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
