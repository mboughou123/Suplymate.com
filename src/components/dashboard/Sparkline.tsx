type Props = {
  values: number[];
  up: boolean;
  className?: string;
  points?: number;
  /** Stable per-instance id so gradient defs don't collide when several render. */
  uid?: string;
};

/** Tiny inline trend line (no deps, server-renderable). */
export default function Sparkline({
  values,
  up,
  className = "h-5 w-12",
  points = 10,
  uid,
}: Props) {
  const spark = values.slice(-points);
  if (spark.length < 2) return <span className={className} aria-hidden />;

  const min = Math.min(...spark);
  const max = Math.max(...spark);
  const range = max - min || 1;
  const w = 48;
  const h = 20;
  const coords = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * w;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const stroke = up ? "#047857" : "#B91C1C";
  const fillId = `spark-${uid ?? spark.map((v) => Math.round(v)).join("-")}-${up ? "u" : "d"}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#${fillId})`}
        points={`0,${h} ${coords.join(" ")} ${w},${h}`}
      />
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(" ")}
      />
    </svg>
  );
}
