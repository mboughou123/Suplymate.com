// Website-scraped products carry a supplier id derived from the scraped domain
// ("siemens-com", "products-swagelok-com") and a name guessed from it
// ("Products", "Rockwellautomation"). Resolve them to a real directory profile
// when one exists so "View supplier" never links to a 404.

/** Scraped domain id → directory supplier id. */
const SUPPLIER_ALIASES: Record<string, string> = {
  "smcusa-com": "smc-corporation",
};

/** Display names for scraped domains whose guessed name is wrong. */
const DOMAIN_NAMES: Record<string, string> = {
  "siemens-com": "Siemens",
  "rockwellautomation-com": "Rockwell Automation",
  "products-swagelok-com": "Swagelok",
  "smcusa-com": "SMC Corporation",
  "metalsupermarkets-com": "Metal Supermarkets",
  "belden-com": "Belden",
  "nexans-com": "Nexans",
  "prysmian-com": "Prysmian",
};

export type CatalogSupplier = {
  /** Directory id when a profile page exists, otherwise the original id. */
  id: string;
  name: string;
  /** True only when /supplier/<id> resolves to a profile. */
  hasProfile: boolean;
};

/** Candidate directory ids for a (possibly domain-derived) supplier id. */
export function supplierIdCandidates(supplierId: string): string[] {
  const out = [supplierId];
  const alias = SUPPLIER_ALIASES[supplierId];
  if (alias) out.push(alias);
  const bare = supplierId.replace(/^(www|products|shop|store)-/, "").replace(/-(com|net|org|co|io|de|in|ae|cn)$/, "");
  if (bare && bare !== supplierId) out.push(bare);
  return [...new Set(out)];
}

/**
 * @param profiles id → name of suppliers whose profile page is public
 *   (static directory plus visible DB rows).
 */
export function resolveCatalogSupplier(
  supplierId: string | null | undefined,
  supplierName: string | null | undefined,
  profiles: ReadonlyMap<string, string>,
): CatalogSupplier {
  const id = supplierId ?? "";
  const guessed = DOMAIN_NAMES[id] ?? supplierName ?? "Suplymate catalogue";
  if (!id) return { id, name: guessed, hasProfile: false };
  for (const candidate of supplierIdCandidates(id)) {
    const name = profiles.get(candidate);
    if (name !== undefined) {
      return { id: candidate, name: candidate === id ? guessed : name, hasProfile: true };
    }
  }
  return { id, name: guessed, hasProfile: false };
}
