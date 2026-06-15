// Verified global supplier directory.
//
// In production this table is populated by the Outscraper pipeline
// (scripts/outscraper/*) from PUBLIC Google Maps / business-listing data.
// This module deterministically generates a 100+ supplier sample dataset so the
// directory is fully populated and demonstrable without the paid API key.
// The site footer discloses this is an MVP preview with sample data.

import type { Supplier, SupplierCategory, Industry } from "./suppliers";
import { scoreSupplier } from "../lib/supplier-ranking";

type CountryInfo = {
  country: string;
  city: string;
  region: string;
  dial: string;
};

const COUNTRIES: CountryInfo[] = [
  { country: "United States", city: "Houston", region: "North America", dial: "+1" },
  { country: "Germany", city: "Stuttgart", region: "EU", dial: "+49" },
  { country: "China", city: "Shenzhen", region: "Asia", dial: "+86" },
  { country: "Turkey", city: "Istanbul", region: "EU & MENA", dial: "+90" },
  { country: "United Arab Emirates", city: "Dubai", region: "MENA", dial: "+971" },
  { country: "India", city: "Mumbai", region: "Asia", dial: "+91" },
  { country: "Italy", city: "Milan", region: "EU", dial: "+39" },
  { country: "Morocco", city: "Casablanca", region: "North Africa", dial: "+212" },
  { country: "Mexico", city: "Monterrey", region: "North America", dial: "+52" },
  { country: "France", city: "Lyon", region: "EU", dial: "+33" },
  { country: "Spain", city: "Barcelona", region: "EU", dial: "+34" },
  { country: "United Kingdom", city: "Birmingham", region: "UK & EU", dial: "+44" },
  { country: "Netherlands", city: "Rotterdam", region: "EU", dial: "+31" },
  { country: "Poland", city: "Katowice", region: "EU", dial: "+48" },
  { country: "Vietnam", city: "Ho Chi Minh City", region: "Asia", dial: "+84" },
  { country: "Brazil", city: "São Paulo", region: "Americas", dial: "+55" },
  { country: "South Korea", city: "Busan", region: "Asia", dial: "+82" },
  { country: "Saudi Arabia", city: "Dammam", region: "MENA", dial: "+966" },
];

type CategorySpec = {
  category: SupplierCategory;
  industry: Industry;
  nameWords: string[];
  products: string[];
  moq: string;
};

const CATEGORY_SPECS: CategorySpec[] = [
  {
    category: "Steel & Metals",
    industry: "Metal",
    nameWords: ["Steel Works", "Metals Group", "Alloy Industries", "Forge & Metal Co."],
    products: [
      "Hot-rolled steel coils",
      "Structural steel beams",
      "Stainless steel plates",
      "Galvanized sheets",
      "Aluminum billets",
    ],
    moq: "5 tons",
  },
  {
    category: "Cables & Electrical",
    industry: "Electrotechnical & Cabling",
    nameWords: ["Cable Systems", "Electric Industries", "Power Cabling", "Wire & Cable Co."],
    products: [
      "Power transmission cables",
      "Fiber optic cabling",
      "Industrial control panels",
      "Copper wiring",
      "Medium-voltage switchgear",
    ],
    moq: "500 m",
  },
  {
    category: "Tubes & Pipes",
    industry: "Metal",
    nameWords: ["Tube Manufacturing", "Pipe Industries", "Piping Systems", "Tube & Pipe Co."],
    products: [
      "Seamless steel pipes",
      "Welded steel tubes",
      "PVC pressure pipes",
      "Copper tubing",
      "Industrial pipe fittings",
    ],
    moq: "2 tons",
  },
  {
    category: "Packaging",
    industry: "Plastics & Packaging",
    nameWords: ["Packaging Group", "Pack Industries", "Packaging Solutions", "Pack & Wrap Co."],
    products: [
      "Corrugated shipping boxes",
      "Industrial stretch film",
      "PET bottles & jars",
      "Custom printed cartons",
      "Shrink wrap rolls",
    ],
    moq: "2,000 units",
  },
  {
    category: "Construction",
    industry: "Construction & BTP",
    nameWords: ["Construction Supply", "Building Materials", "Construct Group", "BuildMat Co."],
    products: [
      "Portland cement",
      "Construction aggregates",
      "Thermal insulation panels",
      "Reinforcement rebar",
      "Waterproof membranes",
    ],
    moq: "1 pallet",
  },
  {
    category: "Industrial Parts",
    industry: "Industrial Equipment",
    nameWords: ["Industrial Parts", "Machinery Components", "Industrial Supply", "Parts & Components Co."],
    products: [
      "Precision bearings",
      "Hydraulic valves",
      "Gearboxes & reducers",
      "Pneumatic actuators",
      "CNC-machined components",
    ],
    moq: "10 units",
  },
];

