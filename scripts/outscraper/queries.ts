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

// `moq` and `defaultProducts` used to live here and were written onto every
// imported supplier as if they were facts about that company. They were not:
// each steel supplier got "5 tons" and "Steel coils, Structural beams, Steel
// plates" regardless of what it actually sells. Across 340 suppliers there were
// only six distinct product lists. A search query cannot tell us a company's
// catalogue or its minimum order, so neither field is derived here any more.
export type CategoryQuery = {
  category: SupplierCategory;
  industry: string;
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
    templates: [
      "verified steel suppliers {country}",
      "industrial metal suppliers {country}",
      "steel manufacturers {country}",
    ],
  },
  {
    category: "Cables & Electrical",
    industry: "Electrotechnical & Cabling",
    templates: [
      "electrical cable manufacturers {country}",
      "industrial electrical suppliers {country}",
    ],
  },
  {
    category: "Tubes & Pipes",
    industry: "Metal",
    templates: [
      "tubes and pipes manufacturers {country}",
      "industrial pipe suppliers {country}",
    ],
  },
  {
    category: "Packaging",
    industry: "Plastics & Packaging",
    templates: [
      "packaging suppliers {country}",
      "industrial packaging manufacturers {country}",
    ],
  },
  {
    category: "Construction",
    industry: "Construction & BTP",
    templates: [
      "construction material suppliers {country}",
      "wholesale construction suppliers {country}",
    ],
  },
  {
    category: "Industrial Parts",
    industry: "Industrial Equipment",
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
