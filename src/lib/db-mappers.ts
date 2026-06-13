import type { Supplier } from "@/data/suppliers";
import type { Product } from "@/data/products";
import type { Material } from "@/data/materials";

type DbSupplier = {
  id: string;
  name: string;
  industry: string;
  location: string;
  products: string;
  deliveryRegions: string;
  moq: string;
  reliabilityScore: number;
};

type DbMaterial = {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  unit: string;
  currency: string;
  dailyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  signal: string;
  history: string;
};

export function mapSupplier(row: DbSupplier): Supplier {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry as Supplier["industry"],
    location: row.location,
    products: JSON.parse(row.products) as string[],
    deliveryRegions: JSON.parse(row.deliveryRegions) as string[],
    moq: row.moq,
    reliabilityScore: row.reliabilityScore,
  };
}

export function mapProduct(row: {
  id: string;
  name: string;
  category: string;
  priceMin: number;
  priceMax: number;
  currency: string;
  bestDeliveryDays: number;
  supplierCount: number;
  unit: string;
}): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Product["category"],
    priceMin: row.priceMin,
    priceMax: row.priceMax,
    currency: row.currency,
    bestDeliveryDays: row.bestDeliveryDays,
    supplierCount: row.supplierCount,
    unit: row.unit,
  };
}

export function mapMaterial(row: DbMaterial): Material {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    currentPrice: row.currentPrice,
    unit: row.unit,
    currency: row.currency,
    dailyChange: row.dailyChange,
    monthlyChange: row.monthlyChange,
    yearlyChange: row.yearlyChange,
    signal: row.signal as Material["signal"],
    history: JSON.parse(row.history) as number[],
  };
}
