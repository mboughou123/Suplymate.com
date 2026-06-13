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
  buildActivityFeed,
} from "./types";

type Props = {
  user: DashboardUser;
  stats: DashboardStats;
  materials: MaterialSummary[];
};

export default function DashboardClient({ user, stats, materials }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const firstName = user.name.split(" ")[0] ?? "there";
  const activity = buildActivityFeed(stats);

  const buySignals = materials.filter((m) => m.signal === "Buy now").length;
  const marketStatus =
    buySignals > 2 ? "Buy signals active" : "Markets monitoring";

  return (
    <div className="relative flex min-h-screen text-white">
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
              marketStatus={marketStatus}
            />

            {/* Analytics grid */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Verified suppliers"
                value={String(stats.verifiedSuppliers)}
                sub={`${stats.supplierCount} total indexed`}
                trend={4}
                icon={Factory}
                href="/suppliers"
                accent="gold"
                delay={0.05}
              />
              <StatCard
                label="Active RFQs"
                value={String(stats.rfqCount)}
                sub="Open quotations"
                trend={stats.rfqCount > 0 ? 8 : 0}
                icon={FileText}
                href="/messages"
                accent="cyan"
                delay={0.1}
              />
              <StatCard
                label="Price alerts"
                value={String(stats.alertCount)}
                sub="Monitoring markets"
                trend={2}
                icon={Bell}
                href="/price-charts"
                accent="violet"
                delay={0.15}
              />
              <StatCard
                label="AI recommendations"
                value="12"
                sub="This week"
                trend={6}
                icon={Sparkles}
                href="/ai-assistant"
                accent="gold"
                delay={0.2}
              />
              <StatCard
                label="Market trends"
                value={String(buySignals)}
                sub="Buy-now signals"
                trend={buySignals > 1 ? 3 : -1}
                icon={TrendingUp}
                href="/price-charts"
                accent="emerald"
                delay={0.25}
              />
              <StatCard
                label="Delivery risk"
                value="Low"
                sub="Portfolio average"
                trend={-2}
                icon={Shield}
                accent="emerald"
                delay={0.3}
              />
              <StatCard
                label="Procurement savings"
                value="8.4%"
                sub="vs. spot last quarter"
                trend={5}
                icon={DollarSign}
                accent="gold"
                delay={0.35}
              />
              <StatCard
                label="Supplier response rate"
                value="87%"
                sub={`${stats.conversationCount} conversations`}
                trend={3}
                icon={MessageCircle}
                href="/messages"
                accent="cyan"
                delay={0.4}
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
                <InsightsPanel materials={materials} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
