import type { ProductCategory } from "../../src/data/products";

// Map free-text product names/descriptions to one of the 6 canonical catalogue
// categories. Ordered most-specific-first. Defaults to "Industrial Parts" when
// nothing matches (a safe, broad bucket the admin can re-categorise).
const RULES: { re: RegExp; cat: ProductCategory }[] = [
  { re: /\b(cable|wire|electrical|electronic|conductor|busbar|transformer|switchgear|pcb|connector)\b/i, cat: "Cables & Electrical" },
  { re: /\b(pipe|tube|tubing|duct|fitting|flange|elbow|valve)\b/i, cat: "Tubes & Pipes" },
  { re: /\b(packag|carton|box|crate|pallet|film|wrap|bag|pouch|label)\b/i, cat: "Packaging" },
  { re: /\b(cement|concrete|aggregate|mortar|brick|insulation|roofing|rebar|gypsum|drywall|tile)\b/i, cat: "Construction" },
  { re: /\b(steel|metal|iron|aluminum|aluminium|copper|brass|alloy|coil|plate|sheet|beam|ingot|billet|stainless)\b/i, cat: "Steel & Metals" },
  { re: /\b(hydraulic|pneumatic|cylinder|bearing|gear|pump|motor|machine|machinery|cnc|tool|equipment|valve|actuator|component|part)\b/i, cat: "Industrial Parts" },
];

export function inferCategory(text: string): ProductCategory {
  for (const { re, cat } of RULES) {
    if (re.test(text)) return cat;
  }
  return "Industrial Parts";
}
