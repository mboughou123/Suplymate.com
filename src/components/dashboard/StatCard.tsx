"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  icon: LucideIcon;
  href?: string;
  accent?: "gold" | "cyan" | "emerald" | "violet" | "rose";
  delay?: number;
};

const ACCENTS = {
  gold: "from-gold/20 to-gold/5 text-gold border-gold/15",
  cyan: "from-cyan/15 to-ai-glow/5 text-cyan-glow border-cyan/15",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-400 border-emerald-500/15",
  violet: "from-violet-500/15 to-violet-500/5 text-violet-400 border-violet-500/15",
  rose: "from-rose-500/15 to-rose-500/5 text-rose-400 border-rose-500/15",
};

function MiniChart({ trend = 0 }: { trend?: number }) {
  const pts =
    trend > 0
      ? "0,18 8,14 16,10 24,8 32,4"
      : trend < 0
        ? "0,4 8,8 16,12 24,14 32,18"
        : "0,11 8,10 16,12 24,10 32,11";
  const color = trend > 0 ? "#34D399" : trend < 0 ? "#F87171" : "#D4AF37";
  return (
    <svg viewBox="0 0 32 20" className="h-5 w-10 opacity-70" aria-hidden>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  href,
  accent = "gold",
  delay = 0,
}: Props) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`group rounded-2xl border bg-gradient-to-br p-4 shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm transition hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)] ${ACCENTS[accent]}`}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white/5 text-inherit">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {trend !== undefined && <MiniChart trend={trend} />}
      </div>
      <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
      {sub && (
        <div className="mt-1.5 flex items-center gap-1">
          {trend !== undefined &&
            (trend > 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" aria-hidden />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3 text-rose-400" aria-hidden />
            ) : null)}
          <p className="text-xs text-white/45">{sub}</p>
        </div>
      )}
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}
