/** `null` means the underlying query failed (e.g. DB unavailable) — render "—". */
export type Count = number | null;

export type DashboardStats = {
  alertCount: Count;
  conversationCount: Count;
  rfqCount: Count;
  openRfqCount: Count;
  favoriteCount: Count;
  unreadNotifications: Count;
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

export type RfqStatus = "open" | "submitted" | "quoted" | "closed" | "expired" | "cancelled";

export type RecentRfq = {
  id: string;
  publicRef: string | null;
  productName: string;
  quantity: string;
  supplierName: string | null;
  status: RfqStatus;
  quoteCount: number;
  createdAt: string;
};

export type ConversationStatus =
  | "inquiry"
  | "negotiation"
  | "sample_sent"
  | "order_in_progress"
  | "completed";

export type RecentConversation = {
  id: string;
  supplierName: string;
  subject: string | null;
  status: ConversationStatus;
  lastMessageAt: string;
  unread: boolean;
};
