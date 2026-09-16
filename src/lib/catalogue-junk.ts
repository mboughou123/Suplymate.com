// Website-section / nav-dump titles scraped from mill homepages.
// These are not SKUs and must not appear in the public catalogue or homepage grid.

const JUNK_CORE =
  /^(buy\s+\S.*|our products|transmission|buildings?|distribution|digital solutions|electrification|power grids?|product\s*&\s*cad models)$/i;

const SUPPLIER_PREFIX =
  /^(nexans|prysmian|belden|metal\s*supermarkets?)\s+/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * True for nav-dump labels such as "Buy Metals", "Our Products",
 * "Transmission", "Buildings", "Distribution", and supplier-prefixed
 * variants ("Nexans Transmission", "Belden Our Products").
 * Real SKUs that merely contain those words ("Power Transmission Belts")
 * are kept.
 */
export function isCatalogueJunkTitle(
  name?: string | null,
  supplierName?: string | null
): boolean {
  const raw = (name ?? "").trim();
  if (!raw) return false;
  if (JUNK_CORE.test(raw)) return true;

  const withoutGeneric = raw.replace(SUPPLIER_PREFIX, "").trim();
  if (withoutGeneric !== raw && JUNK_CORE.test(withoutGeneric)) return true;

  const supplier = (supplierName ?? "").trim();
  if (supplier.length >= 3) {
    const withoutSupplier = raw
      .replace(new RegExp(`^${escapeRegExp(supplier)}\\s+`, "i"), "")
      .trim();
    if (withoutSupplier !== raw && JUNK_CORE.test(withoutSupplier)) return true;
  }
  return false;
}

export function excludeCatalogueJunk<T extends { name: string; supplierName: string }>(
  items: T[]
): T[] {
  return items.filter((item) => !isCatalogueJunkTitle(item.name, item.supplierName));
}
