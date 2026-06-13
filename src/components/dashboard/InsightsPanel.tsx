"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Brain,
  DollarSign,
} from "lucide-react";
import type { MaterialSummary } from "./types";

const TOP_SUPPLIERS = [
  { name: "Atlas Steel Supplier", score: 92, region: "Houston, USA" },
  { name: "VoltLine Cabling", score: 89, region: "Rotterdam, EU" },
  { name: "BuildPro Matériaux", score: 87, region: "Lyon, France" },
];

type Props = {
  materials: MaterialSummary[];
};

export default function InsightsPanel({ materials }: Props) {
  const topMaterial = materials[0];

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
          Top suppliers
        </h3>
        <ul className="mt-3 space-y-2.5">
          {TOP_SUPPLIERS.map((s, i) => (
            <li key={s.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-[10px] font-bold text-gold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-white">{s.name}</p>
                  <p className="text-[10px] text-white/35">{s.region}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-bold text-emerald-400">
                {s.score}%
              </span>
            </li>
          ))}
        </ul>
        <Link
          href="/suppliers"
          className="mt-3 block text-center text-[11px] font-medium text-gold hover:underline"
        >
          View all suppliers
        </Link>
      </div>

      {topMaterial && (
        <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-cyan-glow" aria-hidden />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
              Commodity spotlight
            </h3>
          </div>
          <p className="mt-2 text-lg font-bold text-white">{topMaterial.name}</p>
          <p className="text-sm text-white/55">
            {topMaterial.currentPrice} {topMaterial.unit}
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${
              topMaterial.dailyChange >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {topMaterial.dailyChange >= 0 ? "+" : ""}
            {topMaterial.dailyChange}% today · {topMaterial.signal}
          </p>
          <Link
            href="/price-charts"
            className="mt-3 block text-[11px] font-medium text-gold hover:underline"
          >
            Open price charts
          </Link>
        </div>
      )}

      <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-ai-glow" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">
              AI confidence
            </span>
          </div>
          <span className="text-lg font-bold text-white">94%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "94%" }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full rounded-full bg-gradient-to-r from-gold via-ai-glow to-cyan"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: TrendingUp, label: "Market", value: "Rising", color: "text-emerald-400" },
          { icon: AlertTriangle, label: "Risk", value: "Low", color: "text-emerald-400" },
          { icon: MapPin, label: "Top region", value: "EU", color: "text-gold" },
          { icon: Building2, label: "Verified", value: "89%", color: "text-cyan-glow" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/6 bg-white/3 p-3"
          >
            <item.icon className="h-3.5 w-3.5 text-white/35" aria-hidden />
            <p className="mt-1.5 text-[10px] text-white/35">{item.label}</p>
            <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>
    </motion.aside>
  );
}
