"use client";

import Link from "next/link";
import { BadgeCheck, DollarSign, Factory } from "lucide-react";
import type { MaterialSummary, TopSupplier } from "./types";

type Props = {
  materials: MaterialSummary[];
  topSuppliers: TopSupplier[];
};

export default function InsightsPanel({ materials, topSuppliers }: Props) {
  const topMaterial = materials[0];

  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-dim">
          Top suppliers
        </h3>
        {topSuppliers.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {topSuppliers.map((s, i) => (
              <li key={`${s.id}-${i}`} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-[10px] font-bold text-gold">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/supplier/${s.id}`}
                      className="flex items-center gap-1 truncate text-xs font-semibold text-ink hover:text-gold"
                    >
                      <span className="truncate">{s.name}</span>
                      {s.verified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                      )}
                    </Link>
                    {s.location && (
                      <p className="truncate text-[10px] text-ink-dim">{s.location}</p>
                    )}
                  </div>
                </div>
                {s.score != null && (
                  <span className="shrink-0 text-xs font-bold text-ink-muted">
                    {s.score}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-ink-dim">Not enough data yet.</p>
        )}
        <Link
          href="/suppliers"
          className="mt-3 block text-center text-[11px] font-semibold text-ink-muted transition hover:text-gold"
        >
          View all suppliers
        </Link>
      </div>

      {topMaterial ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gold" aria-hidden />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-dim">
              Commodity spotlight
            </h3>
          </div>
          <p className="mt-2 text-lg font-bold text-ink">{topMaterial.name}</p>
          <p className="text-sm text-ink-muted">
            {topMaterial.currentPrice} {topMaterial.unit}
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${
              topMaterial.dailyChange >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {topMaterial.dailyChange >= 0 ? "+" : ""}
            {topMaterial.dailyChange}% today · {topMaterial.signal}
          </p>
          <Link
            href="/price-charts"
            className="mt-3 block text-[11px] font-semibold text-ink-muted transition hover:text-gold"
          >
            Open price charts
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-ink-dim" aria-hidden />
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-dim">
              Commodity spotlight
            </h3>
          </div>
          <p className="mt-2 text-xs text-ink-dim">Not enough data yet.</p>
        </div>
      )}
    </aside>
  );
}
