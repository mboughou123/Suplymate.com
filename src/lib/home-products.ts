// Homepage "Products" section — picks photo-bearing catalogue products for the
// grid. Pure and framework-free so it can be unit-tested; the section itself
// feeds it the same cached `getProductsFromDb()` list the rest of the site uses
// (no extra DB round-trip).
import type { Product } from "@/data/products";
import { resolveProductImage } from "@/lib/image-fallback";

export type HomeProductItem = {
  id: string;
  name: string;
  category: string;
  image: string;
  supplierId: string | null;
  supplierName: string;
  supplierCountry: string | null;
};

/** Items shown when no category chip is active. */
export const HOME_PRODUCTS_VISIBLE = 12;
/** Items available per category chip (client-side filter). */
export const HOME_PRODUCTS_PER_CATEGORY = 8;

/**
 * Category chips shown above the grid, in display order. Only categories with
 * at least one photo-bearing product are rendered.
 */
export const HOME_PRODUCT_CATEGORIES = [
  "Steel & Metals",
  "Cables & Electrical",
  "Tubes & Pipes",
  "Packaging",
  "Construction",
  "Industrial Parts",
] as const;

const SYNTHETIC_SUPPLIER = /all metal|cables house/i;
const NEXANS_SECTION = /^(nexans\s+)?(transmission|buildings?|distribution)$/i;

/** i18n key (inside `homeProducts.categories`) for a product category label. */
export function homeCategoryKey(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join("");
}

function stableHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Prefer curated local mill/product stills over remote Outscraper photos, and
 * deprioritize synthetic ALL METAL / CABLES HOUSE SKUs even if a file slipped
 * through assignment.
 */
function homePhotoPreference(image: string, supplierName: string): number {
  const synthetic = SYNTHETIC_SUPPLIER.test(supplierName) ? -80 : 0;
  if (/^\/images\/products\//i.test(image) && !/\/ball\/aerosol/i.test(image)) {
    return 100 + synthetic;
  }
  if (/^https?:\/\//i.test(image)) return 10 + synthetic;
  return synthetic;
}

/**
 * Pick real, object-correct product photos for the homepage. Supplier factory
 * shots, category SVGs, illustrative renders, and stem-mismatched stills
 * (spray can on a ball, spray gun on a cable) are excluded. Deterministic for
 * a given catalogue so the ISR'd homepage does not flicker between builds.
 */
export function pickHomeProducts(
  products: Product[],
  perCategory: number = HOME_PRODUCTS_PER_CATEGORY
): HomeProductItem[] {
  const candidates: HomeProductItem[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    if (p.status && p.status !== "approved") continue;
    if (seen.has(p.id)) continue;
    const supplierName = p.supplierName ?? "";
    // Outscraper/ALL METAL synthetic SKUs and Nexans website-section pages
    // (Transmission / Buildings / Distribution) are not mill product stills.
    if (SYNTHETIC_SUPPLIER.test(supplierName)) continue;
    if (/nexans/i.test(supplierName) && NEXANS_SECTION.test(p.name.trim())) continue;
    const resolved = resolveProductImage({
      images: p.images,
      id: p.id,
      slug: p.slug,
      supplierId: p.supplierId,
      productName: p.name,
      category: p.category,
    });
    if (resolved.kind !== "real" || !resolved.url) continue;
    seen.add(p.id);
    candidates.push({
      id: p.id,
      name: p.name,
      category: p.category,
      image: resolved.url,
      supplierId: p.supplierId ?? null,
      supplierName: p.supplierName ?? "Suplymate catalogue",
      supplierCountry: p.supplierCountry ?? null,
    });
  }

  candidates.sort((a, b) => {
    const pref =
      homePhotoPreference(b.image, b.supplierName) -
      homePhotoPreference(a.image, a.supplierName);
    if (pref) return pref;
    return stableHash(a.id) - stableHash(b.id);
  });

  const byCategory = new Map<string, HomeProductItem[]>();
  for (const cat of HOME_PRODUCT_CATEGORIES) byCategory.set(cat, []);
  for (const c of candidates) {
    if (!byCategory.has(c.category)) byCategory.set(c.category, []);
  }

  // Pass 1: one product per supplier across the WHOLE grid; pass 2: top up
  // each category with remaining photo-bearing products.
  const usedSuppliers = new Set<string>();
  for (const [cat, bucket] of byCategory) {
    for (const c of candidates) {
      if (bucket.length >= perCategory) break;
      if (c.category !== cat) continue;
      const key = c.supplierId ?? c.supplierName;
      if (usedSuppliers.has(key)) continue;
      usedSuppliers.add(key);
      bucket.push(c);
    }
  }
  for (const [cat, bucket] of byCategory) {
    for (const c of candidates) {
      if (bucket.length >= perCategory) break;
      if (c.category !== cat || bucket.includes(c)) continue;
      bucket.push(c);
    }
  }

  // Interleave categories so the default (unfiltered) view is mixed.
  const out: HomeProductItem[] = [];
  const buckets = [...byCategory.values()].filter((b) => b.length > 0);
  for (let i = 0; i < perCategory; i++) {
    for (const b of buckets) if (b[i]) out.push(b[i]);
  }
  return out;
}

/** Categories present in a picked list, in canonical chip order. */
export function homeProductCategories(items: HomeProductItem[]): string[] {
  const present = new Set(items.map((i) => i.category));
  const ordered = HOME_PRODUCT_CATEGORIES.filter((c) => present.has(c));
  const extra = [...present].filter((c) => !(HOME_PRODUCT_CATEGORIES as readonly string[]).includes(c)).sort();
  return [...ordered, ...extra];
}
