"use client";

import { useMemo, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Material } from "@/data/materials";

type PriceChartProps = {
  material: Material;
};

const WIDTH = 640;
const HEIGHT = 300;
const PAD = { top: 20, right: 16, bottom: 36, left: 56 };
const CHART_W = WIDTH - PAD.left - PAD.right;
const CHART_H = HEIGHT - PAD.top - PAD.bottom;

// Semantic market colors (see tailwind config: up/down)
const UP = "#047857";
const DOWN = "#B91C1C";

function monthLabels(count: number): string[] {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return fmt.format(d);
  });
}

function formatPrice(v: number, currency: string): string {
  const prefix = currency === "USD" ? "$" : "";
  return (
    prefix +
    v.toLocaleString("en-US", {
      minimumFractionDigits: v < 10 ? 2 : 0,
      maximumFractionDigits: v < 10 ? 2 : 0,
    })
  );
}

/**
 * 12-period material price chart with a fintech-grade treatment: trend-aware
 * up/down color language, labeled axes, subtle solid gridlines, and a
 * crosshair + tooltip that follows the pointer (tap-friendly on touch).
 */
export default function PriceChart({ material }: PriceChartProps) {
  const data = material.history;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { min, max, range, points, labels, trendUp, periodChange } = useMemo(() => {
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    // Pad the domain 6% so the line never touches the frame.
    const pad = (hi - lo || hi * 0.02 || 1) * 0.06;
    const minV = lo - pad;
    const maxV = hi + pad;
    const rangeV = maxV - minV || 1;
    const pts = data.map((v, i) => ({
      x: PAD.left + (i / (data.length - 1)) * CHART_W,
      y: PAD.top + CHART_H - ((v - minV) / rangeV) * CHART_H,
      v,
    }));
    const first = data[0];
    const last = data[data.length - 1];
    return {
      min: minV,
      max: maxV,
      range: rangeV,
      points: pts,
      labels: monthLabels(data.length),
      trendUp: last >= first,
      periodChange: first ? ((last - first) / first) * 100 : 0,
    };
  }, [data]);

  const color = trendUp ? UP : DOWN;
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area = `${PAD.left},${PAD.top + CHART_H} ${line} ${PAD.left + CHART_W},${PAD.top + CHART_H}`;
  const gradientId = `chart-fill-${material.id}-${trendUp ? "up" : "down"}`;

  const locate = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    const idx = Math.round(((x - PAD.left) / CHART_W) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const active = hover !== null ? points[hover] : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-ink">{material.name}</h2>
          <p className="mt-0.5 text-caption text-ink-dim">
            {material.symbol} · 12-month range (indicative)
          </p>
        </div>
        <div className="text-right">
          <p className="text-heading-lg font-bold tabular-nums text-ink">
            {formatPrice(material.currentPrice, material.currency)}
          </p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <span className="text-caption text-ink-dim">{material.unit}</span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold tabular-nums ${
                trendUp ? "bg-up-bg text-up" : "bg-down-bg text-down"
              }`}
            >
              {trendUp ? (
                <TrendingUp className="h-3 w-3" aria-hidden />
              ) : (
                <TrendingDown className="h-3 w-3" aria-hidden />
              )}
              {periodChange >= 0 ? "+" : ""}
              {periodChange.toFixed(1)}% · 12mo
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-6">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto touch-none select-none"
          role="img"
          aria-label={`${material.name} price chart, 12 months, ${
            trendUp ? "up" : "down"
          } ${Math.abs(periodChange).toFixed(1)} percent over the period`}
          onMouseMove={(e) => locate(e.clientX)}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => locate(e.touches[0].clientX)}
          onTouchMove={(e) => locate(e.touches[0].clientX)}
          onTouchEnd={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.14" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines + y-axis price labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PAD.top + CHART_H * (1 - t);
            const val = min + range * t;
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={PAD.left + CHART_W}
                  y2={y}
                  stroke="#EEF2F6"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] tabular-nums"
                >
                  {val.toLocaleString("en-US", {
                    maximumFractionDigits: val < 10 ? 2 : 0,
                  })}
                </text>
              </g>
            );
          })}

          {/* X-axis month labels (every other month to stay uncluttered) */}
          {labels.map((label, i) =>
            i % 2 === 0 ? (
              <text
                key={`${label}-${i}`}
                x={points[i].x}
                y={HEIGHT - 10}
                textAnchor="middle"
                className="fill-slate-400 text-[10px]"
              >
                {label}
              </text>
            ) : null,
          )}

          <polygon points={area} fill={`url(#${gradientId})`} />
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Crosshair + active point */}
          {active && (
            <g>
              <line
                x1={active.x}
                y1={PAD.top}
                x2={active.x}
                y2={PAD.top + CHART_H}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={active.x}
                cy={active.y}
                r={4.5}
                fill="#fff"
                stroke={color}
                strokeWidth={2}
              />
            </g>
          )}

          {/* Latest point marker (resting state) */}
          {!active && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={4.5}
              fill="#fff"
              stroke={color}
              strokeWidth={2}
            />
          )}
        </svg>

        {/* Tooltip */}
        {active && hover !== null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-cardHover"
            style={{
              left: `${(active.x / WIDTH) * 100}%`,
              top: `${(Math.max(active.y - 14, 6) / HEIGHT) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
            role="status"
          >
            <p className="whitespace-nowrap text-caption font-semibold tabular-nums text-ink">
              {formatPrice(active.v, material.currency)}
            </p>
            <p className="whitespace-nowrap text-[10px] text-ink-dim">{labels[hover]}</p>
          </div>
        )}
      </div>
    </div>
  );
}
