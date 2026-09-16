/**
 * Steel & Metal category taxonomy — buyer-facing material tree.
 *
 * Source of truth: `steel-metal.json` (2026-09-15). IDs are stable
 * (`carbon-steel-sheet`, …) so a later researcher name-gate can trim labels
 * without breaking routes. Pricing policy is RFQ / variants only — this
 * module never invents FOB or unit prices.
 */
import raw from "./steel-metal.json";

export const STEEL_METAL_PATH = "/steel-metal";

export const STEEL_METAL_SUBCATEGORY_IDS = [
  "carbon-mild-steel",
  "stainless-steel",
  "alloy-steel",
  "tool-steel",
  "galvanized-coated-steels",
  "structural-steel",
  "pipe-tube",
  "wire-rebar-mesh",
  "flat-products-specialty",
  "aluminum",
  "copper-brass-bronze",
  "other-non-ferrous",
  "metal-scrap-secondary",
] as const;

export type SteelMetalSubcategoryId = (typeof STEEL_METAL_SUBCATEGORY_IDS)[number];

/** Mill-grade browse v1 (Researcher PARTIAL seal). IDs stay; scrap is held. */
export const STEEL_METAL_MILL_NAV_IDS = [
  "carbon-mild-steel",
  "stainless-steel",
  "alloy-steel",
  "tool-steel",
  "galvanized-coated-steels",
  "structural-steel",
  "pipe-tube",
  "wire-rebar-mesh",
  "flat-products-specialty",
  "aluminum",
  "copper-brass-bronze",
] as const;

/** Phase-1b sibling — hide behind “More metals”, not primary steel nav. */
export const STEEL_METAL_MORE_METALS_IDS = ["other-non-ferrous"] as const;

/** Scrap traders / secondary yards — omit from Steel & Metal mill nav. */
export const STEEL_METAL_HOLD_IDS = ["metal-scrap-secondary"] as const;

export type SteelMetalBrowseLane = "mill" | "more-metals" | "hold";

export type SteelMetalVariants = {
  grades: string[];
  thickness: string[];
  finish: string[];
  form: string[];
  standards: string[];
  other_specs: string[];
};

export type SteelMetalLeaf = {
  id: string;
  name: string;
  leaf: true;
  alibaba_aliases: string[];
  common_names: string[];
  forms: string[];
  variants: SteelMetalVariants;
  buyer_search_examples: string[];
};

export type SteelMetalSubcategory = {
  id: SteelMetalSubcategoryId;
  name: string;
  alibaba_aliases: string[];
  children: SteelMetalLeaf[];
};

export type SteelMetalTaxonomy = {
  top_level: string;
  source_notes: string[];
  generated_at_pt: string;
  pricing_policy: string;
  categories: SteelMetalSubcategory[];
};

export type SteelMetalLeafRef = {
  subcategory: SteelMetalSubcategory;
  leaf: SteelMetalLeaf;
};

const EMPTY_VARIANTS: SteelMetalVariants = {
  grades: [],
  thickness: [],
  finish: [],
  form: [],
  standards: [],
  other_specs: [],
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeVariants(value: unknown): SteelMetalVariants {
  const rawVariants = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    grades: asStringArray(rawVariants.grades),
    thickness: asStringArray(rawVariants.thickness),
    finish: asStringArray(rawVariants.finish),
    form: asStringArray(rawVariants.form),
    standards: asStringArray(rawVariants.standards),
    other_specs: asStringArray(rawVariants.other_specs),
  };
}

function normalizeLeaf(value: unknown): SteelMetalLeaf | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.name !== "string") return null;
  const forms = asStringArray(row.forms);
  const variants = normalizeVariants(row.variants);
  if (variants.form.length === 0 && forms.length > 0) {
    variants.form = [...forms];
  }
  const normalized: SteelMetalLeaf = {
    id: row.id,
    name: row.name,
    leaf: true,
    alibaba_aliases: asStringArray(row.alibaba_aliases),
    common_names: asStringArray(row.common_names),
    forms,
    variants,
    buyer_search_examples: asStringArray(row.buyer_search_examples),
  };
  return applyDisplayOverlay(normalized);
}

