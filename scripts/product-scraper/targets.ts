import type { ScrapeTarget } from "./types";

// Supplier-website scrape targets.
//
// COMPLIANCE: list ONLY public product/catalogue pages. The scraper checks
// robots.txt before every request, rate-limits, and never touches login,
// account, checkout or otherwise restricted pages. Replace/extend these with the
// real supplier catalogue URLs you have permission to index. The supplierId
// should match a supplier in the Suplymate directory so products link correctly.
//
// The default list intentionally contains a public scrape-friendly demo store so
// `npm run products:scrape` produces output without targeting a real business.
export const TARGETS: ScrapeTarget[] = [
  {
    key: "demo-store",
    supplierId: "rotterdam-steel-works",
    supplierName: "Rotterdam Steel Works",
    category: "Steel & Metals",
    currency: "USD",
    // Public site purpose-built for scraping practice (allowed by its robots.txt).
    url: "https://webscraper.io/test-sites/e-commerce/allinone",
  },
  // --- Add real supplier catalogue pages below, e.g.: ---
  // {
  //   key: "acme-tubes",
  //   supplierId: "casablanca-tube-pipe-co",
  //   supplierName: "Casablanca Tube & Pipe Co.",
  //   category: "Tubes & Pipes",
  //   currency: "USD",
  //   url: "https://acme-tubes.example.com/catalogue",
  // },
];
