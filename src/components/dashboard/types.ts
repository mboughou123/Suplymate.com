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
  firstName?: string | null;
};

export type TopSupplier = {
  id: string;
  name: string;
  location: string;
  score: number | null;
  verified: boolean;
};

export type ActivityItem = {
  id: string;
  type: "quote" | "price" | "shipping" | "ai" | "supplier";
  title: string;
  detail: string;
  status?: "success" | "warning" | "info";
};

/**
 * Activity feed built ONLY from the signed-in user's real workspace counts.
 * No fabricated supplier names, prices, or events. Returns an empty list when
 * the user has no activity yet (the UI renders an honest empty state).
 */
export function buildActivityFeed(stats: DashboardStats): ActivityItem[] {
  const items: ActivityItem[] = [];

  if (stats.conversationCount > 0) {
    items.push({
      id: "conversations",
      type: "supplier",
      title: "Supplier conversations",
      detail: `You have ${stats.conversationCount} active supplier thread${
        stats.conversationCount > 1 ? "s" : ""
      }.`,
      status: "success",
    });
  }
  if (stats.rfqCount > 0) {
    items.push({
      id: "rfqs",
      type: "quote",
      title: "Requests for quotation",
      detail: `${stats.rfqCount} RFQ${stats.rfqCount > 1 ? "s" : ""} in progress.`,
      status: "info",
    });
  }
  if (stats.alertCount > 0) {
    items.push({
      id: "alerts",
      type: "price",
      title: "Price alerts",
      detail: `${stats.alertCount} material price alert${
        stats.alertCount > 1 ? "s" : ""
      } monitoring the market.`,
      status: "warning",
    });
  }
  if (stats.favoriteCount > 0) {
    items.push({
      id: "favorites",
      type: "supplier",
      title: "Saved suppliers",
      detail: `${stats.favoriteCount} supplier${
        stats.favoriteCount > 1 ? "s" : ""
      } saved to your shortlist.`,
      status: "info",
    });
  }
  if (stats.unreadNotifications > 0) {
    items.push({
      id: "notifications",
      type: "ai",
      title: "Unread notifications",
      detail: `${stats.unreadNotifications} notification${
        stats.unreadNotifications > 1 ? "s" : ""
      } waiting for review.`,
      status: "warning",
    });
  }

  return items;
}
