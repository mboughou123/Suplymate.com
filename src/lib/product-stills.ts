// Lookup for committed product stills under `public/images/products/<slug>/`.
//
// PR #21 checked in 119 mill/product rasters, but scraped/DB catalogue rows
// still carry third-party hotlinks. Cards resolve through this index so a
// local still wins without inventing photos or wiring a new daily pack.
import stills from "@/data/generated/product-stills.json";

const STILLS = stills as Record<string, string[]>;

export type ProductStillRef = {
  id?: string | null;
  slug?: string | null;
  supplierId?: string | null;
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function candidateKeys(input: ProductStillRef): string[] {
  const raw = [input.id, input.slug, input.supplierId]
    .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
    .map(normalize);
  const keys = new Set<string>();
  for (const r of raw) {
    if (!r) continue;
    keys.add(r);
    if (r.startsWith("pack-")) keys.add(r.slice("pack-".length));
  }
  return [...keys];
}

/** Index key matches a product/supplier candidate without loose category hits. */
function keyMatches(indexKey: string, candidate: string): boolean {
  if (candidate === indexKey) return true;
  if (candidate.startsWith(`${indexKey}-`)) return true;
  if (candidate.includes(`-${indexKey}-`)) return true;
  if (candidate.endsWith(`-${indexKey}`)) return true;
  return false;
}

/**
 * Local `/images/products/<slug>/…` rasters for a catalogue product.
 * Empty when no committed still exists — callers then use a category tile.
 */
export function localStillsForProduct(input: ProductStillRef): string[] {
  const candidates = candidateKeys(input);
  if (candidates.length === 0) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (urls: string[]) => {
    for (const url of urls) {
      if (seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
  };

  for (const candidate of candidates) {
    const exact = STILLS[candidate];
    if (exact?.length) push(exact);
  }
  if (out.length) return out;

  for (const [key, urls] of Object.entries(STILLS)) {
    if (candidates.some((candidate) => keyMatches(key, candidate))) {
      push(urls);
    }
  }
  return out;
}
