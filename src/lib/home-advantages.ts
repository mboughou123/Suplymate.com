/**
 * Homepage “advantages / outcomes” band — Keelvar-style benefit cards.
 * Abstract UI previews only; no mill photography.
 */
export type HomeAdvantageKey =
  | "verifiedNetwork"
  | "fasterShortlists"
  | "offerCompare"
  | "priceWindows";

export type HomeAdvantageEntry = {
  key: HomeAdvantageKey;
  preview: "network" | "scout" | "compare" | "watch";
};

export const HOME_ADVANTAGES: HomeAdvantageEntry[] = [
  { key: "verifiedNetwork", preview: "network" },
  { key: "fasterShortlists", preview: "scout" },
  { key: "offerCompare", preview: "compare" },
  { key: "priceWindows", preview: "watch" },
];
