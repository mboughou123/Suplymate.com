import { getTranslations } from "next-intl/server";
import { Bell, FileText, Heart, MessageSquare } from "lucide-react";
import KpiCard from "./KpiCard";
import type { DashboardStats } from "./types";

type Props = {
  stats: DashboardStats;
};

export default async function KpiRow({ stats }: Props) {
  const t = await getTranslations("dashboard");
  const unavailable = t("unavailable");

  return (
    <section aria-label={t("kpiSectionLabel")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={t("kpiSavedSuppliers")}
        value={stats.favoriteCount}
        sub={
          stats.favoriteCount && stats.favoriteCount > 0
            ? t("kpiSavedSuppliersSub")
            : t("kpiSavedSuppliersEmpty")
        }
        unavailableLabel={unavailable}
        icon={Heart}
        href="/saved"
      />
      <KpiCard
        label={t("kpiOpenRfqs")}
        value={stats.openRfqCount}
        sub={
          stats.openRfqCount && stats.openRfqCount > 0
            ? t("kpiOpenRfqsSub", { total: stats.rfqCount ?? stats.openRfqCount })
            : t("noRfqsYet")
        }
        unavailableLabel={unavailable}
        icon={FileText}
        href="/rfqs"
      />
      <KpiCard
        label={t("kpiPriceAlerts")}
        value={stats.alertCount}
        sub={stats.alertCount && stats.alertCount > 0 ? t("monitoringMarkets") : t("noAlertsSet")}
        unavailableLabel={unavailable}
        icon={Bell}
        href="/materials"
      />
      <KpiCard
        label={t("kpiUnread")}
        value={stats.unreadNotifications}
        sub={
          stats.unreadNotifications && stats.unreadNotifications > 0
            ? t("kpiUnreadSub")
            : t("kpiUnreadEmpty")
        }
        unavailableLabel={unavailable}
        icon={MessageSquare}
        href="/notifications"
        highlight={Boolean(stats.unreadNotifications && stats.unreadNotifications > 0)}
      />
    </section>
  );
}
