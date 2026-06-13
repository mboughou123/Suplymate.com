"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { MaterialSummary } from "./types";

type Props = {
  materials: MaterialSummary[];
};

export default function MarketTrendsSection({ materials }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-2xl border border-white/8 bg-white/4 p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white">Market trends</h2>
          <p className="text-[11px] text-white/40">Commodity intelligence</p>
        </div>
        <Link
          href="/price-charts"
          className="text-[11px] font-medium text-gold hover:underline"
        >
          Full charts
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {materials.slice(0, 6).map((m, i) => {
          const up = m.dailyChange >= 0;
          const spark = m.history.slice(-8);
          const min = Math.min(...spark);
          const max = Math.max(...spark);
          const range = max - min || 1;
          const points = spark
            .map((v, idx) => {
              const x = (idx / (spark.length - 1)) * 40;
              const y = 18 - ((v - min) / range) * 14;
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-white/6 bg-white/3 p-3 transition hover:border-white/12"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-white">{m.name}</p>
                  <p className="text-[10px] text-white/35">{m.symbol}</p>
                </div>
                <svg viewBox="0 0 40 20" className="h-5 w-12" aria-hidden>
                  <polyline
                    fill="none"
                    stroke={up ? "#34D399" : "#F87171"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    points={points}
                  />
                </svg>
              </div>
              <p className="mt-2 text-sm font-bold text-white">
                {m.currentPrice}{" "}
                <span className="text-[10px] font-normal text-white/35">
                  {m.unit}
                </span>
              </p>
              <div className="mt-1 flex items-center gap-1">
                {up ? (
                  <TrendingUp className="h-3 w-3 text-emerald-400" aria-hidden />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-400" aria-hidden />
                )}
                <span
                  className={`text-[11px] font-semibold ${
                    up ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {up ? "+" : ""}
                  {m.dailyChange}%
                </span>
                <span className="text-[10px] text-white/30">· {m.signal}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
