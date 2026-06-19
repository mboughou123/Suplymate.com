export type Industry =
  | "Metal"
  | "Construction & BTP"
  | "Industrial Equipment"
  | "Electrotechnical & Cabling"
  | "Plastics & Packaging"
  | "Agriculture & Agrofood";

// Primary directory categories (match the verified supplier database search).
export type SupplierCategory =
  | "Steel & Metals"
  | "Cables & Electrical"
  | "Tubes & Pipes"
  | "Packaging"
  | "Construction"
  | "Industrial Parts";

export const supplierCategories: SupplierCategory[] = [
  "Steel & Metals",
  "Cables & Electrical",
  "Tubes & Pipes",
  "Packaging",
  "Construction",
  "Industrial Parts",
];

export type Supplier = {
  id: string;
  name: string;
  industry: Industry;
  location: string;
  products: string[];
  deliveryRegions: string[];
  moq: string;
  reliabilityScore: number;
  // Optional rich marketplace fields (filled deterministically when absent)
  logoUrl?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  yearsInBusiness?: number;
  employees?: string;
  // Verified global supplier directory fields (from Outscraper / public data)
  category?: SupplierCategory;
  country?: string;
  city?: string;
  website?: string;
  phone?: string;
  email?: string;
  googleRating?: number;
  googleReviews?: number;
  description?: string;
  address?: string;
  openingHours?: string;
  sourceUrl?: string;
  score?: number;
  lastUpdated?: string;
  // ----- Supplier import & scraping system (optional, additive) -----
  /** Company / factory gallery image URLs collected via import/scrape. */
  supplierImages?: string[];
  /** Certification badge / certificate image URLs. */
  certificationImages?: string[];
  /** Structured certification details (name/type/links). */
  certificationsDetailed?: {
    name: string;
    type?: string | null;
    imageUrl?: string | null;
    certificateUrl?: string | null;
    sourceUrl?: string | null;
  }[];
  /** Moderation state: pending | verified | rejected | needs_info. */
  verificationStatus?: "pending" | "verified" | "rejected" | "needs_info";
  /** 0–100 data-completeness trust score. */
  trustScore?: number;
};

export const industries: Industry[] = [
  "Metal",
  "Construction & BTP",
  "Industrial Equipment",
  "Electrotechnical & Cabling",
  "Plastics & Packaging",
  "Agriculture & Agrofood",
];

export const suppliers: Supplier[] = [
  {
    id: "atlas-steel",
    name: "Atlas Steel Supplier",
    industry: "Metal",
    location: "Houston, USA",
    products: ["Hot-rolled steel coils", "Structural beams", "Steel plates"],
    deliveryRegions: ["North America", "EU", "MENA"],
    moq: "5 tons",
    reliabilityScore: 92,
  },
  {
    id: "mediterranee-acier",
    name: "Méditerranée Acier",
    industry: "Metal",
    location: "Marseille, France",
    products: ["Rebar", "Galvanized sheets", "Stainless tubes"],
    deliveryRegions: ["EU", "North Africa"],
    moq: "2 tons",
    reliabilityScore: 88,
  },
  {
    id: "buildpro-materiaux",
    name: "BuildPro Matériaux",
    industry: "Construction & BTP",
    location: "Lyon, France",
    products: ["Cement", "Aggregates", "Insulation panels"],
    deliveryRegions: ["France", "Belgium", "Switzerland"],
    moq: "1 pallet",
    reliabilityScore: 85,
  },
  {
    id: "nordic-construct",
    name: "Nordic Construct Supply",
    industry: "Construction & BTP",
    location: "Oslo, Norway",
    products: ["Timber frames", "Concrete additives", "Waterproof membranes"],
    deliveryRegions: ["Nordics", "UK", "Baltics"],
    moq: "500 kg",
    reliabilityScore: 90,
  },
  {
    id: "precision-machinery",
    name: "Precision Machinery Co.",
    industry: "Industrial Equipment",
    location: "Stuttgart, Germany",
    products: ["CNC machines", "Conveyor systems", "Hydraulic presses"],
    deliveryRegions: ["EU", "USA", "Asia"],
    moq: "1 unit",
    reliabilityScore: 94,
  },
  {
    id: "industrial-motion",
    name: "Industrial Motion Works",
    industry: "Industrial Equipment",
    location: "Detroit, USA",
    products: ["Motors", "Gearboxes", "Pneumatic actuators"],
    deliveryRegions: ["North America", "Mexico"],
    moq: "10 units",
    reliabilityScore: 87,
  },
  {
    id: "voltline-cables",
    name: "VoltLine Cabling",
    industry: "Electrotechnical & Cabling",
    location: "Milan, Italy",
    products: ["Power cables", "Fiber optics", "Control panels"],
    deliveryRegions: ["EU", "MENA"],
    moq: "500 m",
    reliabilityScore: 91,
  },
  {
    id: "electra-global",
    name: "Electra Global Components",
    industry: "Electrotechnical & Cabling",
    location: "Shenzhen, China",
    products: ["Connectors", "Transformers", "Switchgear"],
    deliveryRegions: ["Asia", "EU", "Africa"],
    moq: "1,000 units",
    reliabilityScore: 83,
  },
  {
    id: "packsmart",
    name: "PackSmart Industries",
    industry: "Plastics & Packaging",
    location: "Rotterdam, Netherlands",
    products: ["PET films", "Shrink wrap", "Custom containers"],
    deliveryRegions: ["EU", "UK"],
    moq: "2,000 units",
    reliabilityScore: 86,
  },
  {
    id: "polymer-hub",
    name: "Polymer Hub International",
    industry: "Plastics & Packaging",
    location: "Dubai, UAE",
    products: ["HDPE granules", "Injection molds", "Biodegradable packaging"],
    deliveryRegions: ["MENA", "Asia", "Africa"],
    moq: "1 ton",
    reliabilityScore: 84,
  },
  {
    id: "agrofresh",
    name: "AgroFresh Logistics",
    industry: "Agriculture & Agrofood",
    location: "Valencia, Spain",
    products: ["Cold-chain packaging", "Organic fertilizers", "Irrigation systems"],
    deliveryRegions: ["EU", "North Africa"],
    moq: "200 units",
    reliabilityScore: 89,
  },
  {
    id: "grainline",
    name: "GrainLine Commodities",
    industry: "Agriculture & Agrofood",
    location: "Chicago, USA",
    products: ["Wheat bulk", "Soy protein", "Food-grade oils"],
    deliveryRegions: ["Americas", "Asia"],
    moq: "10 tons",
    reliabilityScore: 90,
  },
];

export function getSupplierById(id: string): Supplier | undefined {
  return suppliers.find((s) => s.id === id);
}
