export type CatalogueFilters = {
  search: string;
  category: string;
  supplierId: string;
  country: string;
  verifiedOnly: boolean;
  hasPrice: boolean;
};

export const EMPTY_CATALOGUE_FILTERS: CatalogueFilters = {
  search: "",
  category: "",
  supplierId: "",
  country: "",
  verifiedOnly: false,
  hasPrice: false,
};

export function isDefaultCatalogueFilters(f: CatalogueFilters): boolean {
  return (
    !f.search.trim() &&
    !f.category &&
    !f.supplierId &&
    !f.country &&
    !f.verifiedOnly &&
    !f.hasPrice
  );
}

export function buildCatalogueQuery(f: CatalogueFilters, page: number, pageSize: number): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  if (f.search.trim()) p.set("search", f.search.trim());
  if (f.category) p.set("category", f.category);
  if (f.supplierId) p.set("supplierId", f.supplierId);
  if (f.country) p.set("country", f.country);
  if (f.verifiedOnly) p.set("verifiedOnly", "1");
  if (f.hasPrice) p.set("hasPrice", "1");
  return p.toString();
}
