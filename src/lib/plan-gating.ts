import type { Entitlements } from "@/lib/permissions";

export type CategorySplit<T> = { open: T[]; locked: T[] };

/**
 * Keeps the first `limit` items of every category (in the given order) open
 * and moves the rest to `locked`. A null limit opens everything.
 */
export function splitByCategoryAllowance<T>(
  items: readonly T[],
  limit: number | null,
  categoryOf: (item: T) => string,
): CategorySplit<T> {
  if (limit === null) return { open: [...items], locked: [] };
  const seen = new Map<string, number>();
  const open: T[] = [];
  const locked: T[] = [];
  for (const item of items) {
    const key = categoryOf(item);
    const count = seen.get(key) ?? 0;
    if (count < limit) {
      open.push(item);
      seen.set(key, count + 1);
    } else {
      locked.push(item);
    }
  }
  return { open, locked };
}

/** What the browser may know about the viewer's plan (no prices, no ids). */
export type PublicEntitlements = Pick<
  Entitlements,
  | "plan"
  | "fullAccess"
  | "suppliersPerCategory"
  | "productsPerCategory"
  | "aiQuestionsPerMonth"
  | "savedSuppliersLimit"
  | "priceHistoryMonths"
  | "priceAlerts"
  | "directSupplierContact"
  | "exportReporting"
> & { signedIn: boolean };

export function toPublicEntitlements(ent: Entitlements, signedIn: boolean): PublicEntitlements {
  return {
    signedIn,
    plan: ent.plan,
    fullAccess: ent.fullAccess,
    suppliersPerCategory: ent.suppliersPerCategory,
    productsPerCategory: ent.productsPerCategory,
    aiQuestionsPerMonth: ent.aiQuestionsPerMonth,
    savedSuppliersLimit: ent.savedSuppliersLimit,
    priceHistoryMonths: ent.priceHistoryMonths,
    priceAlerts: ent.priceAlerts,
    directSupplierContact: ent.directSupplierContact,
    exportReporting: ent.exportReporting,
  };
}

/** Where an upgrade prompt should send this viewer. */
export function upgradeHref(signedIn: boolean, plan: "basic" | "premium" = "basic"): string {
  return signedIn ? `/settings/subscription?plan=${plan}` : `/signup?plan=${plan}`;
}
