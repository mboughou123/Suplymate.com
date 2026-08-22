// Quality gate for scraped catalogue rows.
//
// The site scrapers walk supplier websites and occasionally capture navigation
// or section labels ("Our Products", "Distribution", "Buy Metals") as product
// rows. Those rows have no price, no unit and nothing to show on a detail page,
// so they must never reach a public surface.
//
// The stoplist is deliberately an exact-label match rather than a pattern.
// Legitimate alloy names are frequently short, all-caps and digit-bearing
// ("HASTELLOY C-276", "SAE 8620", "Monel 400 / K500"), so any heuristic based
// on casing or digits would discard real products.

/** Navigation and section labels observed in scraped product feeds. */
const NON_PRODUCT_LABELS = [
  "about",
  "about us",
  "blog",
  "buildings",
  "buy metals",
  "careers",
  "certificates",
  "clients",
  "contact",
  "contact us",
  "distribution",
  "downloads",
  "enquiry",
  "faq",
  "gallery",
  "home",
  "infrastructure",
  "login",
  "news",
  "our products",
  "our services",
  "product",
  "products",
  "quality",
  "search",
  "services",
  "sitemap",
];

const NON_PRODUCT_LOOKUP = new Set(NON_PRODUCT_LABELS);

/**
 * True when a scraped row looks like an actual product rather than a scraped
 * navigation label. Rejects the stoplist, blanks, and names with no letters.
 */
export function isRealProductName(name: string | null | undefined): boolean {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 3) return false;
  if (!/\p{L}/u.test(trimmed)) return false;
  return !NON_PRODUCT_LOOKUP.has(trimmed.toLowerCase());
}

/**
 * Case-insensitive Prisma `NOT` clause excluding the stoplist, so DB-level
 * pagination counts stay consistent with the rows actually rendered.
 */
export function nonProductNameFilter() {
  return {
    NOT: {
      OR: NON_PRODUCT_LABELS.map((label) => ({
        name: { equals: label, mode: "insensitive" as const },
      })),
    },
  };
}
