// "What should the bots collect next?" — per industry, the suppliers,
// products, certifications and logistics providers that are missing a logo,
// photos or certificate scans, with the official domains the images must come
// from. Served by GET /api/admin/import/media-needs; the bots then fetch from
// those sites on their own machines, so Suplymate's servers never scrape.

import type { Media } from "@/lib/media-types";
import { officialDomains } from "./provenance";
import { productIndustry, supplierIndustry, type MediaIndustryId } from "./industry";
import type { MediaRole, MediaTarget } from "./manifest";

export const MIN_SUPPLIER_PHOTOS = 3;

export type NeedsSupplier = {
  id: string;
  name: string;
  website: string | null;
  category?: string | null;
  industry?: string | null;
  products?: string[];
  hasLegacyLogo: boolean;
  legacyPhotoCount: number;
  /** Certificates the supplier lists, and whether a scan is already on file. */
  certificates: { name: string; hasScan: boolean }[];
};

export type NeedsProduct = {
  id: string;
  name: string;
  category?: string | null;
  supplierId?: string | null;
  productUrl?: string | null;
  sourceUrl?: string | null;
  legacyImageCount: number;
};

export type NeedsProvider = { id: string; name: string; urls: string[] };

export type MediaNeedsInput = {
  suppliers: NeedsSupplier[];
  products: NeedsProduct[];
  providers: NeedsProvider[];
  /** Every Media row the bots' targets could own (any status — unpublished counts as collected). */
  media: Pick<Media, "entityType" | "entityId" | "mediaType">[];
};

export type MediaNeed = {
  target: MediaTarget;
  entityId: string;
  name: string;
  industry: MediaIndustryId | null;
  officialDomains: string[];
  /** Roles the bot should collect; push items use these exact role names. */
  roles: MediaRole[];
  /** Supplier certificates that still need a scan (push with role "certificate"). */
  certificates?: string[];
};

export type MediaNeedsResult = {
  industry: MediaIndustryId | "all";
  total: number;
  offset: number;
  limit: number;
  items: MediaNeed[];
  /** Entities with gaps but no official website on file — the bots cannot serve them. */
  withoutWebsite: number;
};

function countBy(media: MediaNeedsInput["media"]): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of media) {
    if (!row.entityId) continue;
    const k = `${row.entityType}:${row.entityId}:${row.mediaType}`;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export function computeMediaNeeds(
  input: MediaNeedsInput,
  opts: { industry: MediaIndustryId | "all"; target?: MediaTarget | null; offset?: number; limit?: number }
): MediaNeedsResult {
  const counts = countBy(input.media);
  const n = (entityType: string, id: string, mediaType: string) => counts.get(`${entityType}:${id}:${mediaType}`) ?? 0;
  const wants = (target: MediaTarget) => !opts.target || opts.target === target;
  const inIndustry = (industry: MediaIndustryId | null) => opts.industry === "all" || industry === opts.industry;
  const all: MediaNeed[] = [];
  let withoutWebsite = 0;
  const push = (need: MediaNeed) => {
    if (!need.roles.length) return;
    if (!need.officialDomains.length) withoutWebsite++;
    else all.push(need);
  };

  const supplierDomains = new Map<string, string[]>();
  for (const s of input.suppliers) supplierDomains.set(s.id, officialDomains([s.website]));

  if (wants("supplier")) {
    for (const s of input.suppliers) {
      const industry = supplierIndustry(s);
      if (!inIndustry(industry)) continue;
      const roles: MediaRole[] = [];
      if (!s.hasLegacyLogo && n("SUPPLIER", s.id, "SUPPLIER_LOGO") === 0) roles.push("logo");
      const photos = s.legacyPhotoCount + n("SUPPLIER", s.id, "SUPPLIER_FACTORY") + n("SUPPLIER", s.id, "SUPPLIER_GALLERY") + n("SUPPLIER", s.id, "SUPPLIER_COVER");
      if (photos < MIN_SUPPLIER_PHOTOS) roles.push("factory", "gallery");
      const missingCerts = s.certificates.filter((c) => !c.hasScan).map((c) => c.name);
      if (missingCerts.length) roles.push("certificate");
      push({
        target: "supplier",
        entityId: s.id,
        name: s.name,
        industry,
        officialDomains: supplierDomains.get(s.id) ?? [],
        roles,
        ...(missingCerts.length ? { certificates: missingCerts } : {}),
      });
    }
  }

  if (wants("product")) {
    for (const p of input.products) {
      const industry = productIndustry(p);
      if (!inIndustry(industry)) continue;
      const images = p.legacyImageCount + n("PRODUCT", p.id, "PRODUCT_PRIMARY") + n("PRODUCT", p.id, "PRODUCT_GALLERY");
      const domains = [...new Set([...officialDomains([p.productUrl, p.sourceUrl]), ...(p.supplierId ? supplierDomains.get(p.supplierId) ?? [] : [])])].sort();
      push({ target: "product", entityId: p.id, name: p.name, industry, officialDomains: domains, roles: images === 0 ? ["product"] : [] });
    }
  }

  if (wants("logistics-provider") && inIndustry("logistics-insurance")) {
    for (const p of input.providers) {
      push({
        target: "logistics-provider",
        entityId: p.id,
        name: p.name,
        industry: "logistics-insurance",
        officialDomains: officialDomains(p.urls),
        roles: n("LOGISTICS_PROVIDER", p.id, "PROVIDER_LOGO") === 0 ? ["logo"] : [],
      });
    }
  }

  all.sort((a, b) => b.roles.length - a.roles.length || a.name.localeCompare(b.name));
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.max(1, Math.min(1000, opts.limit ?? 200));
  return { industry: opts.industry, total: all.length, offset, limit, items: all.slice(offset, offset + limit), withoutWebsite };
}
