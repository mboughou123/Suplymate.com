"use client";

import type { MatchBreakdown } from "@/lib/ai/supplier-matching";

const ORDER: { key: keyof MatchBreakdown; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "delivery", label: "Delivery" },
  { key: "quality", label: "Quality" },
  { key: "location", label: "Location" },
  { key: "trust", label: "Trust" },
];

export default function MatchScoreBars({ breakdown, compact = false }: { breakdown: MatchBreakdown; compact?: boolean }) {
  return (
    <dl className={`grid gap-1.5 ${compact ? "text-[11px]" : "text-xs"}`}>
      {ORDER.map(({ key, label }) => {
        const v = breakdown[key];
        return (
          <div key={key} className="grid grid-cols-[4.5rem_1fr_2.25rem] items-center gap-2">
            <dt className="text-white/55">{label}</dt>
            <dd className="h-1.5 overflow-hidden rounded-full bg-white/10">
              {v != null ? (
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-cyan to-cyan-glow transition-[width] duration-700 ease-cinema"
                  style={{ width: `${v}%` }}
                />
              ) : (
                <span className="block h-full w-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0_4px,transparent_4px_8px)]" />
              )}
            </dd>
            <dd className={`text-right tabular-nums ${v != null ? "text-white/85" : "text-white/35"}`}>
              {v != null ? v : "n/a"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