function isSubcategoryId(id: string): id is SteelMetalSubcategoryId {
  return (STEEL_METAL_SUBCATEGORY_IDS as readonly string[]).includes(id);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

/** Display-only remaps from the Researcher PARTIAL name-gate. IDs never change. */
function applyDisplayOverlay(leaf: SteelMetalLeaf): SteelMetalLeaf {
  switch (leaf.id) {
    case "alloy-steel-plate":
      return {
        ...leaf,
        variants: {
          ...leaf.variants,
          grades: leaf.variants.grades.filter((grade) => grade !== "Hardox-equiv"),
        },
      };
    case "zmg-zn-al-mg":
      return {
        ...leaf,
        common_names: uniqueStrings(
          leaf.common_names.map((name) => (name === "SuperDyma-type" ? "ZM coated" : name)),
        ),
      };
    case "weathering-corten":
      return {
        ...leaf,
        name: "Weathering Steel",
        common_names: uniqueStrings(["Corten", "COR-TEN", ...leaf.common_names.filter((name) => name.toLowerCase() !== "weathering steel")]),
      };
    case "gi-corrugated-roofing":
      return {
        ...leaf,
        common_names: leaf.common_names.map((name) =>
          name === "Ibrahim/wave profile" ? "wave profile" : name,
        ),
      };
    default:
      return leaf;
  }
}

export function browseLaneFor(id: string): SteelMetalBrowseLane {
  if ((STEEL_METAL_HOLD_IDS as readonly string[]).includes(id)) return "hold";
  if ((STEEL_METAL_MORE_METALS_IDS as readonly string[]).includes(id)) return "more-metals";
  if ((STEEL_METAL_MILL_NAV_IDS as readonly string[]).includes(id)) return "mill";
  return "hold";
}

export function isHeldFromMillNav(id: string): boolean {
  return browseLaneFor(id) === "hold";
}

export function isPublicSteelMetalBrowse(id: string): boolean {
  const lane = browseLaneFor(id);
  return lane === "mill" || lane === "more-metals";
}

function normalizeTaxonomy(value: unknown): SteelMetalTaxonomy {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const categories = Array.isArray(row.categories)
    ? row.categories
        .map((entry): SteelMetalSubcategory | null => {
          if (!entry || typeof entry !== "object") return null;
          const cat = entry as Record<string, unknown>;
          if (typeof cat.id !== "string" || !isSubcategoryId(cat.id)) return null;
          if (typeof cat.name !== "string") return null;
          const children = Array.isArray(cat.children)
            ? cat.children
                .map(normalizeLeaf)
                .filter((leaf): leaf is SteelMetalLeaf => leaf !== null)
            : [];
          return {
            id: cat.id,
            name: cat.name,
            alibaba_aliases: asStringArray(cat.alibaba_aliases),
            children,
          };
        })
        .filter((cat): cat is SteelMetalSubcategory => cat !== null)
    : [];

  return {
    top_level: typeof row.top_level === "string" ? row.top_level : "Steel & Metal",
    source_notes: asStringArray(row.source_notes),
    generated_at_pt: typeof row.generated_at_pt === "string" ? row.generated_at_pt : "",
    pricing_policy:
      typeof row.pricing_policy === "string" ? row.pricing_policy : "no FOB/prices — variants only",
    categories,
  };
}

const TAXONOMY: SteelMetalTaxonomy = normalizeTaxonomy(raw);

const subcategoryById = new Map(TAXONOMY.categories.map((c) => [c.id, c]));
const leafByPath = new Map<string, SteelMetalLeafRef>();
for (const subcategory of TAXONOMY.categories) {
  for (const leaf of subcategory.children) {
    leafByPath.set(`${subcategory.id}/${leaf.id}`, { subcategory, leaf });
  }
}

export function getSteelMetalTaxonomy(): SteelMetalTaxonomy {
  return TAXONOMY;
}

export function getSteelMetalSubcategory(
  id: string,
): SteelMetalSubcategory | null {
  return subcategoryById.get(id as SteelMetalSubcategoryId) ?? null;
}

export function getSteelMetalLeaf(
  subcategoryId: string,
  leafId: string,
): SteelMetalLeafRef | null {
  return leafByPath.get(`${subcategoryId}/${leafId}`) ?? null;
}

export function listSteelMetalLeaves(): SteelMetalLeafRef[] {
  return TAXONOMY.categories.flatMap((subcategory) =>
    subcategory.children.map((leaf) => ({ subcategory, leaf })),
  );
}

export function listMillNavSubcategories(): SteelMetalSubcategory[] {
  return STEEL_METAL_MILL_NAV_IDS.map((id) => subcategoryById.get(id)).filter(
    (cat): cat is SteelMetalSubcategory => Boolean(cat),
  );
}

export function listMoreMetalsSubcategories(): SteelMetalSubcategory[] {
  return STEEL_METAL_MORE_METALS_IDS.map((id) => subcategoryById.get(id)).filter(
    (cat): cat is SteelMetalSubcategory => Boolean(cat),
  );
}

export function listPublicBrowseSubcategories(): SteelMetalSubcategory[] {
  return [...listMillNavSubcategories(), ...listMoreMetalsSubcategories()];
}

export function steelMetalHubHref(): string {
  return STEEL_METAL_PATH;
}

export function steelMetalSubcategoryHref(subcategoryId: string): string {
  return `${STEEL_METAL_PATH}/${encodeURIComponent(subcategoryId)}`;
}

export function steelMetalLeafHref(subcategoryId: string, leafId: string): string {
  return `${STEEL_METAL_PATH}/${encodeURIComponent(subcategoryId)}/${encodeURIComponent(leafId)}`;
}

export function steelMetalSubcategoryParams(): { subcategory: string }[] {
  return listPublicBrowseSubcategories().map((c) => ({ subcategory: c.id }));
}

export function steelMetalLeafParams(): { subcategory: string; leaf: string }[] {
  return listSteelMetalLeaves()
    .filter(({ subcategory }) => isPublicSteelMetalBrowse(subcategory.id))
    .map(({ subcategory, leaf }) => ({
      subcategory: subcategory.id,
      leaf: leaf.id,
    }));
}

const PRICE_KEY = /^(price|fob|unitPrice|basePrice|usd|cost)$/i;

function walkForPricing(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(walkForPricing);
  if (!value || typeof value !== "object") return false;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PRICE_KEY.test(key)) return true;
    if (walkForPricing(child)) return true;
  }
  return false;
}

/** True when the taxonomy JSON grew a price/FOB field — browse UI must stay RFQ-only. */
export function taxonomyHasPricingFields(taxonomy: SteelMetalTaxonomy): boolean {
  return walkForPricing(taxonomy);
}

