// Typed access to the generated pack catalogue (curated media packs: phase-1
// mills, daily expansions, Lister product photos, mill certificate scans).
//
// `src/data/generated/pack-catalog.json` is produced by
// `node scripts/build-catalog-from-packs.mjs` — never edit it by hand. Every
// image path inside it is a LOCAL `/images/...` asset verified on disk at
// build time, so nothing here depends on a database or a remote host.
import catalog from "./generated/pack-catalog.json";
import type { Supplier } from "./suppliers";
import type { ScrapedProduct } from "./scraped-products";

export type PackCertification = {
  id: string;
  supplierId: string;
  name: string;
  type: string | null;
  imageUrl: string;
  certificateUrl: string | null;
  sourceUrl: string | null;
  issuingOrg: string | null;
  notes: string | null;
  /** Always "claimed": a scan on file is NOT an independent verification. */
  status: "claimed";
};

/** A pack supplier: a directory `Supplier` plus the pack bookkeeping fields. */
export type PackSupplier = Supplier & {
  /** Folder slug used by the media packs (e.g. `hadeed`, `posco`). */
  packSlug: string;
  /** Source pack: `phase1` | `daily-2026-09-02` | `daily-2026-09-03` | `daily-2026-09-10`. */
  pack: string;
  /** True when the id already exists in the Outscraper directory (overlay, not a new card). */
  overlaysExisting: boolean;
  /**
   * RFQ product host whose mill card is Researcher-HOLD. Present so products
   * can resolve a supplier identity; omitted from the public mill listing.
   */
  productHostOnly?: boolean;
};

/** A pack product: an approved `ScrapedProduct` plus provenance fields. */
export type PackProduct = ScrapedProduct & {
  pack: string;
  packSlug: string;
  /** Lister `price_source_type` (rfq | listed_fob | printed_mrp | …). */
  priceSourceType: string;
};

export type PackStats = typeof catalog.stats;

export const packStats: PackStats = catalog.stats;

export const packSuppliers: PackSupplier[] = catalog.suppliers as unknown as PackSupplier[];

export const packCertifications: PackCertification[] =
  catalog.certifications as unknown as PackCertification[];

export const packProducts: PackProduct[] = catalog.products as unknown as PackProduct[];

const supplierById = new Map(packSuppliers.map((s) => [s.id, s]));
const productById = new Map(packProducts.map((p) => [p.id, p]));
const productsBySupplier = new Map<string, PackProduct[]>();
for (const p of packProducts) {
  const list = productsBySupplier.get(p.supplierId) ?? [];
  list.push(p);
  productsBySupplier.set(p.supplierId, list);
}
const certsBySupplier = new Map<string, PackCertification[]>();
for (const c of packCertifications) {
  const list = certsBySupplier.get(c.supplierId) ?? [];
  list.push(c);
  certsBySupplier.set(c.supplierId, list);
}

export function getPackSupplier(id: string): PackSupplier | undefined {
  return supplierById.get(id);
}

export function getPackProduct(id: string): PackProduct | undefined {
  return productById.get(id);
}

/** Publicly visible (approved) pack products. */
export function approvedPackProducts(): PackProduct[] {
  return packProducts.filter((p) => p.status === "approved");
}

/** Approved pack products for one supplier, photo-bearing first. */
export function packProductsForSupplier(supplierId: string): PackProduct[] {
  return (productsBySupplier.get(supplierId) ?? [])
    .filter((p) => p.status === "approved")
    .sort((a, b) => Number(b.images.length > 0) - Number(a.images.length > 0));
}

export function packCertificationsForSupplier(supplierId: string): PackCertification[] {
  return certsBySupplier.get(supplierId) ?? [];
}

/**
 * Overlay pack suppliers onto an existing supplier list: rows already present
 * (same id) receive the pack's local media / curated fields (pack wins for
 * media, description and certifications; the directory row keeps contact and
 * rating data the pack lacks), and pack-only suppliers are appended.
 */
export function mergePackSuppliers(existing: Supplier[]): Supplier[] {
  const byId = new Map(existing.map((s) => [s.id, s]));
  const merged = existing.map((s) => {
    const pack = supplierById.get(s.id);
    return pack ? overlayPackSupplier(s, pack) : s;
  });
  for (const pack of packSuppliers) {
    if (byId.has(pack.id)) continue;
    if (pack.productHostOnly) continue;
    merged.push(toDirectorySupplier(pack));
  }
  return merged;
}

/** Strip pack bookkeeping so the public `Supplier` shape stays lean. */
export function toDirectorySupplier(pack: PackSupplier): Supplier {
  const {
    packSlug: _slug,
    pack: _pack,
    overlaysExisting: _overlay,
    productHostOnly: _host,
    ...supplier
  } = pack;
  void _slug;
  void _pack;
  void _overlay;
  void _host;
  return { ...supplier, featuredProducts: featuredProductsFor(pack.id) };
}

export function overlayPackSupplier(row: Supplier, pack: PackSupplier): Supplier {
  const packRow = toDirectorySupplier(pack);
  const hasLocalPhotos = (row.supplierImages ?? []).some((u) => u.startsWith("/images/"));
  return {
    ...row,
    name: packRow.name || row.name,
    category: packRow.category ?? row.category,
    industry: packRow.industry ?? row.industry,
    website: packRow.website ?? row.website,
    description: packRow.description ?? row.description,
    products: packRow.products.length ? packRow.products : row.products,
    logoUrl: packRow.logoUrl ?? row.logoUrl,
    // Curated local factory photos lead; remote Google Places photos follow.
    imageUrl: packRow.imageUrl ?? row.imageUrl,
    supplierImages: hasLocalPhotos
      ? row.supplierImages
      : [...new Set([...(packRow.supplierImages ?? []), ...(row.supplierImages ?? [])])],
    certificationsDetailed: packRow.certificationsDetailed?.length
      ? packRow.certificationsDetailed
      : row.certificationsDetailed,
    certificationImages: packRow.certificationImages?.length
      ? packRow.certificationImages
      : row.certificationImages,
    // Distributors (soft-hold identities such as Bossard) never carry the mill
    // badge, whatever the directory row said.
    verified: packRow.businessType === "Distributor" ? false : (row.verified ?? packRow.verified),
    businessType: packRow.businessType ?? row.businessType,
    featuredProducts: packRow.featuredProducts,
    sourceUrl: row.sourceUrl ?? packRow.sourceUrl,
    lastUpdated: packRow.lastUpdated ?? row.lastUpdated,
  };
}

function featuredProductsFor(supplierId: string): Supplier["featuredProducts"] {
  const items = packProductsForSupplier(supplierId)
    .filter((p) => p.images.length > 0)
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.name, image: p.images[0] }));
  return items.length ? items : undefined;
}
