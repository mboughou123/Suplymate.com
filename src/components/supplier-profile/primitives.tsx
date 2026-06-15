"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { ReactNode } from "react";

/* Shared, premium UI primitives for the supplier profile sections. */

export const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      {icon && (
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan/10 to-teal/10 text-cyan">
          {icon}
        </span>
      )}
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan">
            {eyebrow}
          </p>
        )}
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>
        )}
      </div>
    </div>
  );
}

export function AnimatedBar({
  value,
  max = 100,
  color = "cyan",
  height = "h-2",
}: {
  value: number;
  max?: number;
  color?: "cyan" | "teal" | "emerald" | "gold" | "amber" | "rose";
  height?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colors: Record<string, string> = {
    cyan: "from-cyan to-cyan-glow",
    teal: "from-teal to-teal-glow",
    emerald: "from-emerald-500 to-emerald-400",
    gold: "from-gold to-gold-light",
    amber: "from-amber-500 to-amber-400",
    rose: "from-rose-500 to-rose-400",
  };
  return (
    <div className={`w-full overflow-hidden rounded-full bg-slate-100 ${height}`}>
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${colors[color]}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export function Sparkline({
  data,
  color = "#0284C7",
  className = "h-10 w-full",
  fill = true,
}: {
  data: number[];
  color?: string;
  className?: string;
  fill?: boolean;
}) {
  if (!data.length) return null;
  const w = 100;
  const h = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <polygon points={area} fill={`url(#${gid})`} />}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function StarRating({
  rating,
  size = "h-4 w-4",
}: {
  rating: number;
  size?: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${
            i <= Math.round(rating)
              ? "fill-mustard text-mustard"
              : "fill-slate-200 text-slate-200"
          }`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function RadialScore({
  value,
  label,
  size = 132,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  const tone = value >= 82 ? "#059669" : value >= 68 ? "#0284C7" : "#CBA351";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tracking-tight text-ink">{value}</span>
        {label && <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-dim">{label}</span>}
      </div>
    </div>
  );
}
