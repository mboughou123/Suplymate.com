import type { Supplier, SupplierCategory } from "@/data/suppliers";
import type { Product } from "@/data/products";
import type { Material } from "@/data/materials";

type DbSupplier = {
  id: string;
  name: string;
  industry: string;
  category?: string | null;
  location: string;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  googleRating?: number | null;
  googleReviews?: number | null;
  description?: string | null;
  products: string;
  deliveryRegions: string;
  moq: string;
  verified?: boolean | null;
  address?: string | null;
  openingHours?: string | null;
  sourceUrl?: string | null;
  score?: number | null;
  reliabilityScore: number;
  lastUpdated?: Date | string | null;
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
  const rating = row.googleRating ?? undefined;
  const reviews = row.googleReviews ?? undefined;
  return {
    id: row.id,
    name: row.name,
    industry: row.industry as Supplier["industry"],
    category: (row.category as SupplierCategory) ?? undefined,
    location: row.location,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    googleRating: rating,
    googleReviews: reviews,
    rating,
    reviewCount: reviews,
    description: row.description ?? undefined,
    products: JSON.parse(row.products) as string[],
    deliveryRegions: JSON.parse(row.deliveryRegions) as string[],
    moq: row.moq,
    verified: row.verified ?? undefined,
    address: row.address ?? undefined,
    openingHours: row.openingHours ?? undefined,
    sourceUrl: row.sourceUrl ?? undefined,
    score: row.score ?? undefined,
    reliabilityScore: row.reliabilityScore,
    lastUpdated:
      row.lastUpdated instanceof Date
        ? row.lastUpdated.toISOString()
        : row.lastUpdated ?? undefined,
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
