import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BadgeCheck, Factory, MapPin } from "lucide-react";
import DashboardCard from "./DashboardCard";
import type { TopSupplier } from "./types";

type Props = {
  suppliers: TopSupplier[];
};

export default async function TopSuppliersCard({ suppliers }: Props) {
  const t = await getTranslations("dashboard");

  return (
    <DashboardCard
      title={t("topSuppliersTitle")}
      description={t("topSuppliersDescription")}
      icon={Factory}
      action={{ label: t("scoutSuppliers"), href: "/suppliers" }}
      as="aside"
    >
      {suppliers.length > 0 ? (
        <ol className="space-y-2">
          {suppliers.map((s, i) => (
            <li key={`${s.id}-${i}`}>
              <Link
                href={`/supplier/${s.id}`}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-slate-200 hover:bg-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-ink-muted transition group-hover:bg-cyan-soft group-hover:text-cyan">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink">
                    <span className="truncate">{s.name}</span>
                    {s.verified && (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden />
                    )}
                  </p>
                  {s.location && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-ink-dim">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {s.location}
                    </p>
                  )}
                </div>
                {s.score != null && (
                  <span
                    className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-ink-muted"
                    title={t("matchScore")}
                  >
                    {s.score}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-ink-dim">{t("notEnoughData")}</p>
      )}
    </DashboardCard>
  );
}
