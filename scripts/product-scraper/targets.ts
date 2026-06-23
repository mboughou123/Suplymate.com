import type { ScrapeTarget } from "./types";

// Supplier-website product scrape targets.
//
// COMPLIANCE: list ONLY public product/catalogue pages. The scraper checks
// robots.txt before every request, rate-limits, refuses social/private/auth
// pages, and never bypasses anti-bot protection. supplierId/category are
// OPTIONAL — when omitted the import step links the product to a supplier by
// the page's domain (creating a PENDING supplier if needed) and infers the
// category from the product name.
//
// The default list below uses a public site purpose-built for scraping practice
// (webscraper.io, allowed by its robots.txt) so `npm run products:scrape`
// produces real product records WITH real images out of the box. Replace/extend
// with the real supplier catalogue pages you have permission to index — the
// fastest way is a URL file:
//
//   npm run products:scrape -- --file=scripts/import/examples/product-catalogs.txt --limit=150
export const TARGETS: ScrapeTarget[] = [
  { key: "ws-all", url: "https://webscraper.io/test-sites/e-commerce/allinone" },
  { key: "ws-computers", url: "https://webscraper.io/test-sites/e-commerce/allinone/computers" },
  { key: "ws-laptops", url: "https://webscraper.io/test-sites/e-commerce/allinone/computers/laptops" },
  { key: "ws-tablets", url: "https://webscraper.io/test-sites/e-commerce/allinone/computers/tablets" },
  { key: "ws-phones", url: "https://webscraper.io/test-sites/e-commerce/allinone/phones" },
  { key: "ws-touch", url: "https://webscraper.io/test-sites/e-commerce/allinone/phones/touch" },
  { key: "ws-static", url: "https://webscraper.io/test-sites/e-commerce/static" },
  { key: "ws-static-computers", url: "https://webscraper.io/test-sites/e-commerce/static/computers" },
  { key: "ws-static-laptops", url: "https://webscraper.io/test-sites/e-commerce/static/computers/laptops" },
  { key: "ws-static-tablets", url: "https://webscraper.io/test-sites/e-commerce/static/computers/tablets" },
  { key: "ws-static-phones", url: "https://webscraper.io/test-sites/e-commerce/static/phones" },
];
