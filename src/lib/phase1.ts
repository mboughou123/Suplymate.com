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

/**
 * Prefer a real factory / mill photo for card headers.
 * Accepts local phase-1 / band assets. Rejects logo thumbnails (e.g. Magicrete's
 * IndiaMART 120x120) so cards never stretch a logo into the header band.
 */
export function getFactoryPhotoUrl(
  supplier: Pick<Supplier, "id" | "imageUrl" | "supplierImages" | "logoUrl">
): string | undefined {
  const candidates = [
    supplier.imageUrl,
    ...(supplier.supplierImages ?? []),
  ].filter((u): u is string => Boolean(u && u.trim()));

  for (const url of candidates) {
    const trimmed = url.trim();

    // Local curated mill photography — always preferred.
    if (
      trimmed.startsWith("/images/suppliers/phase1/") ||
      trimmed.startsWith("/images/suppliers/band/")
    ) {
      return trimmed;
    }

    // Never use logo assets (local or remote) as a factory header.
    if (
      /\/logos?\//i.test(trimmed) ||
      /logo[-_.]/i.test(trimmed) ||
      /120x120|50x50|64x64|80x80|100x100/i.test(trimmed) ||
      (supplier.logoUrl && trimmed === supplier.logoUrl.trim())
    ) {
      continue;
    }

    // Skip SVG placeholders / category tiles.
    if (/\.svg(\?|$)/i.test(trimmed)) continue;
    if (trimmed.startsWith("/images/placeholder")) continue;

    // Other local raster photos under /images/ (not logos folder).
    if (
      trimmed.startsWith("/") &&
      !trimmed.startsWith("/images/suppliers/logos/")
    ) {
      return trimmed;
    }

    // Remote photographs — reject obvious logo/thumbnail hosts used as cover.
    if (/^https?:\/\//i.test(trimmed)) {
      if (/imimg\.com/i.test(trimmed) && /120x120|logo/i.test(trimmed)) {
        continue;
      }
      return trimmed;
    }
  }
  return undefined;
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
