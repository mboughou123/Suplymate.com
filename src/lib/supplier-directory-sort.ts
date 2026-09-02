import type { Supplier } from "@/data/suppliers";
import { isPhase1Supplier } from "@/lib/phase1";

function supplierHasImage(s: Supplier): boolean {
  return (
    Boolean(s.imageUrl) ||
    Boolean(s.supplierImages && s.supplierImages.length > 0)
  );
}

/**
 * Public directory ordering:
 *   1. Phase-1 curated mills first
 *   2. Image-bearing suppliers
 *   3. Suplymate score (or reliabilityScore) desc
 *   4. Name A–Z
 *
 * Shared by the server listing and the client filter/sort so pagination stays
 * consistent after search/filter. Kept free of Prisma so client components can
 * import it safely.
 */
export function compareForDirectory(a: Supplier, b: Supplier): number {
  const phase = Number(isPhase1Supplier(b)) - Number(isPhase1Supplier(a));
  if (phase) return phase;
  const img = Number(supplierHasImage(b)) - Number(supplierHasImage(a));
  if (img) return img;
  const score =
    (b.score ?? b.reliabilityScore ?? 0) - (a.score ?? a.reliabilityScore ?? 0);
  if (score) return score;
  return a.name.localeCompare(b.name);
}
