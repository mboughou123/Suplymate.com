export type SenderType = "buyer" | "supplier" | "system";

export type ConversationStatus =
  | "inquiry"
  | "negotiation"
  | "sample_sent"
  | "order_in_progress"
  | "completed";

export type Attachment = {
  id: string;
  fileName: string;
  fileType: string;
  url: string;
  sizeBytes: number;
};

export type Message = {
  id: string;
  conversationId: string;
  senderType: SenderType;
  body: string;
  translatedBody: string | null;
  language: string | null;
  riskFlag: string | null;
  readAt: string | null;
  createdAt: string;
  attachments: Attachment[];
};

export type SupplierMeta = {
  online: boolean;
  responseTime: string;
  responseRate: number;
  lastActive: string;
  verified: boolean;
  deliveryReliability: number;
};

export type ConversationSummary = {
  id: string;
  supplierId: string;
  supplierName: string;
  status: ConversationStatus;
  lastMessageAt: string;
  lastMessage: { senderType: SenderType; body: string; createdAt: string } | null;
};

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  inquiry: "Inquiry",
  negotiation: "Negotiation",
  sample_sent: "Sample sent",
  order_in_progress: "Order in progress",
  completed: "Completed",
};

export const STATUS_STYLES: Record<ConversationStatus, string> = {
  inquiry: "bg-slate-100 text-ink-muted",
  negotiation: "bg-cyan/10 text-cyan",
  sample_sent: "bg-mustard/15 text-amber-800",
  order_in_progress: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
};
