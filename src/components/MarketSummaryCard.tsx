import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Material } from "@/data/materials";

type MarketSummaryCardProps = {
  material: Material;
  selected?: boolean;
  onClick?: () => void;
};

function ChangeValue({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}
    >
      {positive ? (
        <TrendingUp className="h-3 w-3" aria-hidden />
      ) : (
        <TrendingDown className="h-3 w-3" aria-hidden />
      )}
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function SignalBadge({ signal }: { signal: Material["signal"] }) {
  const config = {
    "Buy now": {
      cls: "bg-emerald-100 text-emerald-800 border-emerald-200",
      Icon: TrendingUp,
    },
    Wait: { cls: "bg-amber-100 text-amber-800 border-amber-200", Icon: Minus },
    Monitor: { cls: "bg-blue-100 text-blue-800 border-blue-200", Icon: TrendingDown },
  } as const;
  const { cls, Icon } = config[signal];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {signal}
    </span>
  );
}

export default function MarketSummaryCard({
  material,
  selected,
  onClick,
}: MarketSummaryCardProps) {
  const className = `w-full rounded-xl border p-4 text-left transition ${
    selected
      ? "border-mustard bg-mustard/15/50 shadow-md"
      : "border-slate-200 bg-slate-50 hover:border-cyan/40 hover:shadow-sm"
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-ink">{material.name}</span>
        <SignalBadge signal={material.signal} />
      </div>
      <p className="mt-2 text-lg font-bold text-ink">
        ${material.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        <span className="ml-1 text-xs font-normal text-ink-dim">
          {material.unit.replace("USD/", "")}
        </span>
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-ink-dim">Daily</p>
          <ChangeValue value={material.dailyChange} />
        </div>
        <div>
          <p className="text-ink-dim">Monthly</p>
          <ChangeValue value={material.monthlyChange} />
        </div>
        <div>
          <p className="text-ink-dim">Yearly</p>
          <ChangeValue value={material.yearlyChange} />
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
