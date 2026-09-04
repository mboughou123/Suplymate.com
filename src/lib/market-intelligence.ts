import type { Material } from "@/data/materials";

export type SignalExplanation = {
  label: string;
  tone: "info" | "warn" | "neutral";
  reason: string;
  source: string;
  lastUpdated: string;
};

export function explainSignal(material: Material): SignalExplanation {
  const reasons: Record<Material["signal"], string> = {
    "Buy now":
      "Recent trend and momentum indicators suggest prices may be near a local low relative to the past 12 months. This is not trading advice.",
    Wait: "Volatility or upward momentum suggests waiting may reduce near-term purchase risk. Confirm with your own sourcing strategy.",
    Monitor: "Mixed signals — track weekly before committing to large orders.",
  };
  return {
    label: material.signal,
    tone: material.signal === "Buy now" ? "info" : material.signal === "Wait" ? "warn" : "neutral",
    reason: reasons[material.signal],
    source:
      !material.source || material.source === "seed"
        ? "Reference series (seed data — not live). Connect a pricing provider for live quotes."
        : `Pricing provider: ${material.source}`,
    lastUpdated: (material.lastUpdatedAt ?? new Date().toISOString()).slice(0, 10),
  };
}

export function priceRange(material: Material): { min: number; max: number; unit: string } {
  const hist = material.history.length ? material.history : [material.currentPrice];
  return {
    min: Math.min(...hist),
    max: Math.max(...hist),
    unit: material.unit,
  };
}
