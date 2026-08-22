// Types for the supplier offer comparison view.
//
// The fabricated dataset that used to live here has been removed. It invented
// prices, shipping times, reliability percentages and "best overall" verdicts
// and attributed them to companies that do not exist. None of it was reachable
// from a page, but it was one wiring-up away from being published as fact.
//
// A real comparison must be built from SupplierQuote rows, which carry prices a
// supplier actually offered. Until that exists there is no honest data to show.

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
