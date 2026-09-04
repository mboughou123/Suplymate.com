// Scalable industry / category architecture.
//
// Every sector Suplymate covers is declared here once. Supplier profiles, the
// materials catalog, the AI matching engine and the marketplace filters all
// read from this list, so adding an industry is a data change, not a code
// change. `legacyCategories` maps a sector to the category strings already used
// by the imported supplier directory so existing data keeps working.

export type IndustryId =
  | "metals"
  | "construction"
  | "packaging"
  | "machinery"
  | "hardware-components"
  | "biomedical"
  | "electrical-industrial";

export type Industry = {
  id: IndustryId;
  name: string;
  tagline: string;
  /** Sub-categories / product families inside the sector. */
  subcategories: string[];
  /** Keywords used by the AI requirement parser and matcher (lowercase). */
  keywords: string[];
  /** Existing directory category labels that belong to this sector. */
  legacyCategories: string[];
};

export const INDUSTRIES: Industry[] = [
  {
    id: "metals",
    name: "Metals",
    tagline: "Steel, aluminum, copper and alloys from mills and distributors.",
    subcategories: ["Steel", "Aluminum", "Copper", "Stainless steel", "Brass", "Titanium"],
    keywords: [
      "steel", "aluminum", "aluminium", "copper", "stainless", "brass", "titanium",
      "alloy", "rebar", "coil", "sheet", "plate", "billet", "ingot", "6061", "7075",
      "304", "316", "metal", "mill", "wire rod", "bar", "beam",
    ],
    legacyCategories: ["Steel & Metals", "Tubes & Pipes", "Metal"],
  },
  {
    id: "construction",
    name: "Construction",
    tagline: "Cement, concrete, lumber, glass, insulation, roofing and pipes.",
    subcategories: ["Cement", "Concrete", "Lumber", "Glass", "Insulation", "Roofing", "Pipes"],
    keywords: [
      "cement", "concrete", "lumber", "timber", "wood", "glass", "insulation",
      "roofing", "pipe", "pipes", "construction", "building", "house", "brick",
      "aggregate", "drywall", "plaster", "tile",
    ],
    legacyCategories: ["Construction", "Construction & BTP", "Tubes & Pipes"],
  },
  {
    id: "packaging",
    name: "Packaging",
    tagline: "Boxes, plastic packaging, containers, labels and industrial packaging.",
    subcategories: ["Boxes", "Plastic packaging", "Containers", "Labels", "Industrial packaging"],
    keywords: [
      "packaging", "box", "boxes", "carton", "corrugated", "container", "pallet",
      "label", "labels", "film", "bag", "bottle", "crate", "drum", "plastic packaging",
    ],
    legacyCategories: ["Packaging", "Plastics & Packaging"],
  },
  {
    id: "machinery",
    name: "Machinery",
    tagline: "CNC machines, industrial equipment, pumps, compressors and motors.",
    subcategories: ["CNC machines", "Industrial equipment", "Manufacturing machinery", "Pumps", "Compressors", "Motors"],
    keywords: [
      "cnc", "machine", "machinery", "equipment", "pump", "pumps", "compressor",
      "motor", "motors", "lathe", "press", "conveyor", "robot", "manufacturing line",
      "injection molding", "extruder",
    ],
    legacyCategories: ["Industrial Equipment", "Industrial Parts"],
  },
  {
    id: "hardware-components",
    name: "Hardware Components",
    tagline: "Fasteners, bearings, connectors, cables, sensors, switches and power supplies.",
    subcategories: ["Fasteners", "Bearings", "Connectors", "Cables", "Sensors", "Switches", "Relays", "Power supplies", "Industrial electronics"],
    keywords: [
      "fastener", "fasteners", "bolt", "bolts", "screw", "nut", "bearing", "bearings",
      "connector", "connectors", "cable", "cables", "sensor", "sensors", "switch",
      "relay", "relays", "power supply", "psu", "hydraulic", "cylinder", "valve",
      "gasket", "seal", "component", "components",
    ],
    legacyCategories: ["Industrial Parts", "Cables & Electrical"],
  },
  {
    id: "biomedical",
    name: "Biomedical & Medical Manufacturing",
    tagline: "Medical, laboratory, pharmaceutical and biotech equipment and components.",
    subcategories: ["Medical equipment", "Laboratory equipment", "Medical components", "Pharmaceutical manufacturing equipment", "Medical packaging", "Biotech equipment"],
    keywords: [
      "medical", "biomedical", "laboratory", "lab", "pharmaceutical", "pharma",
      "biotech", "sterile", "clean room", "cleanroom", "diagnostic", "surgical",
      "iso 13485", "fda",
    ],
    legacyCategories: [],
  },
  {
    id: "electrical-industrial",
    name: "Electrical & Industrial",
    tagline: "Electrical components, automation, control systems and industrial power.",
    subcategories: ["Electrical components", "Industrial automation", "Control systems", "Motors", "Sensors", "Industrial power systems"],
    keywords: [
      "electrical", "automation", "plc", "control", "controls", "inverter", "transformer",
      "switchgear", "panel", "drive", "servo", "industrial power", "busbar", "wiring",
    ],
    legacyCategories: ["Cables & Electrical", "Electrotechnical & Cabling"],
  },
];

export const INDUSTRY_BY_ID = new Map(INDUSTRIES.map((i) => [i.id, i]));

export function getIndustry(id: string | null | undefined): Industry | undefined {
  return id ? INDUSTRY_BY_ID.get(id as IndustryId) : undefined;
}

/** Sector that a legacy directory category string belongs to (first match). */
export function industryForLegacyCategory(category: string | null | undefined): Industry | undefined {
  if (!category) return undefined;
  return INDUSTRIES.find((i) => i.legacyCategories.includes(category));
}

/** All industries whose keywords appear in free text, most matches first. */
export function detectIndustries(text: string): Industry[] {
  const lower = text.toLowerCase();
  return INDUSTRIES.map((industry) => ({
    industry,
    hits: industry.keywords.filter((k) => lower.includes(k)).length,
  }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.industry);
}
