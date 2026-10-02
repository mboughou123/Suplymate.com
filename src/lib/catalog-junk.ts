// Website scrapes pick up menu and section headings ("Our Products",
// "Transmission", "Buy Metals") as if they were SKUs. These are never products.

export const NAVIGATION_TITLES = [
  "buy metals",
  "our products",
  "all products",
  "products",
  "product range",
  "buildings",
  "distribution",
  "transmission",
  "power grid",
  "electrification",
  "digital solutions",
  "product & cad models",
  "solutions",
  "industries",
  "markets",
  "applications",
  "services",
  "catalogue",
  "catalog",
  "home",
  "about us",
  "contact us",
] as const;

const NAVIGATION_SET = new Set<string>(NAVIGATION_TITLES);

const GENERIC_HEADING =
  /^(our|all|buy|shop|view|browse|explore|see|discover)\s+(products?|solutions?|services?|industries|markets?|range|catalog(ue)?|metals?)$/i;

export function isNavigationTitle(name: string | null | undefined): boolean {
  const n = (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!n) return true;
  return NAVIGATION_SET.has(n) || GENERIC_HEADING.test(n);
}
