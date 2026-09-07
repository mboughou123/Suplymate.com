// Search queries for the verified supplier directory.
//
// Compliance: these target ONLY public Google Maps / business-listing data via
// the Outscraper API. No private data, no CAPTCHA bypass, no logins. Every
// imported supplier keeps its public source URL.

export type SupplierCategory =
  | "Steel & Metals"
  | "Cables & Electrical"
  | "Tubes & Pipes"
  | "Packaging"
  | "Construction"
  | "Industrial Parts";

export type CategoryQuery = {
  category: SupplierCategory;
  industry: string;
  moq: string;
  defaultProducts: string[];
  // {country} is substituted per target country.
  templates: string[];
};

export const TARGET_COUNTRIES = [
  "USA",
  "Germany",
  "China",
  "Turkey",
  "UAE",
  "India",
  "Italy",
  "Morocco",
  "Mexico",
  "Spain",
];

export const CATEGORY_QUERIES: CategoryQuery[] = [
  {
    category: "Steel & Metals",
    industry: "Metal",
    moq: "5 tons",
    defaultProducts: ["Steel coils", "Structural beams", "Steel plates"],
    templates: [
      "verified steel suppliers {country}",
      "industrial metal suppliers {country}",
      "steel manufacturers {country}",
    ],
  },
  {
    category: "Cables & Electrical",
    industry: "Electrotechnical & Cabling",
    moq: "500 m",
    defaultProducts: ["Power cables", "Control panels", "Copper wiring"],
    templates: [
      "electrical cable manufacturers {country}",
      "industrial electrical suppliers {country}",
    ],
  },
  {
    category: "Tubes & Pipes",
    industry: "Metal",
    moq: "2 tons",
    defaultProducts: ["Steel pipes", "Welded tubes", "Pipe fittings"],
    templates: [
      "tubes and pipes manufacturers {country}",
      "industrial pipe suppliers {country}",
    ],
  },
  {
    category: "Packaging",
    industry: "Plastics & Packaging",
    moq: "2,000 units",
    defaultProducts: ["Corrugated boxes", "Stretch film", "Custom cartons"],
    templates: [
      "packaging suppliers {country}",
      "industrial packaging manufacturers {country}",
    ],
  },
  {
    category: "Construction",
    industry: "Construction & BTP",
    moq: "1 pallet",
    defaultProducts: ["Cement", "Aggregates", "Insulation panels"],
    templates: [
      "construction material suppliers {country}",
      "wholesale construction suppliers {country}",
    ],
  },
  {
    category: "Industrial Parts",
    industry: "Industrial Equipment",
    moq: "10 units",
    defaultProducts: ["Bearings", "Hydraulic valves", "Gearboxes"],
    templates: [
      "industrial parts suppliers {country}",
      "B2B industrial suppliers {country}",
    ],
  },
];

export function buildQueries(limitPerQuery = 20) {
  const jobs: { query: string; category: SupplierCategory }[] = [];
  for (const cat of CATEGORY_QUERIES) {
    for (const country of TARGET_COUNTRIES) {
      // Use the first template per (category, country) to control API cost;
      // add more templates here to widen coverage.
      const query = cat.templates[0].replace("{country}", country);
      jobs.push({ query, category: cat.category });
    }
  }
  return { jobs, limitPerQuery };
}
