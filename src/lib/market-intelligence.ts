import type { Material } from "@/data/materials";

/**
 * The price series behind these signals is a fixed seed dataset, not a live
 * feed: the Material rows in the database are identical to the static seed and
 * carry no timestamp. `lastUpdated` used to return `new Date()`, which stamped
 * today's date on numbers that had not moved since the seed was written. That
 * was the one genuinely misleading claim on this page — the surrounding copy
 * already calls the series indicative. There is no real capture date to report,
 * so the field is gone rather than replaced with a guess. Reinstate it when a
 * live feed provides a timestamp.
 */
export type SignalExplanation = {
  label: string;
  tone: "info" | "warn" | "neutral";
  reason: string;
  source: string;
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
    source: "Suplymate seed series — a fixed sample dataset, not a live market feed",
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
