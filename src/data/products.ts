export type ProductCategory =
  | "Steel & Metals"
  | "Cables & Electrical"
  | "Tubes & Pipes"
  | "Packaging"
  | "Construction"
  | "Industrial Parts";

// Moderation lifecycle for scraped/imported products. "approved" is the
// published state surfaced publicly; "needs_info" parks a product for follow-up
// without rejecting it. Scraped products are NEVER published automatically.
export type ProductStatus = "pending" | "approved" | "rejected" | "needs_info";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  priceMin: number;
  priceMax: number;
  currency: string;
  bestDeliveryDays: number;
  supplierCount: number;
  unit: string;
  // Rich marketplace fields (optional; derived deterministically when absent).
  supplierId?: string;
  images?: string[];
  videos?: string[];
  /** Supplier base (wholesale) price before commission. */
  basePrice?: number;
  commissionRate?: number;
  moq?: string;
  shippingTime?: string;
  description?: string;
  specifications?: Record<string, string>;
  customizationOptions?: string[];
  rating?: number;
  reviewCount?: number;
  sourceUrl?: string;
  /** Canonical product detail page on the supplier site (scraped products). */
  productUrl?: string;
  /** Original hotlinked image URL kept for attribution (scraped products). */
  imageSourceUrl?: string;
  /** Unit the base price applies to (e.g. "ton"); null when no public price. */
  priceUnit?: string;
  /** Unit for the MOQ value (e.g. "tons"). */
  minimumOrderUnit?: string;
  /** Denormalised supplier display fields for scraped products. */
  supplierName?: string;
  supplierCountry?: string;
  /** Whether a real, public price was found on the source page. */
  hasPublicPrice?: boolean;
  /** Moderation state for scraped/imported products. */
  status?: ProductStatus;
};

export const productCategories: ProductCategory[] = [
  "Steel & Metals",
  "Cables & Electrical",
  "Tubes & Pipes",
  "Packaging",
  "Construction",
  "Industrial Parts",
];

export const products: Product[] = [
  {
    id: "hr-steel-coil",
    name: "Hot-Rolled Steel Coil (S235)",
    category: "Steel & Metals",
    priceMin: 580,
    priceMax: 720,
    currency: "USD",
    bestDeliveryDays: 10,
    supplierCount: 8,
    unit: "ton",
  },
  {
    id: "copper-wire",
    name: "Copper Wire 2.5mm²",
    category: "Cables & Electrical",
    priceMin: 4.2,
    priceMax: 5.8,
    currency: "USD",
    bestDeliveryDays: 7,
    supplierCount: 12,
    unit: "meter",
  },
  {
    id: "hdpe-pipe",
    name: "HDPE Pressure Pipe DN110",
    category: "Tubes & Pipes",
    priceMin: 12,
    priceMax: 18,
    currency: "USD",
    bestDeliveryDays: 14,
    supplierCount: 6,
    unit: "meter",
  },
  {
    id: "pet-film-roll",
    name: "PET Film Roll (12µm)",
    category: "Packaging",
    priceMin: 890,
    priceMax: 1100,
    currency: "USD",
    bestDeliveryDays: 12,
    supplierCount: 5,
    unit: "roll",
  },
  {
    id: "portland-cement",
    name: "Portland Cement Type I",
    category: "Construction",
    priceMin: 95,
    priceMax: 120,
    currency: "USD",
    bestDeliveryDays: 5,
    supplierCount: 9,
    unit: "ton",
  },
  {
    id: "aluminum-sheet",
    name: "Aluminum Sheet 3mm (6061)",
    category: "Steel & Metals",
    priceMin: 2400,
    priceMax: 2850,
    currency: "USD",
    bestDeliveryDays: 18,
    supplierCount: 7,
    unit: "ton",
  },
  {
    id: "fiber-optic-cable",
    name: "Fiber Optic Cable 24-core",
    category: "Cables & Electrical",
    priceMin: 1.8,
    priceMax: 2.4,
    currency: "USD",
    bestDeliveryDays: 9,
    supplierCount: 10,
    unit: "meter",
  },
  {
    id: "stainless-tube",
    name: "Stainless Steel Tube 304",
    category: "Tubes & Pipes",
    priceMin: 28,
    priceMax: 38,
    currency: "USD",
    bestDeliveryDays: 11,
    supplierCount: 8,
    unit: "meter",
  },
  {
    id: "hydraulic-cylinder",
    name: "Hydraulic Cylinder 100mm bore",
    category: "Industrial Parts",
    priceMin: 420,
    priceMax: 580,
    currency: "USD",
    bestDeliveryDays: 21,
    supplierCount: 4,
    unit: "unit",
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(category: ProductCategory): Product[] {
  return products.filter((p) => p.category === category);
}
