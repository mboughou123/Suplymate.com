import { phase1Suppliers } from "@/data/phase1-suppliers";
import type { Supplier } from "@/data/suppliers";

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
 * Accepts local phase-1 assets and remote photos; rejects SVG placeholders.
 */
export function getFactoryPhotoUrl(
  supplier: Pick<Supplier, "imageUrl" | "supplierImages">
): string | undefined {
  const candidates = [
    supplier.imageUrl,
    ...(supplier.supplierImages ?? []),
  ].filter((u): u is string => Boolean(u && u.trim()));

  for (const url of candidates) {
    const trimmed = url.trim();
    // Local curated mill photography (phase-1 pack and homepage band).
    if (
      trimmed.startsWith("/images/suppliers/phase1/") ||
      trimmed.startsWith("/images/suppliers/band/")
    ) {
      return trimmed;
    }
    // Remote photographs (http/https), skip SVG category tiles.
    if (/^https?:\/\//i.test(trimmed) && !/\.svg(\?|$)/i.test(trimmed)) {
      return trimmed;
    }
    // Other local raster photos under /images/
    if (
      trimmed.startsWith("/") &&
      !trimmed.startsWith("/images/placeholder") &&
      !/\.svg(\?|$)/i.test(trimmed)
    ) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Return the supplier's logoUrl for the avatar slot.
 * Never invent a logo and never substitute a product thumbnail — only the
 * explicit logo field. Empty/missing → caller shows initials.
 */
export function getSupplierLogoUrl(logoUrl?: string | null): string | undefined {
  if (!logoUrl || !logoUrl.trim()) return undefined;
  return logoUrl.trim();
}
