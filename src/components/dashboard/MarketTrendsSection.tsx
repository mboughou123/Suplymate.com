import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TrendingDown, TrendingUp } from "lucide-react";
import DashboardCard from "./DashboardCard";
import Sparkline from "./Sparkline";
import type { MaterialSummary } from "./types";

type Props = {
  materials: MaterialSummary[];
  limit?: number;
};

export default async function MarketTrendsSection({ materials, limit = 6 }: Props) {
  const t = await getTranslations("dashboard");
  const shown = materials.slice(0, limit);
  const buySignals = materials.filter((m) => m.signal === "Buy now").length;

  return (
    <DashboardCard
      title={t("marketTrends")}
      description={
        materials.length > 0 ? t("buyNowSignals", { count: buySignals }) : t("notEnoughData")
      }
      icon={TrendingUp}
      action={shown.length > 0 ? { label: t("openWatch"), href: "/materials" } : undefined}
    >
      {shown.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => {
            const up = m.dailyChange >= 0;
            return (
              <Link
                key={m.id}
                href="/materials"
                className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan/30 hover:shadow-cardHover"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
                    <p className="text-[11px] text-ink-dim">{m.symbol}</p>
                  </div>
                  <Sparkline uid={m.id} values={m.history} up={up} className="h-6 w-14 shrink-0" />
                </div>
                <p className="mt-3 font-display text-heading-sm text-ink">
                  {m.currentPrice.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-ink-dim">{m.unit}</span>
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
                      up ? "text-up" : "text-down"
                    }`}
                  >
                    {up ? (
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {up ? "+" : ""}
                    {m.dailyChange.toFixed(1)}%
                  </span>
                  <span className="truncate text-[11px] text-ink-dim">· {m.signal}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-ink-dim">{t("notEnoughData")}</p>
      )}
    </DashboardCard>
  );
}
