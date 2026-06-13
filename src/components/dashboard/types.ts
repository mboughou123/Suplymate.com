export type DashboardStats = {
  alertCount: number;
  conversationCount: number;
  rfqCount: number;
  favoriteCount: number;
  unreadNotifications: number;
  supplierCount: number;
  verifiedSuppliers: number;
};

export type MaterialSummary = {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  unit: string;
  dailyChange: number;
  signal: string;
  history: number[];
};

export type DashboardUser = {
  name: string;
  email: string;
  company?: string | null;
};

export type ActivityItem = {
  id: string;
  type: "quote" | "price" | "shipping" | "ai" | "supplier";
  title: string;
  detail: string;
  time: string;
  status?: "success" | "warning" | "info";
};

export function buildActivityFeed(stats: DashboardStats): ActivityItem[] {
  const items: ActivityItem[] = [
    {
      id: "1",
      type: "ai",
      title: "AI procurement insight",
      detail: "Copper prices stabilizing — consider locking in 2-week delivery window.",
      time: "12m ago",
      status: "info",
    },
    {
      id: "2",
      type: "quote",
      title: "Quote response received",
      detail: "Atlas Steel Supplier replied to your steel coil inquiry.",
      time: "1h ago",
      status: "success",
    },
    {
      id: "3",
      type: "price",
      title: "Steel index update",
      detail: "Hot-rolled steel up +1.2% daily — 3 suppliers adjusted pricing.",
      time: "2h ago",
      status: "warning",
    },
    {
      id: "4",
      type: "shipping",
      title: "Delivery forecast updated",
      detail: "EU lane lead times improved to 14–18 days for aluminum sheet.",
      time: "4h ago",
      status: "info",
    },
  ];
  if (stats.conversationCount > 0) {
    items.unshift({
      id: "0",
      type: "supplier",
      title: "Active conversations",
      detail: `${stats.conversationCount} supplier thread${stats.conversationCount > 1 ? "s" : ""} in progress.`,
      time: "now",
      status: "success",
    });
  }
  return items;
}
