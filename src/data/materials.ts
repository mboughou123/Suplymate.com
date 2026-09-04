// Reference price series for catalog materials.
//
// IMPORTANT: these numbers are SEED / REFERENCE values used when no pricing
// provider is configured. They are labelled "seed" everywhere they surface and
// are never presented as live market data. When PRICING_API_KEY is set, the
// pricing service replaces them with provider data (see lib/pricing).
//
// Only materials declared in src/data/material-catalog.ts may appear here.

import { isCatalogMaterial } from "@/data/material-catalog";

export type AiSignal = "Buy now" | "Wait" | "Monitor";

export type Material = {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  unit: string;
  currency: string;
  dailyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  signal: AiSignal;
  history: number[];
  /** Catalog category id (metals | construction | packaging …). */
  category?: string;
  /** "seed" until a pricing provider writes real data. */
  source?: string;
  /** ISO timestamp of the last price update, when known. */
  lastUpdatedAt?: string | null;
};

const seed: Material[] = [
  {
    id: "steel",
    name: "Steel",
    symbol: "STL",
    currentPrice: 612,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: 1.2,
    monthlyChange: 4.8,
    yearlyChange: -2.1,
    signal: "Buy now",
    history: [580, 585, 590, 595, 598, 602, 605, 608, 610, 612, 615, 612],
    category: "metals",
    source: "seed",
  },
  {
    id: "stainless-steel",
    name: "Stainless Steel",
    symbol: "SS",
    currentPrice: 2890,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: 0.4,
    monthlyChange: 1.6,
    yearlyChange: -6.2,
    signal: "Monitor",
    history: [3050, 3010, 2980, 2960, 2940, 2920, 2905, 2895, 2880, 2875, 2885, 2890],
    category: "metals",
    source: "seed",
  },
  {
    id: "aluminum",
    name: "Aluminum",
    symbol: "AL",
    currentPrice: 2485,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: 0.6,
    monthlyChange: -1.2,
    yearlyChange: 8.3,
    signal: "Wait",
    history: [2550, 2540, 2520, 2510, 2500, 2495, 2490, 2488, 2485, 2480, 2482, 2485],
    category: "metals",
    source: "seed",
  },
  {
    id: "copper",
    name: "Copper",
    symbol: "CU",
    currentPrice: 4.28,
    unit: "USD/lb",
    currency: "USD",
    dailyChange: -0.4,
    monthlyChange: 2.1,
    yearlyChange: 12.4,
    signal: "Monitor",
    history: [3.9, 3.95, 4.0, 4.05, 4.1, 4.15, 4.2, 4.25, 4.3, 4.28, 4.26, 4.28],
    category: "metals",
    source: "seed",
  },
  {
    id: "brass",
    name: "Brass",
    symbol: "BRS",
    currentPrice: 7150,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: -0.2,
    monthlyChange: 1.1,
    yearlyChange: 9.8,
    signal: "Monitor",
    history: [6600, 6680, 6750, 6820, 6900, 6950, 7000, 7050, 7100, 7160, 7170, 7150],
    category: "metals",
    source: "seed",
  },
  {
    id: "zinc",
    name: "Zinc",
    symbol: "ZN",
    currentPrice: 2740,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: 0.3,
    monthlyChange: -0.8,
    yearlyChange: 4.1,
    signal: "Monitor",
    history: [2650, 2680, 2700, 2720, 2760, 2790, 2770, 2755, 2745, 2735, 2738, 2740],
    category: "metals",
    source: "seed",
  },
  {
    id: "nickel",
    name: "Nickel",
    symbol: "NI",
    currentPrice: 16250,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: -0.9,
    monthlyChange: -3.4,
    yearlyChange: -14.7,
    signal: "Wait",
    history: [19100, 18700, 18300, 17900, 17600, 17300, 17000, 16800, 16600, 16450, 16300, 16250],
    category: "metals",
    source: "seed",
  },
  {
    id: "iron-ore",
    name: "Iron Ore",
    symbol: "FE",
    currentPrice: 118,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: 0.3,
    monthlyChange: 1.8,
    yearlyChange: -4.5,
    signal: "Monitor",
    history: [115, 116, 116.5, 117, 117.2, 117.5, 117.8, 118, 118.2, 118, 118.1, 118],
    category: "metals",
    source: "seed",
  },
  {
    id: "lumber",
    name: "Lumber",
    symbol: "LMB",
    currentPrice: 445,
    unit: "USD/1000 bf",
    currency: "USD",
    dailyChange: 0.9,
    monthlyChange: 3.2,
    yearlyChange: 15.6,
    signal: "Buy now",
    history: [400, 405, 410, 415, 420, 425, 430, 435, 440, 442, 444, 445],
    category: "construction",
    source: "seed",
  },
  {
    id: "cement",
    name: "Cement",
    symbol: "CEM",
    currentPrice: 128,
    unit: "USD/ton",
    currency: "USD",
    dailyChange: 0,
    monthlyChange: 0.8,
    yearlyChange: 3.9,
    signal: "Monitor",
    history: [122, 122, 123, 124, 124, 125, 126, 126, 127, 127, 128, 128],
    category: "construction",
    source: "seed",
  },
  {
    id: "plastics-index",
    name: "Plastics (resin index)",
    symbol: "PLX",
    currentPrice: 1420,
    unit: "Index pts",
    currency: "USD",
    dailyChange: -0.2,
    monthlyChange: -2.8,
    yearlyChange: 6.1,
    signal: "Wait",
    history: [1480, 1470, 1460, 1450, 1445, 1440, 1435, 1430, 1425, 1422, 1421, 1420],
    category: "packaging",
    source: "seed",
  },
];

export const materials: Material[] = seed.filter((m) => isCatalogMaterial(m.id));

export function getMaterialById(id: string): Material | undefined {
  return materials.find((m) => m.id === id);
}
