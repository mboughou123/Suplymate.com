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
