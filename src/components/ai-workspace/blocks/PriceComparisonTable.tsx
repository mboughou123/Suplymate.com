"use client";

import { Link } from "@/i18n/navigation";
import { TrendingDown, TrendingUp, Minus, Info } from "lucide-react";
import type { PriceRow } from "@/lib/ai/aiService";
import { glass } from "@/components/ai-workspace/types";

function Change({ value }: { value: number }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const tone = value > 0 ? "text-emerald-300" : value < 0 ? "text-red-300" : "text-white/50";
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

export default function PriceComparisonTable({ rows }: { rows: PriceRow[] }) {
  const anyReference = rows.some((r) => !r.isLive);
  return (
    <div className={`${glass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-white/45">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 font-semibold">Material</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">24h</th>
              <th className="px-4 py-3 font-semibold">30d</th>
              <th className="px-4 py-3 font-semibold">Signal</th>
              <th className="px-4 py-3 font-semibold">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`/materials?m=${r.id}`} className="font-medium text-white hover:text-cyan-glow">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-white/90">
                  {r.currency === "USD" ? "$" : `${r.currency} `}
                  {r.price.toLocaleString(undefined, { maximumFractionDigits: r.price < 10 ? 3 : 0 })}
                  <span className="text-xs text-white/45"> {r.unit.replace(/^USD\//, "/")}</span>
                </td>
                <td className="px-4 py-3">
                  {r.cadence === "monthly" ? (
                    <span className="text-white/35" title="Monthly benchmark — no daily quote">—</span>
                  ) : (
                    <Change value={r.dailyChange} />
                  )}
                </td>
                <td className="px-4 py-3">
                  <Change value={r.monthlyChange} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.signal === "Buy now"
                        ? "bg-emerald-400/15 text-emerald-300"
                        : r.signal === "Wait"
                          ? "bg-amber-400/15 text-amber-200"
                          : "bg-white/10 text-white/70"
                    }`}
                  >
                    {r.signal}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className={r.isLive ? "text-cyan-glow" : "text-white/45"} title={r.sourceLabel}>
                    {r.isLive ? r.source : "reference"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {anyReference && (
        <p className="flex items-start gap-2 border-t border-white/10 px-4 py-2.5 text-[11px] text-white/50">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          “Reference” rows are indicative seed series, not live quotes. Connect a pricing provider to replace them.
        </p>
      )}
    </div>
  );
}
