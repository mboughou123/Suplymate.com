import { phase1Suppliers } from "@/data/phase1-suppliers";
import type { Supplier } from "@/data/suppliers";
import {
  localLogoPathForSupplierId,
  logoNeedsDarkChip,
} from "@/lib/local-supplier-logos";

/** Stable id set for the curated phase-1 mill pack (59 factories). */
export const PHASE1_SUPPLIER_IDS: ReadonlySet<string> = new Set(
  phase1Suppliers.map((s) => s.id)
);

/** True when the supplier belongs to the phase-1 import pack. */
export function isPhase1Supplier(
  supplier: Pick<Supplier, "id"> | string | null | undefined
): boolean {
  if (!supplier) return false;
  const id = typeof supplier === "string" ? supplier : supplier.id;
  return PHASE1_SUPPLIER_IDS.has(id);
}

type PhotoSupplier = Pick<Supplier, "id" | "imageUrl" | "supplierImages" | "logoUrl">;

/** True when a URL is a real mill/factory photo, not a logo thumb or tile. */
export function isUsableFactoryPhotoUrl(
  url: string,
  supplier?: Pick<Supplier, "logoUrl">
): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (
    trimmed.startsWith("/images/suppliers/phase1/") ||
    trimmed.startsWith("/images/suppliers/band/")
  ) {
    return true;
  }

  if (
    /\/logos?\//i.test(trimmed) ||
    /logo[-_.]/i.test(trimmed) ||
    /120x120|50x50|64x64|80x80|100x100/i.test(trimmed) ||
    (supplier?.logoUrl && trimmed === supplier.logoUrl.trim())
  ) {
    return false;
  }

  if (/\.svg(\?|$)/i.test(trimmed)) return false;
  if (trimmed.startsWith("/images/placeholder")) return false;
  if (trimmed.startsWith("/images/suppliers/logos/")) return false;

  if (trimmed.startsWith("/")) return true;

  if (/^https?:\/\//i.test(trimmed)) {
    if (/imimg\.com/i.test(trimmed) && /120x120|logo/i.test(trimmed)) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * All usable factory / mill photos for headers, galleries, and product tiles.
 * Rejects logo thumbnails (e.g. Magicrete's IndiaMART 120x120).
 */
export function collectFactoryPhotoUrls(supplier: PhotoSupplier): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const candidates = [
    supplier.imageUrl,
    ...(supplier.supplierImages ?? []),
  ].filter((u): u is string => Boolean(u && u.trim()));

  for (const url of candidates) {
    const trimmed = url.trim();
    if (seen.has(trimmed)) continue;
    if (!isUsableFactoryPhotoUrl(trimmed, supplier)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Prefer a real factory / mill photo for card headers.
 * Accepts local phase-1 / band assets. Rejects logo thumbnails so cards never
 * stretch a logo into the header band.
 */
export function getFactoryPhotoUrl(supplier: PhotoSupplier): string | undefined {
  return collectFactoryPhotoUrls(supplier)[0];
}

/**
 * Resolve the avatar logo: local pack first, then remote logoUrl.
 * Never invents a logo and never substitutes a product thumbnail.
 */
export function getSupplierLogoUrl(
  supplier: Pick<Supplier, "id" | "logoUrl">
): string | undefined {
  const local = localLogoPathForSupplierId(supplier.id);
  if (local) return local;
  if (!supplier.logoUrl || !supplier.logoUrl.trim()) return undefined;
  return supplier.logoUrl.trim();
}

export { logoNeedsDarkChip };
