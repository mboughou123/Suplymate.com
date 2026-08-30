"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Search, Star, TrendingUp } from "lucide-react";
import type { Material } from "@/data/materials";
import MarketSummaryCard from "@/components/MarketSummaryCard";
import PriceAlertForm from "@/components/PriceAlertForm";
import { explainSignal } from "@/lib/market-intelligence";

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
  const t = useTranslations("priceCharts");
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
        <div className="flex items-start gap-3 rounded-xl border border-cyan/20 bg-gradient-to-r from-cyan-soft to-white px-4 py-3.5 text-xs leading-relaxed text-cyan">
          <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{t("provenanceNotice")}</p>
        </div>

        <div className="relative lg:hidden">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
            aria-hidden
          />
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm transition focus:border-cyan/40 focus:outline-none focus:ring-2 focus:ring-cyan/15"
          />
        </div>

        {selected && (
          <>
            <PriceChart material={selected} />
            {signalInfo && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <p className="font-semibold text-ink">{t("signal", { label: signalInfo.label })}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{signalInfo.reason}</p>
                <p className="mt-3 text-[11px] text-ink-dim">
                  {t("sourceUpdated", {
                    source: signalInfo.source,
                    date: signalInfo.lastUpdated,
                  })}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <aside className="space-y-6">
        <div className="hidden max-h-[520px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-card lg:block">
          <div className="relative mb-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
              aria-hidden
            />
            <input
              type="search"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm transition focus:border-cyan/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan/15"
            />
          </div>
          <h2 className="mb-3 text-sm font-semibold text-ink">{t("materials")}</h2>
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
                  className="absolute right-2 top-2 rounded-lg p-1.5 text-ink-dim transition hover:bg-slate-100 hover:text-cyan"
                  aria-label={
                    watchlist.includes(m.id)
                      ? t("removeFromWatchlist")
                      : t("addToWatchlist")
                  }
                >
                  <Star
                    className={`h-4 w-4 ${watchlist.includes(m.id) ? "fill-cyan text-cyan" : ""}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
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
