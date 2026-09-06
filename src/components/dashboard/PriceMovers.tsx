import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LineChart, TrendingDown, TrendingUp } from "lucide-react";
import DashboardCard from "./DashboardCard";
import Sparkline from "./Sparkline";
import type { MaterialSummary } from "./types";

type Props = {
  materials: MaterialSummary[];
  limit?: number;
};

/** "Watch" card: the materials moving the most today, linking into price charts. */
export default async function PriceMovers({ materials, limit = 4 }: Props) {
  const t = await getTranslations("dashboard");
  const movers = [...materials]
    .sort((a, b) => Math.abs(b.dailyChange) - Math.abs(a.dailyChange))
    .slice(0, limit);

  return (
    <DashboardCard
      title={t("priceMoversTitle")}
      description={t("priceMoversDescription")}
      icon={LineChart}
      action={movers.length > 0 ? { label: t("openWatch"), href: "/materials" } : undefined}
      as="aside"
    >
      {movers.length > 0 ? (
        <ul className="-mx-2 divide-y divide-slate-100">
          {movers.map((m) => {
            const up = m.dailyChange >= 0;
            return (
              <li key={m.id}>
                <Link
                  href="/materials"
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-slate-50/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
                    <p className="text-[11px] text-ink-dim">
                      {m.symbol} · {m.currentPrice.toLocaleString()} {m.unit}
                    </p>
                  </div>
                  <Sparkline uid={m.id} values={m.history} up={up} className="h-6 w-16 shrink-0" />
                  <span
                    className={`inline-flex w-[4.25rem] shrink-0 items-center justify-end gap-1 text-xs font-semibold tabular-nums ${
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
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-ink-dim">{t("notEnoughData")}</p>
      )}
    </DashboardCard>
  );
}
