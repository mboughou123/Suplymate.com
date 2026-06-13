import type { FakeAiResponse } from "@/components/ProcurementSuggestionCard";

export function generateFakeAiResponse(userMessage: string): FakeAiResponse {
  const lower = userMessage.toLowerCase();
  if (lower.includes("copper") || lower.includes("wait")) {
    return {
      recommendedSupplier: "VoltLine Cabling",
      estimatedPrice: "$4.28/lb (spot)",
      delivery: "Market-dependent",
      risk: "Medium",
      recommendation:
        "Monitor for 2–3 weeks — copper is range-bound with mild upward bias.",
      summary:
        "Copper prices are stable short-term. Waiting may save 3–5% if you can delay 30 days. For urgent orders, VoltLine offers reliable EU stock.",
    };
  }
  if (lower.includes("aluminum") || lower.includes("cheapest")) {
    return {
      recommendedSupplier: "Atlas Steel Supplier",
      estimatedPrice: "$2,400/ton",
      delivery: "18–22 days",
      risk: "Low",
      recommendation:
        "Lock in this week — aluminum indices show early recovery signals.",
      summary:
        "Atlas Steel Supplier currently leads on aluminum sheet pricing for North American delivery. MOQ 2 tons.",
    };
  }
  if (lower.includes("fastest") || lower.includes("compare")) {
    return {
      recommendedSupplier: "BuildPro Matériaux",
      estimatedPrice: "$655/ton",
      delivery: "8 days",
      risk: "Medium",
      recommendation:
        "Choose BuildPro for speed; switch to Méditerranée Acier if price is the priority (14 days, −12%).",
      summary:
        "Fastest delivery vs cheapest price trade-off: 8-day premium delivery saves ~6 days vs lowest-cost option.",
    };
  }
  return {
    recommendedSupplier: "Atlas Steel Supplier",
    estimatedPrice: "$6,200",
    delivery: "10 days",
    risk: "Medium",
    recommendation:
      "Buy this week because steel prices are trending upward (+1.2% daily).",
    summary: `Based on your request — Atlas Steel Supplier is the best overall option balancing price, delivery speed, and reliability.`,
  };
}
