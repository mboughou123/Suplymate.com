"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent?: "gold" | "cyan" | "emerald" | "amber" | "rose";
  trend?: number;
  delay?: number;
};

const ACCENTS = {
  gold: "from-gold/15 to-gold-pale/30 text-gold",
  cyan: "from-cyan/10 to-ai-mist text-cyan",
  emerald: "from-emerald-500/10 to-emerald-50 text-emerald-600",
  amber: "from-amber-500/10 to-amber-50 text-amber-600",
  rose: "from-rose-500/10 to-rose-50 text-rose-600",
};

function MiniSparkline({ trend }: { trend?: number }) {
  const points =
    trend !== undefined
      ? trend > 0
        ? "0,20 10,16 20,12 30,8 40,4"
        : trend < 0
          ? "0,4 10,8 20,12 30,16 40,20"
          : "0,12 10,11 20,13 30,11 40,12"
      : "0,12 10,10 20,14 30,9 40,12";
  const color =
    trend !== undefined
      ? trend > 0
        ? "#059669"
        : trend < 0
          ? "#E11D48"
          : "#94A3B8"
      : "#D4AF37";

  return (
    <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function AiInsightCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "gold",
  trend,
  delay = 0,
}: Props) {
  const TrendIcon =
    trend !== undefined
      ? trend > 0
        ? TrendingUp
        : trend < 0
          ? TrendingDown
          : Minus
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group ai-glass rounded-2xl border border-slate-200/50 p-4 shadow-glass transition hover:border-gold/25 hover:shadow-ai-glow"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${ACCENTS[accent]}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {trend !== undefined && <MiniSparkline trend={trend} />}
      </div>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-ink-dim">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold tracking-tight text-ink">{value}</p>

      {(sub || TrendIcon) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {TrendIcon && (
            <TrendIcon
              className={`h-3.5 w-3.5 ${
                (trend ?? 0) > 0
                  ? "text-emerald-600"
                  : (trend ?? 0) < 0
                    ? "text-rose-500"
                    : "text-ink-dim"
              }`}
              aria-hidden
            />
          )}
          {sub && <p className="text-xs text-ink-dim">{sub}</p>}
        </div>
      )}
    </motion.div>
  );
}
