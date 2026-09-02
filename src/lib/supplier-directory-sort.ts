import type { Supplier } from "@/data/suppliers";
import { isPhase1Supplier } from "@/lib/phase1";
import { isDaily20260902Supplier } from "@/lib/daily-2026-09-02-ids";

function supplierHasImage(s: Supplier): boolean {
  return (
    Boolean(s.imageUrl) ||
    Boolean(s.supplierImages && s.supplierImages.length > 0)
  );
}

/** Phase-1 pack + daily expansion mills — keep them at the front of /suppliers. */
export function isCuratedDirectoryMill(
  supplier: Pick<Supplier, "id"> | string | null | undefined,
): boolean {
  return isPhase1Supplier(supplier) || isDaily20260902Supplier(supplier);
}

/**
 * Public directory ordering:
 *   1. Curated mills (phase-1 pack + daily expansion)
 *   2. Image-bearing suppliers
 *   3. Suplymate score (or reliabilityScore) desc
 *   4. Name A–Z
 *
 * Shared by the server listing and the client filter/sort so pagination stays
 * consistent after search/filter. Kept free of Prisma so client components can
 * import it safely.
 */
export function compareForDirectory(a: Supplier, b: Supplier): number {
  const phase = Number(isCuratedDirectoryMill(b)) - Number(isCuratedDirectoryMill(a));
  if (phase) return phase;
  const img = Number(supplierHasImage(b)) - Number(supplierHasImage(a));
  if (img) return img;
  const score =
    (b.score ?? b.reliabilityScore ?? 0) - (a.score ?? a.reliabilityScore ?? 0);
  if (score) return score;
  return a.name.localeCompare(b.name);
}
