"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MaterialSummary } from "./types";

type Props = {
  materials: MaterialSummary[];
};

export default function MarketTrendsSection({ materials }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-ink">Market trends</h2>
          <p className="text-[11px] text-ink-dim">Commodity price intelligence</p>
        </div>
        <Link
          href="/price-charts"
          className="text-[11px] font-semibold text-ink-muted transition hover:text-gold"
        >
          Full charts
        </Link>
      </div>

      {materials.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.slice(0, 6).map((m) => {
            const up = m.dailyChange >= 0;
            const spark = m.history.slice(-8);
            const min = Math.min(...spark);
            const max = Math.max(...spark);
            const range = max - min || 1;
            const points = spark
              .map((v, idx) => {
                const x = (idx / (spark.length - 1 || 1)) * 40;
                const y = 18 - ((v - min) / range) * 14;
                return `${x},${y}`;
              })
              .join(" ");

            return (
              <div
                key={m.id}
                className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-gold/40"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink">{m.name}</p>
                    <p className="text-[10px] text-ink-dim">{m.symbol}</p>
                  </div>
                  <svg viewBox="0 0 40 20" className="h-5 w-12" aria-hidden>
                    <polyline
                      fill="none"
                      stroke={up ? "#059669" : "#DC2626"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      points={points}
                    />
                  </svg>
                </div>
                <p className="mt-2 text-sm font-bold text-ink">
                  {m.currentPrice}{" "}
                  <span className="text-[10px] font-normal text-ink-dim">{m.unit}</span>
                </p>
                <div className="mt-1 flex items-center gap-1">
                  {up ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" aria-hidden />
                  )}
                  <span
                    className={`text-[11px] font-semibold ${
                      up ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {up ? "+" : ""}
                    {m.dailyChange}%
                  </span>
                  <span className="text-[10px] text-ink-dim">· {m.signal}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-xs text-ink-dim">Not enough data yet.</p>
      )}
    </section>
  );
}
