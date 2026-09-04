// Suplymate material catalog.
//
// The single list of materials the platform knows about. Price charts only show
// materials declared here, the AI assistant's "material intelligence" answers
// come from here, and supplier matching maps free-text requirements onto these
// ids. Adding a material = adding an entry.

import type { IndustryId } from "@/data/industries";

export type MaterialCatalogEntry = {
  id: string;
  name: string;
  industry: IndustryId;
  category: string;
  /** Short one-line description. */
  summary: string;
  /** Key engineering / commercial properties. */
  properties: string[];
  /** Typical applications. */
  applications: string[];
  /** Common grades / specs buyers ask for. */
  grades?: string[];
  /** Materials that are often substituted for this one (catalog ids or names). */
  alternatives: string[];
  /** What moves the price. */
  priceDrivers: string[];
  /** Things to check when manufacturing / specifying. */
  manufacturingNotes: string[];
  /** Search aliases (lowercase). */
  aliases: string[];
  /** Typical quoted unit. */
  unit: string;
};

export const MATERIAL_CATALOG: MaterialCatalogEntry[] = [
  {
    id: "steel",
    name: "Steel",
    industry: "metals",
    category: "Metals",
    summary: "Carbon steel — the workhorse structural and fabrication metal.",
    properties: ["High strength and stiffness", "Weldable and machinable", "Rusts without coating", "Magnetic"],
    applications: ["Structural beams and rebar", "Fabricated frames", "Pipes and tubes", "Machinery bases"],
    grades: ["S235 / S355 (EN)", "A36 / A572 (ASTM)", "Q235 / Q345 (GB)", "HRC / CRC coil"],
    alternatives: ["stainless-steel", "aluminum"],
    priceDrivers: ["Iron ore and scrap prices", "Coking coal / energy", "Mill capacity and tariffs", "Freight"],
    manufacturingNotes: ["Specify grade + standard, not just 'steel'", "Ask for mill test certificates (MTC)", "Confirm coating (galvanised / painted) for corrosion"],
    aliases: ["carbon steel", "mild steel", "rebar", "hrc", "crc", "structural steel", "steel coil", "steel plate"],
    unit: "USD/ton",
  },
  {
    id: "stainless-steel",
    name: "Stainless Steel",
    industry: "metals",
    category: "Metals",
    summary: "Chromium-alloyed steel with strong corrosion resistance.",
    properties: ["Corrosion resistant", "Hygienic, easy to clean", "Higher cost than carbon steel", "304 is non-magnetic when annealed"],
    applications: ["Food and pharma equipment", "Architectural cladding", "Tanks and process piping", "Medical devices"],
    grades: ["304 / 1.4301", "316L / 1.4404 (marine, chemical)", "430 (ferritic, lower cost)", "2205 duplex"],
    alternatives: ["steel", "aluminum", "titanium"],
    priceDrivers: ["Nickel and chromium prices", "Alloy surcharges", "Energy", "Mill lead times"],
    manufacturingNotes: ["316L for chlorides / marine", "Specify surface finish (2B, No.4, BA)", "Avoid carbon-steel contamination during fabrication"],
    aliases: ["stainless", "inox", "304", "316", "316l", "ss304", "ss316"],
    unit: "USD/ton",
  },
  {
    id: "aluminum",
    name: "Aluminum",
    industry: "metals",
    category: "Metals",
    summary: "Lightweight, corrosion-resistant non-ferrous metal.",
    properties: ["About one-third the density of steel", "Naturally corrosion resistant", "Excellent conductivity", "Lower stiffness than steel"],
    applications: ["Extrusions and profiles", "Enclosures and heat sinks", "Transport and aerospace parts", "Packaging foil and cans"],
    grades: ["6061-T6 (general structural, weldable)", "7075-T6 (high strength, aerospace, not weldable)", "5052 (sheet, marine)", "6063 (architectural extrusions)"],
    alternatives: ["steel", "stainless-steel", "titanium"],
    priceDrivers: ["LME aluminium price", "Alumina and electricity costs", "Regional premiums", "Extrusion / conversion fees"],
    manufacturingNotes: ["6061 vs 7075: 7075 is ~1.5x stronger but not weldable and costs more", "Anodise or powder-coat for finish", "Check temper (T6, T651)"],
    aliases: ["aluminium", "6061", "7075", "5052", "6063", "alu", "aluminum extrusion", "aluminum sheet"],
    unit: "USD/ton",
  },
  {
    id: "copper",
    name: "Copper",
    industry: "metals",
    category: "Metals",
    summary: "Highly conductive metal for electrical and thermal applications.",
    properties: ["Best conductivity after silver", "Ductile and formable", "Antimicrobial surface", "Price volatile"],
    applications: ["Wire and cable", "Busbars", "Heat exchangers", "Plumbing tube"],
    grades: ["C11000 ETP (electrical)", "C12200 DHP (tube)", "OFHC (oxygen-free)"],
    alternatives: ["aluminum", "brass"],
    priceDrivers: ["LME / COMEX copper", "Mine supply and China demand", "Energy transition demand", "Scrap availability"],
    manufacturingNotes: ["Aluminium conductors need ~1.6x cross-section for same current", "Specify purity for electrical use", "Consider copper-clad aluminium for cost"],
    aliases: ["cu", "copper wire", "copper tube", "copper cathode", "busbar"],
    unit: "USD/lb",
  },
  {
    id: "brass",
    name: "Brass",
    industry: "metals",
    category: "Metals",
    summary: "Copper-zinc alloy that machines beautifully.",
    properties: ["Excellent machinability", "Corrosion resistant", "Decorative finish", "Lead-free grades available"],
    applications: ["Fittings and valves", "Fasteners", "Decorative hardware", "Musical instruments"],
    grades: ["C36000 free-cutting", "C27000 yellow brass", "CW617N (EU)", "Lead-free C69300"],
    alternatives: ["copper", "stainless-steel", "aluminum"],
    priceDrivers: ["Copper and zinc prices", "Lead-free regulation", "Bar mill capacity"],
    manufacturingNotes: ["Check lead content for potable water (NSF/61, EU)", "Dezincification-resistant grades for hot water"],
    aliases: ["c36000", "brass fittings", "brass bar"],
    unit: "USD/ton",
  },
  {
    id: "titanium",
    name: "Titanium",
    industry: "metals",
    category: "Metals",
    summary: "High strength-to-weight, biocompatible, corrosion-proof — and expensive.",
    properties: ["Strength of steel at ~56% weight", "Outstanding corrosion resistance", "Biocompatible", "Difficult to machine"],
    applications: ["Aerospace structures", "Medical implants", "Chemical process equipment", "Premium consumer hardware"],
    grades: ["Grade 2 (CP, formable)", "Grade 5 / Ti-6Al-4V (high strength)", "Grade 23 (ELI, medical)"],
    alternatives: ["stainless-steel", "aluminum"],
    priceDrivers: ["Sponge supply (few producers)", "Aerospace demand cycles", "Energy-intensive processing"],
    manufacturingNotes: ["Budget 5–10x stainless for raw material", "Specialised machining and welding (inert gas)", "Ask for ASTM B348 / AMS certs"],
    aliases: ["ti", "ti-6al-4v", "grade 5 titanium", "grade 2 titanium"],
    unit: "USD/kg",
  },
  {
    id: "iron-ore",
    name: "Iron Ore",
    industry: "metals",
    category: "Metals",
    summary: "Upstream input for steelmaking; a leading indicator for steel prices.",
    properties: ["Traded as fines, lumps and pellets", "Grade quoted as Fe %"],
    applications: ["Blast-furnace steelmaking", "DRI / pellet plants"],
    grades: ["62% Fe fines benchmark", "65% Fe pellets"],
    alternatives: ["steel"],
    priceDrivers: ["Chinese steel output", "Australian / Brazilian supply", "Freight rates"],
    manufacturingNotes: ["Relevant to buyers as a steel price signal, rarely bought directly by SMEs"],
    aliases: ["fe", "ore", "iron"],
    unit: "USD/ton",
  },
  {
    id: "zinc",
    name: "Zinc",
    industry: "metals",
    category: "Metals",
    summary: "Galvanising metal that protects steel from corrosion.",
    properties: ["Sacrificial corrosion protection", "Low melting point", "Die-castable"],
    applications: ["Galvanised steel", "Die-cast hardware", "Brass alloying"],
    alternatives: ["aluminum"],
    priceDrivers: ["LME zinc", "Smelter capacity", "Galvanised steel demand"],
    manufacturingNotes: ["Galvanising thickness (g/m²) drives cost and life", "Hot-dip vs electro-galvanised"],
    aliases: ["zn", "galvanized", "galvanised", "galvanising"],
    unit: "USD/ton",
  },
  {
    id: "nickel",
    name: "Nickel",
    industry: "metals",
    category: "Metals",
    summary: "Key alloying metal for stainless steel and batteries.",
    properties: ["Corrosion resistance", "High-temperature strength", "Price volatile"],
    applications: ["Stainless steel alloying", "Superalloys", "Battery cathodes", "Plating"],
    alternatives: ["stainless-steel"],
    priceDrivers: ["LME nickel", "Indonesian supply", "EV battery demand"],
    manufacturingNotes: ["Nickel moves stainless alloy surcharges — watch it when buying 304/316"],
    aliases: ["ni", "nickel plating"],
    unit: "USD/ton",
  },
  {
    id: "cement",
    name: "Cement",
    industry: "construction",
    category: "Construction",
    summary: "Binder for concrete and mortar; bought regionally.",
    properties: ["Regional market (heavy, low value)", "Standard grades by strength", "Shelf-life sensitive"],
    applications: ["Concrete", "Mortar and render", "Precast elements"],
    grades: ["CEM I 42.5 / 52.5 (EN 197)", "Type I / II (ASTM C150)", "OPC 43 / 53 (IS)"],
    alternatives: ["Blended cements (CEM II/III)", "Geopolymer binders"],
    priceDrivers: ["Energy (kiln fuel)", "Carbon costs", "Local plant capacity", "Transport distance"],
    manufacturingNotes: ["Buy locally — freight kills economics beyond ~300 km", "Check strength class and setting time for the application"],
    aliases: ["portland cement", "opc", "cem i", "cem ii"],
    unit: "USD/ton",
  },
  {
    id: "lumber",
    name: "Lumber",
    industry: "construction",
    category: "Construction",
    summary: "Sawn softwood for framing, formwork and pallets.",
    properties: ["Renewable", "Grade-stamped for strength", "Moisture sensitive", "Seasonal pricing"],
    applications: ["Timber framing", "Formwork", "Pallets and crates", "Furniture"],
    grades: ["C24 / C16 (EN 338)", "#2 & Better SPF", "Kiln-dried (KD) vs green"],
    alternatives: ["Light-gauge steel framing", "Engineered timber (LVL, CLT)"],
    priceDrivers: ["Housing starts", "Sawmill capacity", "Tariffs and duties", "Wildfire / beetle supply shocks"],
    manufacturingNotes: ["Specify moisture content and treatment (pressure-treated)", "Check certification (FSC / PEFC) if required"],
    aliases: ["timber", "wood", "sawn timber", "softwood", "spf", "plywood"],
    unit: "USD/1000 bf",
  },
  {
    id: "plastics-index",
    name: "Plastics (resin index)",
    industry: "packaging",
    category: "Packaging & Plastics",
    summary: "Commodity polymer resins used in packaging and moulded parts.",
    properties: ["Wide family: PE, PP, PET, PVC, ABS", "Price follows oil and gas", "Recycled grades available"],
    applications: ["Bottles and films", "Injection-moulded parts", "Pipes (PVC, HDPE)", "Industrial packaging"],
    grades: ["HDPE / LDPE", "PP homopolymer / copolymer", "PET bottle grade", "ABS"],
    alternatives: ["Recycled resin (rPET, rHDPE)", "Paper-based packaging", "Bioplastics (PLA)"],
    priceDrivers: ["Crude oil and naphtha", "Cracker outages", "Regional supply / demand", "Freight"],
    manufacturingNotes: ["Specify polymer AND grade (MFI, additives)", "Ask for food-contact compliance where relevant", "Tooling cost dominates small-run moulded parts"],
    aliases: ["plastic", "plastics", "resin", "polymer", "pe", "pp", "pet", "hdpe", "pvc", "abs", "polyethylene", "polypropylene"],
    unit: "Index pts",
  },
  {
    id: "glass",
    name: "Glass",
    industry: "construction",
    category: "Construction",
    summary: "Float glass and processed glazing for buildings and products.",
    properties: ["Transparent, rigid", "Heavy and fragile in transit", "Can be tempered, laminated, coated"],
    applications: ["Windows and façades", "Display cases", "Appliance panels"],
    grades: ["Float 4–12 mm", "Tempered (toughened)", "Laminated (safety)", "Low-E coated"],
    alternatives: ["Polycarbonate", "Acrylic (PMMA)"],
    priceDrivers: ["Natural gas (furnaces)", "Soda ash", "Regional float capacity"],
    manufacturingNotes: ["Processing (cutting, tempering) must happen before tempering", "Packaging and crating matter for export"],
    aliases: ["float glass", "tempered glass", "glazing"],
    unit: "USD/m²",
  },
  {
    id: "insulation",
    name: "Insulation",
    industry: "construction",
    category: "Construction",
    summary: "Thermal and acoustic insulation for buildings and industry.",
    properties: ["Rated by R-value / λ", "Mineral, foam or natural fibre", "Fire class matters"],
    applications: ["Walls and roofs", "HVAC ducting", "Industrial pipe insulation"],
    grades: ["Mineral wool (glass / rock)", "EPS / XPS", "PIR / PUR boards"],
    alternatives: ["Cellulose", "Wood fibre", "Aerogel (premium)"],
    priceDrivers: ["Energy", "Chemical feedstocks (foam)", "Building regulation cycles"],
    manufacturingNotes: ["Specify thickness AND λ, plus fire class (Euroclass / ASTM E84)"],
    aliases: ["mineral wool", "rockwool", "glass wool", "eps", "xps", "pir"],
    unit: "USD/m²",
  },
];

export const MATERIAL_BY_ID = new Map(MATERIAL_CATALOG.map((m) => [m.id, m]));

export function getCatalogMaterial(id: string | null | undefined): MaterialCatalogEntry | undefined {
  return id ? MATERIAL_BY_ID.get(id) : undefined;
}

/** Only ids declared in the catalog are chartable / displayable. */
export function isCatalogMaterial(id: string): boolean {
  return MATERIAL_BY_ID.has(id);
}

/** Find catalog materials referenced in free text, most specific first. */
export function detectMaterials(text: string): MaterialCatalogEntry[] {
  const lower = ` ${text.toLowerCase()} `;
  const scored = MATERIAL_CATALOG.map((m) => {
    const terms = [m.name.toLowerCase(), ...m.aliases];
    let hits = 0;
    for (const term of terms) {
      const re = new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i");
      if (re.test(lower)) hits += term.length > 3 ? 2 : 1;
    }
    return { m, hits };
  })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.map((x) => x.m);
}
