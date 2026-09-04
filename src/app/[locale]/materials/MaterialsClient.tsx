"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import { Star, Sparkles, Factory, Info, Database } from "lucide-react";
import type { MaterialWithProvenance } from "@/lib/pricing/pricingService";
import type { PricingStatus } from "@/lib/pricing/types";
import { getCatalogMaterial } from "@/data/material-catalog";
import { INDUSTRIES } from "@/data/industries";
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

type Range = 3 | 6 | 12;

type Props = {
  initialMaterials: MaterialWithProvenance[];
  pricing: PricingStatus;
};

function pct(from: number, to: number): number {
  return from ? ((to - from) / from) * 100 : 0;
}

export default function MaterialsClient({ initialMaterials, pricing }: Props) {
  const t = useTranslations("priceCharts");
  const searchParams = useSearchParams();
  const preselect = searchParams.get("m");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [range, setRange] = useState<Range>(12);
  const [selectedId, setSelectedId] = useState(
    preselect && initialMaterials.some((m) => m.id === preselect) ? preselect : initialMaterials[0]?.id ?? "",
  );
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : { watchlist: [] }))
      .then((d) => setWatchlist(d.watchlist ?? []))
      .catch(() => {});
  }, []);

  const toggleWatch = async (materialId: string) => {
    const on = watchlist.includes(materialId);
    try {
      const res = await fetch(on ? `/api/watchlist?materialId=${materialId}` : "/api/watchlist", {
        method: on ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: on ? undefined : JSON.stringify({ materialId }),
      });
      if (res.ok) setWatchlist((w) => (on ? w.filter((id) => id !== materialId) : [...w, materialId]));
    } catch {
      /* ignore */
    }
  };

  const categories = useMemo(() => {
    const present = new Set(initialMaterials.map((m) => m.category));
    return INDUSTRIES.filter((i) => present.has(i.id));
  }, [initialMaterials]);

  const filtered = initialMaterials.filter((m) => {
    if (category !== "all" && m.category !== category) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const cat = getCatalogMaterial(m.id);
    return m.name.toLowerCase().includes(q) || m.id.includes(q) || (cat?.aliases ?? []).some((a) => a.includes(q));
  });

  const selected = initialMaterials.find((m) => m.id === selectedId) ?? initialMaterials[0];
  const knowledge = selected ? getCatalogMaterial(selected.id) : undefined;
  const signalInfo = selected ? explainSignal(selected) : null;

  const ranged = useMemo(() => {
    if (!selected) return null;
    const history = selected.history.slice(-range);
    return { ...selected, history: history.length >= 2 ? history : selected.history };
  }, [selected, range]);

  const rangeChange = ranged ? pct(ranged.history[0], ranged.history[ranged.history.length - 1]) : 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-xs ${
            pricing.configured ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-cyan/20 bg-cyan-soft text-cyan"
          }`}
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            {pricing.configured
              ? t("liveNotice", { provider: pricing.providerName ?? pricing.provider ?? "provider", minutes: 60 })
              : t("provenanceNotice")}
            {pricing.lastError && <span className="block text-amber-800"> Provider error: {pricing.lastError}</span>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              category === "all" ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-ink-muted hover:border-slate-300"
            }`}
          >
            {t("allCategories")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                category === c.id ? "border-navy bg-navy text-white" : "border-slate-200 bg-white text-ink-muted hover:border-slate-300"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm lg:hidden"
        />

        {selected && ranged && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label={t("currentPrice")} value={`${selected.currency === "USD" ? "$" : selected.currency + " "}${selected.currentPrice.toLocaleString(undefined, { maximumFractionDigits: selected.currentPrice < 10 ? 3 : 0 })}`} sub={selected.unit} />
              <Stat label={t("change24h")} value={`${selected.dailyChange > 0 ? "+" : ""}${selected.dailyChange.toFixed(1)}%`} tone={selected.dailyChange} />
              <Stat label={t("change30d")} value={`${selected.monthlyChange > 0 ? "+" : ""}${selected.monthlyChange.toFixed(1)}%`} tone={selected.monthlyChange} />
              <Stat label={`${t("changeRange")} (${range}M)`} value={`${rangeChange > 0 ? "+" : ""}${rangeChange.toFixed(1)}%`} tone={rangeChange} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-medium">
                {([3, 6, 12] as Range[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`cursor-pointer rounded-md px-3 py-1.5 transition ${range === r ? "bg-navy text-white" : "text-ink-muted hover:text-ink"}`}
                  >
                    {t(`range${r}m` as "range3m" | "range6m" | "range12m")}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold ${
                    selected.isLive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-ink-muted"
                  }`}
                >
                  <Database className="h-3 w-3" aria-hidden />
                  {selected.isLive ? `${t("live")} · ${selected.source}` : t("reference")}
                </span>
                <span className="text-ink-dim">
                  {t("lastUpdated")}: {selected.lastUpdatedAt ? new Date(selected.lastUpdatedAt).toLocaleString() : t("notAvailable")}
                </span>
              </div>
            </div>

            <PriceChart material={ranged} />

            {signalInfo && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-ink">{t("signal", { label: signalInfo.label })}</p>
                <p className="mt-1 text-xs text-ink-muted">{signalInfo.reason}</p>
                <p className="mt-2 text-[11px] text-ink-dim">
                  {t("sourceUpdated", { source: signalInfo.source, date: signalInfo.lastUpdated })}
                </p>
              </div>
            )}

            {knowledge && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-cyan">{t("knowledgeTitle")}</p>
                    <h2 className="mt-1 font-display text-xl font-bold text-ink">{knowledge.name}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{knowledge.summary}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/ai-assistant?q=${encodeURIComponent(`Tell me about ${knowledge.name}: properties, grades, alternatives and price considerations.`)}`} className="btn-accent px-3 py-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                      {t("askAi", { name: knowledge.name })}
                    </Link>
                    <Link href={`/suppliers?q=${encodeURIComponent(knowledge.name)}`} className="btn-secondary px-3 py-2 text-xs">
                      <Factory className="h-3.5 w-3.5" aria-hidden />
                      {t("findSuppliers", { name: knowledge.name })}
                    </Link>
                  </div>
                </div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <KList title={t("properties")} items={knowledge.properties} />
                  <KList title={t("applications")} items={knowledge.applications} />
                  <KList title={t("grades")} items={knowledge.grades ?? []} />
                  <KList title={t("priceDrivers")} items={knowledge.priceDrivers} />
                  <div className="sm:col-span-2">
                    <KList title={t("manufacturing")} items={knowledge.manufacturingNotes} />
                  </div>
                </div>
                {knowledge.alternatives.length > 0 && (
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs">
                    <span className="text-ink-dim">{t("alternatives")}:</span>
                    {knowledge.alternatives.map((a) => {
                      const cat = getCatalogMaterial(a);
                      return cat && initialMaterials.some((m) => m.id === cat.id) ? (
                        <button key={a} type="button" onClick={() => setSelectedId(cat.id)} className="cursor-pointer rounded-md border border-slate-200 px-2 py-1 font-medium text-ink transition hover:border-cyan/50 hover:text-cyan">
                          {cat.name}
                        </button>
                      ) : (
                        <span key={a} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-ink-muted">
                          {cat?.name ?? a}
                        </span>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <aside className="space-y-6">
        <div className="hidden max-h-[560px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-card lg:block">
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <h2 className="mb-3 text-sm font-semibold text-ink">{t("materials")}</h2>
          {filtered.length === 0 && <p className="text-xs text-ink-muted">{t("noMatch")}</p>}
          <div className="space-y-2">
            {filtered.map((m) => (
              <div key={m.id} className="relative">
                <MarketSummaryCard material={m} selected={m.id === selectedId} onClick={() => setSelectedId(m.id)} />
                <button
                  type="button"
                  onClick={() => toggleWatch(m.id)}
                  className="absolute right-2 top-2 cursor-pointer rounded p-1 text-ink-dim hover:text-cyan"
                  aria-label={watchlist.includes(m.id) ? t("removeFromWatchlist") : t("addToWatchlist")}
                >
                  <Star className={`h-4 w-4 ${watchlist.includes(m.id) ? "fill-cyan text-cyan" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
          {filtered.map((m) => (
            <MarketSummaryCard key={m.id} material={m} selected={m.id === selectedId} onClick={() => setSelectedId(m.id)} />
          ))}
        </div>

        <PriceAlertForm materials={initialMaterials} />
      </aside>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: number }) {
  const color = tone === undefined ? "text-ink" : tone > 0 ? "text-up" : tone < 0 ? "text-down" : "text-ink";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

function KList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-dim">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
