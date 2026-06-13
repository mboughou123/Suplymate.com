import type { FakeAiResponse } from "@/components/ProcurementSuggestionCard";

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; response: FakeAiResponse; source?: string };

export type InsightMetrics = {
  trustScore: number;
  confidence: number;
  marketTrend: "Rising" | "Stable" | "Falling";
  trendValue: number;
};

export function deriveInsights(
  response: FakeAiResponse,
  source?: string
): InsightMetrics {
  const trustScore =
    response.risk === "Low" ? 92 : response.risk === "Medium" ? 78 : 55;
  const confidence = source === "openai" ? 94 : 87;
  const rec = response.recommendation.toLowerCase();
  const marketTrend: InsightMetrics["marketTrend"] = rec.includes("upward") ||
    rec.includes("rising") ||
    rec.includes("lock in") ||
    rec.includes("buy this week")
    ? "Rising"
    : rec.includes("wait") || rec.includes("monitor") || rec.includes("delay")
      ? "Falling"
      : "Stable";
  const trendValue =
    marketTrend === "Rising" ? 2.4 : marketTrend === "Falling" ? -1.8 : 0.3;
  return { trustScore, confidence, marketTrend, trendValue };
}
