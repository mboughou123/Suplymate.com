"use client";

import type { Material } from "@/data/materials";

type PriceChartProps = {
  material: Material;
};

export default function PriceChart({ material }: PriceChartProps) {
  const data = material.history;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 640;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 40, left: 56 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data
    .map((v, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW;
      const y = padding.top + chartH - ((v - min) / range) * chartH;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding.left},${padding.top + chartH} ${points} ${padding.left + chartW},${padding.top + chartH}`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-ink">{material.name}</h3>
          <p className="text-sm text-ink-dim">{material.symbol} · 12-month range (indicative)</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-ink">
            {material.currency === "USD" && "$"}
            {material.currentPrice.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-ink-dim">{material.unit}</p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-6 w-full h-auto"
        role="img"
        aria-label={`Price chart for ${material.name}`}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A017" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + chartH * (1 - t);
          const val = min + range * t;
          return (
            <g key={t}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="#E2EAF0"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px]"
              >
                {val.toFixed(val < 10 ? 2 : 0)}
              </text>
            </g>
          );
        })}
        <polygon points={areaPoints} fill="url(#chartFill)" />
        <polyline
          points={points}
          fill="none"
          stroke="#D4A017"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((v, i) => {
          const x = padding.left + (i / (data.length - 1)) * chartW;
          const y = padding.top + chartH - ((v - min) / range) * chartH;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === data.length - 1 ? 5 : 0}
              fill="#0D3349"
              stroke="#D4A017"
              strokeWidth={2}
            />
          );
        })}
        <text
          x={padding.left + chartW / 2}
          y={height - 8}
          textAnchor="middle"
          className="fill-slate-400 text-[11px]"
        >
          Past 12 periods
        </text>
      </svg>
    </div>
  );
}
