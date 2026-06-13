export type SupplierOffer = {
  supplierId: string;
  supplierName: string;
  price: number;
  currency: string;
  shippingDays: number;
  location: string;
  moq: string;
  reliability: number;
  bestFor: string;
};

export type ProductComparison = {
  productId: string;
  productName: string;
  summary: string;
  bestPrice: { supplierName: string; price: number; currency: string };
  fastestDelivery: { supplierName: string; days: number };
  bestOverall: { supplierName: string; reason: string };
  offers: SupplierOffer[];
};

export const comparisons: ProductComparison[] = [
  {
    productId: "hr-steel-coil",
    productName: "Hot-Rolled Steel Coil (S235)",
    summary:
      "Structural-grade hot-rolled coil for fabrication and construction. Compare 5 qualified suppliers across North America and EU with MOQs from 2–10 tons.",
    bestPrice: { supplierName: "Méditerranée Acier", price: 580, currency: "USD" },
    fastestDelivery: { supplierName: "Atlas Steel Supplier", days: 10 },
    bestOverall: {
      supplierName: "Atlas Steel Supplier",
      reason: "Best balance of price, 10-day delivery, and 92% reliability",
    },
    offers: [
      {
        supplierId: "atlas-steel",
        supplierName: "Atlas Steel Supplier",
        price: 620,
        currency: "USD",
        shippingDays: 10,
        location: "Houston, USA",
        moq: "5 tons",
        reliability: 92,
        bestFor: "Best overall value",
      },
      {
        supplierId: "mediterranee-acier",
        supplierName: "Méditerranée Acier",
        price: 580,
        currency: "USD",
        shippingDays: 14,
        location: "Marseille, France",
        moq: "2 tons",
        reliability: 88,
        bestFor: "Lowest price",
      },
      {
        supplierId: "buildpro-materiaux",
        supplierName: "BuildPro Matériaux",
        price: 655,
        currency: "USD",
        shippingDays: 8,
        location: "Lyon, France",
        moq: "3 tons",
        reliability: 85,
        bestFor: "Fast EU delivery",
      },
      {
        supplierId: "nordic-construct",
        supplierName: "Nordic Construct Supply",
        price: 698,
        currency: "USD",
        shippingDays: 12,
        location: "Oslo, Norway",
        moq: "4 tons",
        reliability: 90,
        bestFor: "Nordic projects",
      },
    ],
  },
  {
    productId: "copper-wire",
    productName: "Copper Wire 2.5mm²",
    summary:
      "Standard building wire for electrical installations. Wide supplier network with competitive per-meter pricing and regional stock.",
    bestPrice: { supplierName: "Electra Global Components", price: 4.2, currency: "USD" },
    fastestDelivery: { supplierName: "VoltLine Cabling", days: 7 },
    bestOverall: {
      supplierName: "VoltLine Cabling",
      reason: "Strong reliability with 7-day EU delivery",
    },
    offers: [
      {
        supplierId: "voltline-cables",
        supplierName: "VoltLine Cabling",
        price: 4.5,
        currency: "USD",
        shippingDays: 7,
        location: "Milan, Italy",
        moq: "500 m",
        reliability: 91,
        bestFor: "Best overall",
      },
      {
        supplierId: "electra-global",
        supplierName: "Electra Global Components",
        price: 4.2,
        currency: "USD",
        shippingDays: 18,
        location: "Shenzhen, China",
        moq: "1,000 m",
        reliability: 83,
        bestFor: "Cheapest bulk",
      },
    ],
  },
  {
    productId: "aluminum-sheet",
    productName: "Aluminum Sheet 3mm (6061)",
    summary:
      "Aerospace-grade 6061 aluminum sheet for machining and fabrication. Monitor LME-linked pricing before placing large orders.",
    bestPrice: { supplierName: "Atlas Steel Supplier", price: 2400, currency: "USD" },
    fastestDelivery: { supplierName: "Méditerranée Acier", days: 18 },
    bestOverall: {
      supplierName: "Atlas Steel Supplier",
      reason: "Competitive pricing with proven North American logistics",
    },
    offers: [
      {
        supplierId: "atlas-steel",
        supplierName: "Atlas Steel Supplier",
        price: 2400,
        currency: "USD",
        shippingDays: 22,
        location: "Houston, USA",
        moq: "2 tons",
        reliability: 92,
        bestFor: "Best price",
      },
      {
        supplierId: "mediterranee-acier",
        supplierName: "Méditerranée Acier",
        price: 2550,
        currency: "USD",
        shippingDays: 18,
        location: "Marseille, France",
        moq: "1 ton",
        reliability: 88,
        bestFor: "EU proximity",
      },
    ],
  },
];

export function getComparisonByProductId(
  productId: string
): ProductComparison | undefined {
  return comparisons.find((c) => c.productId === productId);
}

export function getDefaultComparison(
  productId: string,
  productName: string
): ProductComparison {
  return {
    productId,
    productName,
    summary: `Compare supplier offers for ${productName}. Data is simulated for this MVP preview.`,
    bestPrice: { supplierName: "Sample Supplier A", price: 0, currency: "USD" },
    fastestDelivery: { supplierName: "Sample Supplier B", days: 7 },
    bestOverall: {
      supplierName: "Sample Supplier A",
      reason: "Placeholder — add full comparison data for this product",
    },
    offers: [
      {
        supplierId: "sample-a",
        supplierName: "Sample Supplier A",
        price: 100,
        currency: "USD",
        shippingDays: 10,
        location: "Global",
        moq: "1 unit",
        reliability: 85,
        bestFor: "General use",
      },
      {
        supplierId: "sample-b",
        supplierName: "Sample Supplier B",
        price: 95,
        currency: "USD",
        shippingDays: 14,
        location: "EU",
        moq: "5 units",
        reliability: 80,
        bestFor: "Budget option",
      },
    ],
  };
}
