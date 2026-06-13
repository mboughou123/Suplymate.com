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
};

export const materials: Material[] = [
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
  },
  {
    id: "crude-oil",
    name: "Crude Oil",
    symbol: "WTI",
    currentPrice: 78.4,
    unit: "USD/barrel",
    currency: "USD",
    dailyChange: 2.3,
    monthlyChange: 6.1,
    yearlyChange: 5.2,
    signal: "Monitor",
    history: [72, 73, 74, 75, 76, 76.5, 77, 77.5, 78, 78.2, 78.3, 78.4],
  },
  {
    id: "natural-gas",
    name: "Natural Gas",
    symbol: "NG",
    currentPrice: 2.84,
    unit: "USD/MMBtu",
    currency: "USD",
    dailyChange: -1.8,
    monthlyChange: -5.4,
    yearlyChange: -18.2,
    signal: "Wait",
    history: [3.2, 3.1, 3.05, 3.0, 2.95, 2.9, 2.88, 2.86, 2.85, 2.84, 2.83, 2.84],
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
  },
  {
    id: "plastics-index",
    name: "Plastics Index",
    symbol: "PLX",
    currentPrice: 1420,
    unit: "Index pts",
    currency: "USD",
    dailyChange: -0.2,
    monthlyChange: -2.8,
    yearlyChange: 6.1,
    signal: "Wait",
    history: [1480, 1470, 1460, 1450, 1445, 1440, 1435, 1430, 1425, 1422, 1421, 1420],
  },
];

export function getMaterialById(id: string): Material | undefined {
  return materials.find((m) => m.id === id);
}