const REGION_DELIVERY: Record<string, string[]> = {
  "North America": ["North America", "Mexico", "EU"],
  EU: ["EU", "UK", "MENA"],
  Asia: ["Asia", "EU", "Africa", "Middle East"],
  "EU & MENA": ["EU", "MENA", "North Africa"],
  MENA: ["MENA", "Asia", "Africa"],
  "North Africa": ["North Africa", "EU", "West Africa"],
  Americas: ["Americas", "EU"],
  "UK & EU": ["UK", "EU", "North America"],
};

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildSupplier(spec: CategorySpec, c: CountryInfo, idx: number): Supplier {
  const word = spec.nameWords[idx % spec.nameWords.length];
  const name = `${c.city} ${word}`;
  const id = slugify(name);
  const seed = hash(id);

  const googleRating = Math.min(4.9, 4.0 + ((seed % 10) / 10));
  const googleReviews = 24 + (seed % 1180);
  const verified = seed % 100 < 72;
  const slug = slugify(`${c.city}-${word}`);
  const website = `https://www.${slug}.com`;
  const hasEmail = seed % 5 !== 0;
  const email = hasEmail ? `sales@${slug.replace(/-/g, "")}.com` : undefined;
  const phone = `${c.dial} ${100 + (seed % 899)} ${1000 + (seed % 8999)}`;
  const products = [
    spec.products[seed % spec.products.length],
    spec.products[(seed + 2) % spec.products.length],
    spec.products[(seed + 4) % spec.products.length],
  ].filter((p, i, arr) => arr.indexOf(p) === i);
  const deliveryRegions = REGION_DELIVERY[c.region] ?? ["EU", "Asia"];
  const reliabilityScore = 80 + (seed % 19);

  const description =
    `${name} is a ${verified ? "verified " : ""}${spec.category.toLowerCase()} ` +
    `supplier based in ${c.city}, ${c.country}, serving B2B buyers across ` +
    `${deliveryRegions.join(", ")}. They specialize in ${products[0].toLowerCase()} ` +
    `and ${(products[1] ?? products[0]).toLowerCase()} with export-ready logistics ` +
    `and competitive MOQs from ${spec.moq}.`;

  const base: Supplier = {
    id,
    name,
    industry: spec.industry,
    category: spec.category,
    location: `${c.city}, ${c.country}`,
    country: c.country,
    city: c.city,
    website,
    phone,
    email,
    googleRating: Math.round(googleRating * 10) / 10,
    googleReviews,
    rating: Math.round(googleRating * 10) / 10,
    reviewCount: googleReviews,
    verified,
    description,
    products,
    deliveryRegions,
    moq: spec.moq,
    address: `${100 + (seed % 900)} Industrial Avenue, ${c.city}`,
    openingHours: "Mon–Fri 8:00–18:00",
    sourceUrl: `https://www.google.com/maps/search/${encodeURIComponent(`${name} ${c.city}`)}`,
    reliabilityScore,
    yearsInBusiness: 5 + (seed % 30),
    lastUpdated: "2026-06-14",
  };

  return { ...base, score: scoreSupplier(base) };
}

function generate(): Supplier[] {
  const out: Supplier[] = [];
  for (const spec of CATEGORY_SPECS) {
    COUNTRIES.forEach((c, i) => {
      out.push(buildSupplier(spec, c, i));
    });
  }
  // Sort best-first by score so the directory leads with top suppliers.
  return out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

export const verifiedSuppliers: Supplier[] = generate();
