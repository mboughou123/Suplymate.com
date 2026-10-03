/**
 * Leaf-variant helpers for Steel & Metal browse.
 *
 * Facets come only from the committed taxonomy. Pack-catalog stills are
 * matched by name/spec tokens; listings never carry a price field — RFQ only.
 */
import { approvedPackProducts, type PackProduct } from "@/data/pack-catalog";
import type { SteelMetalLeaf } from "@/data/taxonomy/steel-metal";

export const LEAF_FACET_KEYS = ["form", "grade", "thickness", "finish", "standard"] as const;

export type LeafFacetKey = (typeof LEAF_FACET_KEYS)[number];

export type LeafFacetGroup = {
  key: LeafFacetKey;
  options: string[];
};

export type LeafFacetSelection = Partial<Record<LeafFacetKey, string>>;

export type SteelMetalPackListing = {
  id: string;
  name: string;
  supplierId: string;
  supplierName: string;
  imageUrl: string;
  href: string;
};

const FACET_SOURCE: Record<LeafFacetKey, keyof SteelMetalLeaf["variants"]> = {
  form: "form",
  grade: "grades",
  thickness: "thickness",
  finish: "finish",
  standard: "standards",
};

const QUERY_KEYS: Record<LeafFacetKey, string> = {
  form: "form",
  grade: "grade",
  thickness: "thickness",
  finish: "finish",
  standard: "standard",
};

export function facetGroupsForLeaf(leaf: SteelMetalLeaf): LeafFacetGroup[] {
  const groups: LeafFacetGroup[] = [];
  for (const key of LEAF_FACET_KEYS) {
    const options = leaf.variants[FACET_SOURCE[key]];
    if (options.length === 0) continue;
    groups.push({ key, options });
  }
  return groups;
}

export function serializeLeafFacetQuery(selection: LeafFacetSelection): Record<string, string> {
  const query: Record<string, string> = {};
  for (const key of LEAF_FACET_KEYS) {
    const value = selection[key]?.trim();
    if (value) query[QUERY_KEYS[key]] = value;
  }
  return query;
}

export function parseLeafFacetQuery(
  query: Record<string, string | string[] | undefined>,
): LeafFacetSelection {
  const selection: LeafFacetSelection = {};
  for (const key of LEAF_FACET_KEYS) {
    const raw = query[QUERY_KEYS[key]];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value === "string" && value.trim()) {
      selection[key] = value.trim();
    }
  }
  return selection;
}

export function buildRfqProductName(leaf: SteelMetalLeaf, selection: LeafFacetSelection): string {
  const parts = [selection.grade, selection.form, selection.thickness, selection.finish, selection.standard]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length ? `${leaf.name} — ${parts.join(", ")}` : leaf.name;
}

const STOP_WORDS = new Set([
  "steel",
  "metal",
  "metals",
  "carbon",
  "mild",
  "and",
  "the",
  "for",
  "with",
  "type",
  "products",
  "product",
]);

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function includesPhrase(hay: string, phrase: string): boolean {
  const needle = phrase.trim().toLowerCase();
  return needle.length >= 3 && hay.includes(needle);
}

function scorePackProduct(leaf: SteelMetalLeaf, product: PackProduct): number {
  const hay = [
    product.name,
    product.category,
    product.shortDescription ?? "",
    ...Object.values(product.specifications ?? {}),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const name of leaf.common_names) {
    if (includesPhrase(hay, name)) score += 8;
  }

  for (const form of leaf.forms.length ? leaf.forms : leaf.variants.form) {
    if (includesPhrase(hay, form)) score += 4;
  }

  const nameTokens = tokens(leaf.name);
  if (nameTokens.length) {
    const hits = nameTokens.filter((token) => hay.includes(token)).length;
    score += hits * 3;
    if (hits === 0 && nameTokens.length >= 2) return 0;
  }

  for (const grade of leaf.variants.grades) {
    if (grade.length >= 3 && hay.includes(grade.toLowerCase())) score += 5;
  }

  for (const standard of leaf.variants.standards) {
    if (standard.length >= 5 && hay.includes(standard.toLowerCase())) score += 4;
  }

  return score;
}

function firstLocalImage(product: PackProduct): string | null {
  const local = product.images.find((url) => url.startsWith("/images/"));
  return local ?? null;
}

const MAX_LISTINGS = 6;
const MIN_SCORE = 8;

export function findPackListingsForLeaf(leaf: SteelMetalLeaf): SteelMetalPackListing[] {
  const ranked = approvedPackProducts()
    .map((product) => ({ product, score: scorePackProduct(leaf, product), imageUrl: firstLocalImage(product) }))
    .filter((row) => row.score >= MIN_SCORE && row.imageUrl)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, MAX_LISTINGS);

  return ranked.map(({ product, imageUrl }) => ({
    id: product.id,
    name: product.name,
    supplierId: product.supplierId,
    supplierName: product.supplierName,
    imageUrl: imageUrl as string,
    href: `/products/${product.id}`,
  }));
}
