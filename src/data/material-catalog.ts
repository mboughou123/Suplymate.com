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
  {
    id: "tin",
    name: "Tin",
    industry: "metals",
    category: "Metals",
    summary: "Soft, corrosion-resistant metal for solder and tinplate.",
    properties: ["Low melting point", "Corrosion resistant and non-toxic", "Small, concentrated market — volatile"],
    applications: ["Electronics solder", "Tinplate cans and closures", "Bronze and pewter alloys", "Chemical stabilisers (PVC)"],
    grades: ["Sn 99.85% (LME)", "Sn99.3Cu0.7 / SAC305 lead-free solder"],
    alternatives: ["Lacquered steel (tin-free steel)", "aluminum"],
    priceDrivers: ["LME tin", "Myanmar / Indonesia mine supply", "Semiconductor and electronics demand"],
    manufacturingNotes: ["Tinplate coating weight (E2.8/2.8) drives can cost", "Specify RoHS-compliant lead-free solder alloys"],
    aliases: ["solder", "tinplate", "tin plate"],
    unit: "USD/ton",
  },
  {
    id: "lead",
    name: "Lead (metal)",
    industry: "metals",
    category: "Metals",
    summary: "Dense metal used in batteries, cable sheathing and radiation shielding.",
    properties: ["Very dense", "Corrosion resistant", "Toxic — tightly regulated", "Highly recycled"],
    applications: ["Lead-acid batteries", "Power cable sheathing", "Radiation shielding", "Ballast and weights"],
    alternatives: ["Lithium-ion (batteries)", "Tungsten (shielding)"],
    priceDrivers: ["LME lead", "Battery recycling rates", "Automotive and backup-power demand"],
    manufacturingNotes: ["Check REACH / RoHS restrictions before specifying", "Secondary (recycled) lead dominates supply"],
    aliases: ["pb", "lead sheathing", "lead acid", "lead-acid", "lead ingot"],
    unit: "USD/ton",
  },
  {
    id: "chromium",
    name: "Chromium",
    industry: "metals",
    category: "Metals",
    summary: "Alloying element that makes stainless steel stainless.",
    properties: ["Forms passive oxide layer", "Hard, high melting point", "Bought mainly as ferrochrome"],
    applications: ["Stainless steel (≥10.5% Cr)", "Chrome plating", "Superalloys", "Refractories"],
    alternatives: ["nickel", "molybdenum"],
    priceDrivers: ["Ferrochrome supply (South Africa, Kazakhstan)", "Stainless steel output", "Electricity costs"],
    manufacturingNotes: ["Moves stainless alloy surcharges together with nickel", "Hexavalent chrome plating is restricted (REACH)"],
    aliases: ["ferrochrome", "chrome"],
    unit: "USD/ton",
  },
  {
    id: "molybdenum",
    name: "Molybdenum",
    industry: "metals",
    category: "Metals",
    summary: "Alloying metal for 316 stainless, alloy steel pipe and tooling.",
    properties: ["Raises strength at temperature", "Improves pitting resistance", "By-product of copper mining"],
    applications: ["316 / duplex stainless", "Alloy steel line pipe (OCTG)", "Tool steels", "Catalysts"],
    alternatives: ["chromium", "nickel"],
    priceDrivers: ["Copper mine by-product output", "Oil & gas pipe demand", "Chinese supply"],
    manufacturingNotes: ["316 carries a moly surcharge on top of 304 pricing", "Ask mills for alloy surcharge breakdown"],
    aliases: ["moly", "ferromolybdenum"],
    unit: "USD/ton",
  },
  {
    id: "cobalt",
    name: "Cobalt",
    industry: "metals",
    category: "Metals",
    summary: "High-performance alloying metal for implants, superalloys and batteries.",
    properties: ["Wear and corrosion resistant alloys", "Biocompatible as CoCr", "Supply concentrated in the DRC"],
    applications: ["Cobalt-chrome medical implants", "Superalloys (turbines)", "Battery cathodes", "Hard-facing and carbide tools"],
    grades: ["CoCrMo (ASTM F75 / F1537)", "Co 99.8% cathode"],
    alternatives: ["titanium", "nickel"],
    priceDrivers: ["DRC export policy", "EV battery chemistry", "Aerospace demand"],
    manufacturingNotes: ["Medical CoCr needs ISO 13485 traceability", "Due-diligence on responsible sourcing (OECD)"],
    aliases: ["cobalt chrome", "cocr", "cocrmo"],
    unit: "USD/ton",
  },
  {
    id: "silver",
    name: "Silver",
    industry: "biomedical",
    category: "Metals",
    summary: "Most conductive metal; used in contacts, electrodes and antimicrobial coatings.",
    properties: ["Highest electrical conductivity", "Antimicrobial", "Precious-metal price volatility"],
    applications: ["Electrical contacts and brazing", "ECG / sensing electrodes (Ag/AgCl)", "Antimicrobial wound dressings and coatings", "Solar paste"],
    alternatives: ["copper", "platinum"],
    priceDrivers: ["Precious-metal investment flows", "Solar PV demand", "Mine by-product supply"],
    manufacturingNotes: ["Buy contact materials by alloy (AgNi, AgSnO2)", "Plating thickness drives cost"],
    aliases: ["silver contacts", "silver plating"],
    unit: "USD/oz",
  },
  {
    id: "platinum",
    name: "Platinum",
    industry: "biomedical",
    category: "Metals",
    summary: "Inert, biocompatible precious metal for medical devices and catalysts.",
    properties: ["Biocompatible and radiopaque", "Extremely corrosion resistant", "Stable electrical properties"],
    applications: ["Pacemaker and neurostimulation leads", "Catheter marker bands and guidewires", "Sensors and thermocouples", "Catalysts"],
    grades: ["Pt 99.95%", "Pt-Ir 90/10 (medical)"],
    alternatives: ["Palladium", "Gold"],
    priceDrivers: ["South African mine supply", "Autocatalyst demand", "Investment flows"],
    manufacturingNotes: ["Medical Pt-Ir wire needs lot traceability", "Scrap / offcuts are valuable — agree buy-back terms"],
    aliases: ["pt-ir", "platinum iridium"],
    unit: "USD/oz",
  },
  {
    id: "silicon",
    name: "Silicon Metal",
    industry: "electrical-industrial",
    category: "Electrical",
    summary: "Metallurgical silicon for aluminium alloys, silicones and electronics.",
    properties: ["Semiconductor feedstock", "Alloys aluminium for castings", "Energy-intensive smelting"],
    applications: ["Polysilicon for solar and chips", "Aluminium casting alloys", "Silicone rubbers and sealants", "Electrical steel"],
    grades: ["553 / 441 / 3303 (Fe-Al-Ca impurities)"],
    alternatives: ["Ferrosilicon"],
    priceDrivers: ["Chinese smelter output", "Electricity costs", "Solar demand"],
    manufacturingNotes: ["Grade numbers state max Fe/Al/Ca impurity — specify for the end use"],
    aliases: ["silicon", "metallurgical silicon", "polysilicon"],
    unit: "USD/ton",
  },
  {
    id: "energy-transition-metals",
    name: "Energy Transition Metals Index",
    industry: "electrical-industrial",
    category: "Electrical",
    summary: "IMF index of metals used in cables, motors, grid and battery equipment.",
    properties: ["Basket incl. copper, aluminium, nickel, cobalt, lithium", "Index, 2016 = 100"],
    applications: ["Benchmark for cable, transformer and battery cost trends"],
    alternatives: ["copper", "aluminum"],
    priceDrivers: ["Grid and EV build-out", "Copper and aluminium prices", "Battery metal supply"],
    manufacturingNotes: ["Use as a trend signal; quotes are priced on the individual metals"],
    aliases: ["energy transition", "battery metals", "transition metals"],
    unit: "Index pts",
  },
  {
    id: "base-metals-index",
    name: "Base Metals Index",
    industry: "machinery",
    category: "Metals",
    summary: "IMF base metals index — a broad input-cost signal for equipment builders.",
    properties: ["Basket incl. aluminium, copper, iron ore, lead, nickel, tin, zinc", "Index, 2016 = 100"],
    applications: ["Benchmark for machinery, enclosure and component cost trends"],
    alternatives: ["steel", "aluminum", "copper"],
    priceDrivers: ["Global industrial production", "Chinese demand", "Energy costs"],
    manufacturingNotes: ["Use as a trend signal for price-adjustment clauses"],
    aliases: ["base metals", "metals index"],
    unit: "Index pts",
  },
  {
    id: "rubber",
    name: "Natural Rubber",
    industry: "hardware-components",
    category: "Industrial",
    summary: "Elastomer for seals, belts, hoses, anti-vibration mounts and gloves.",
    properties: ["High elasticity and resilience", "Poor oil resistance (vs NBR)", "Tropical crop — weather-driven supply"],
    applications: ["Seals, gaskets and O-rings", "Conveyor belts and hoses", "Anti-vibration mounts", "Medical gloves and tubing"],
    grades: ["RSS3 (ribbed smoked sheet)", "TSR20 / SVR"],
    alternatives: ["Synthetic rubber (SBR, NBR, EPDM)", "Silicone", "Nitrile (gloves)"],
    priceDrivers: ["Thai / Indonesian harvest", "Tyre demand", "Crude oil (synthetic substitutes)"],
    manufacturingNotes: ["Specify compound and Shore hardness, not just 'rubber'", "Latex allergy rules for medical products"],
    aliases: ["latex", "natural rubber", "rss3", "tsr20", "elastomer"],
    unit: "USD/kg",
  },
  {
    id: "hardwood",
    name: "Hardwood (sawn)",
    industry: "construction",
    category: "Construction",
    summary: "Tropical sawn hardwood for joinery, flooring and heavy-duty crates.",
    properties: ["Dense and durable", "Benchmark: dark red meranti", "Certification-sensitive"],
    applications: ["Doors, windows and joinery", "Flooring and decking", "Heavy-duty crates and pallets"],
    alternatives: ["lumber", "Engineered timber (LVL, CLT)"],
    priceDrivers: ["Malaysian / Indonesian log supply", "Export restrictions", "Freight"],
    manufacturingNotes: ["Ask for FSC / PEFC and EUDR due-diligence documents", "Specify moisture content and grade"],
    aliases: ["meranti", "tropical hardwood", "hard sawnwood"],
    unit: "USD/m³",
  },
  {
    id: "coal",
    name: "Thermal Coal",
    industry: "construction",
    category: "Energy",
    summary: "Kiln and furnace fuel — a cost driver for cement, steel and glass.",
    properties: ["Benchmark: Australian thermal coal (Newcastle)", "Energy cost signal"],
    applications: ["Cement kiln fuel", "Power for energy-intensive mills"],
    alternatives: ["Natural gas", "Alternative fuels (RDF)"],
    priceDrivers: ["Asian power demand", "Seaborne supply", "Carbon policy"],
    manufacturingNotes: ["Watch alongside cement and steel quotes — energy is a large share of their cost"],
    aliases: ["thermal coal", "newcastle coal", "kiln fuel"],
    unit: "USD/ton",
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
