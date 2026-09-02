"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Factory,
  FileText,
  Bell,
  Sparkles,
  TrendingUp,
  Heart,
  MessageCircle,
  Package,
} from "lucide-react";
import DashboardBackground from "./DashboardBackground";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import DashboardHero from "./DashboardHero";
import StatCard from "./StatCard";
import ProcurementPanel from "./ProcurementPanel";
import InsightsPanel from "./InsightsPanel";
import ActivityFeed from "./ActivityFeed";
import MarketTrendsSection from "./MarketTrendsSection";
import CarouselCards from "@/components/kokonutui/carousel-cards";
import {
  type DashboardStats,
  type DashboardUser,
  type MaterialSummary,
  type TopSupplier,
  type ActivityItem,
} from "./types";

type Props = {
  user: DashboardUser;
  stats: DashboardStats;
  materials: MaterialSummary[];
  topSuppliers: TopSupplier[];
};

export default function DashboardClient({
  user,
  stats,
  materials,
  topSuppliers,
}: Props) {
  const t = useTranslations("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const firstName = user.firstName || user.name.split(" ")[0] || "there";
  const buySignals = materials.filter((m) => m.signal === "Buy now").length;

  const activity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];
    if (stats.conversationCount > 0) {
      items.push({
        id: "conversations",
        type: "supplier",
        title: t("conversations", { count: stats.conversationCount }),
        detail: t("conversations", { count: stats.conversationCount }),
        status: "success",
      });
    }
    if (stats.rfqCount > 0) {
      items.push({
        id: "rfqs",
        type: "quote",
        title: t("activeRfqs"),
        detail: t("openQuotations"),
        status: "info",
      });
    }
    if (stats.alertCount > 0) {
      items.push({
        id: "alerts",
        type: "price",
        title: t("priceAlerts"),
        detail: t("monitoringMarkets"),
        status: "warning",
      });
    }
    if (stats.favoriteCount > 0) {
      items.push({
        id: "favorites",
        type: "supplier",
        title: t("verifiedSuppliers"),
        detail: String(stats.favoriteCount),
        status: "info",
      });
    }
    if (stats.unreadNotifications > 0) {
      items.push({
        id: "notifications",
        type: "ai",
        title: t("title"),
        detail: String(stats.unreadNotifications),
        status: "warning",
      });
    }
    return items;
  }, [stats, t]);

  return (
    <div className="relative flex min-h-screen text-ink">
      <DashboardBackground />

      <DashboardSidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          user={user}
          unreadNotifications={stats.unreadNotifications}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1600px] space-y-6">
            <DashboardHero
              firstName={firstName}
              supplierCount={stats.supplierCount}
              conversationCount={stats.conversationCount}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={t("verifiedSuppliers")}
                value={stats.verifiedSuppliers.toLocaleString()}
                sub={t("totalIndexed", { count: stats.supplierCount })}
                icon={Factory}
                href="/suppliers"
              />
              <StatCard
                label={t("activeRfqs")}
                value={String(stats.rfqCount)}
                sub={stats.rfqCount > 0 ? t("openQuotations") : t("noRfqsYet")}
                icon={FileText}
                href="/messages"
              />
              <StatCard
                label={t("priceAlerts")}
                value={String(stats.alertCount)}
                sub={stats.alertCount > 0 ? t("monitoringMarkets") : t("noAlertsSet")}
                icon={Bell}
                href="/price-charts"
              />
              <StatCard
                label={t("aiRecommendations")}
                value="—"
                sub={t("askAssistantToStart")}
                icon={Sparkles}
                href="/ai-assistant"
                empty
              />
              <StatCard
                label={t("marketTrends")}
                value={String(buySignals)}
                sub={
                  materials.length > 0
                    ? t("buyNowSignals", { count: buySignals })
                    : t("notEnoughData")
                }
                icon={TrendingUp}
                href="/price-charts"
                empty={materials.length === 0}
              />
              <StatCard
                label="Saved"
                value={String(stats.favoriteCount)}
                sub={
                  stats.favoriteCount > 0
                    ? t("totalIndexed", { count: stats.favoriteCount })
                    : t("notEnoughData")
                }
                icon={Heart}
                href="/saved"
                empty={stats.favoriteCount === 0}
              />
              <StatCard
                label="Products"
                value="—"
                sub={t("askAssistantToStart")}
                icon={Package}
                href="/products"
                empty
              />
              <StatCard
                label={t("supplierResponseRate")}
                value="—"
                sub={
                  stats.conversationCount > 0
                    ? t("conversations", { count: stats.conversationCount })
                    : t("noConversationsYet")
                }
                icon={MessageCircle}
                href="/messages"
                empty
              />
            </div>

            <CarouselCards title="Phase-1 mills" />

            <div className="grid gap-6 xl:grid-cols-12">
              <div className="space-y-6 xl:col-span-8">
                <ProcurementPanel />
                <MarketTrendsSection materials={materials} />
                <ActivityFeed items={activity} />
              </div>
              <div className="xl:col-span-4">
                <InsightsPanel materials={materials} topSuppliers={topSuppliers} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
