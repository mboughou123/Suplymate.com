/**
 * Homepage AI demo walkthrough data.
 *
 * Supplier names and IDs come from the Suplymate verified network
 * (outscraper directory). Compare prices and Watch signals are illustrative
 * example values for the walkthrough — the UI labels the block accordingly.
 */

export type AiDemoSupplier = {
  id: string;
  name: string;
  country: string;
  verified: true;
};

export type AiDemoOffer = {
  supplierId: string;
  /** Illustrative unit price (USD/m) for the walkthrough */
  pricePerMeter: number;
  moq: string;
  leadDays: number;
};

/** Real verified mills from the Suplymate supplier network (UAE & India). */
export const AI_DEMO_SUPPLIERS: AiDemoSupplier[] = [
  {
    id: "al-gharbia-pipe-company-llc-ae",
    name: "Al Gharbia Pipe Company LLC",
    country: "UAE",
    verified: true,
  },
  {
    id: "ispat-alloys-tube-industries-mumbai",
    name: "Ispat Alloys & Tube Industries",
    country: "India",
    verified: true,
  },
  {
    id: "aj-steel-icad2-ae",
    name: "AJ STEEL - ICAD2",
    country: "UAE",
    verified: true,
  },
];

/** Illustrative side-by-side offers for the Compare agent step. */
export const AI_DEMO_OFFERS: AiDemoOffer[] = [
  {
    supplierId: "al-gharbia-pipe-company-llc-ae",
    pricePerMeter: 14.2,
    moq: "270 m",
    leadDays: 12,
  },
  {
    supplierId: "ispat-alloys-tube-industries-mumbai",
    pricePerMeter: 13.4,
    moq: "500 m",
    leadDays: 14,
  },
  {
    supplierId: "aj-steel-icad2-ae",
    pricePerMeter: 15.1,
    moq: "270 m",
    leadDays: 10,
  },
];

/** Catalog product referenced in the demo ask (real SKU in static catalogue). */
export const AI_DEMO_PRODUCT_ID = "hdpe-pipe";

/** Illustrative weekly HDPE / plastics index move for the Watch step. */
export const AI_DEMO_WEEKLY_CHANGE = -2.1;

export function getDemoSupplier(id: string): AiDemoSupplier | undefined {
  return AI_DEMO_SUPPLIERS.find((s) => s.id === id);
}
