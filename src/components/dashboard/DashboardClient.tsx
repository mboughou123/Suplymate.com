"use client";

import { useState } from "react";
import {
  Factory,
  FileText,
  Bell,
  Sparkles,
  TrendingUp,
  Shield,
  DollarSign,
  MessageCircle,
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
import {
  type DashboardStats,
  type DashboardUser,
  type MaterialSummary,
  type TopSupplier,
  buildActivityFeed,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const firstName = user.firstName || user.name.split(" ")[0] || "there";
  const activity = buildActivityFeed(stats);
  const buySignals = materials.filter((m) => m.signal === "Buy now").length;

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

            {/* Metrics — real values where available; honest empty states otherwise */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Verified suppliers"
                value={stats.verifiedSuppliers.toLocaleString()}
                sub={`${stats.supplierCount.toLocaleString()} total indexed`}
                icon={Factory}
                href="/suppliers"
              />
              <StatCard
                label="Active RFQs"
                value={String(stats.rfqCount)}
                sub={stats.rfqCount > 0 ? "Open quotations" : "No RFQs yet"}
                icon={FileText}
                href="/messages"
              />
              <StatCard
                label="Price alerts"
                value={String(stats.alertCount)}
                sub={stats.alertCount > 0 ? "Monitoring markets" : "No alerts set"}
                icon={Bell}
                href="/price-charts"
              />
              <StatCard
                label="AI recommendations"
                value="—"
                sub="Ask the assistant to get started"
                icon={Sparkles}
                href="/ai-assistant"
                empty
              />
              <StatCard
                label="Market trends"
                value={String(buySignals)}
                sub={
                  materials.length > 0
                    ? `${buySignals} buy-now signal${buySignals === 1 ? "" : "s"}`
                    : "Not enough data"
                }
                icon={TrendingUp}
                href="/price-charts"
                empty={materials.length === 0}
              />
              <StatCard
                label="Delivery risk"
                value="—"
                sub="Not enough data"
                icon={Shield}
                empty
              />
              <StatCard
                label="Procurement savings"
                value="—"
                sub="Not enough data"
                icon={DollarSign}
                empty
              />
              <StatCard
                label="Supplier response rate"
                value="—"
                sub={
                  stats.conversationCount > 0
                    ? `${stats.conversationCount} conversation${
                        stats.conversationCount === 1 ? "" : "s"
                      }`
                    : "No conversations yet"
                }
                icon={MessageCircle}
                href="/messages"
                empty
              />
            </div>

            {/* Main content grid */}
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
