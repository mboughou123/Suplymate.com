// Supplier-website scraper orchestrator.
//
// Public entry points:
//   scrapeSupplierWebsite(url)      → scrape a single public company site
//   scrapeSupplierWebsites(urls)    → scrape several, rate-limited & sequential
//
// COMPLIANCE GUARANTEES (enforced here + in the helper modules):
//   1. safety.ts blocks social networks (LinkedIn, X, …) and private/auth/
//      transactional paths (login, account, checkout, admin, api…).
//   2. robotsChecker.ts honours robots.txt (Allow/Disallow + Crawl-delay).
//   3. Requests are sequential, single-threaded, with a descriptive User-Agent
//      and a polite delay (max of robots Crawl-delay and SCRAPE_DELAY_MS).
//   4. No captcha/anti-bot circumvention — blocked pages are simply skipped.
//   5. Every supplier/product/image/certification carries its public sourceUrl.
//   6. Resilient: a failure on one URL never aborts the batch; missing data
//      yields nulls/empty arrays, never a thrown error.
//
// Location/factory PHOTOS are intentionally NOT scraped from third parties; use
// the Outscraper / Google Places extension point (see enrichWithPlacePhotos).

import * as cheerio from "cheerio";
import { checkUrlSafety } from "./safety";
import { isAllowed, crawlDelaySeconds } from "./robotsChecker";
import { fetchHtml, sleep } from "./http";
import { extractCompanyInfo } from "./companyExtractor";
import { extractLogo, extractImages } from "./imageExtractor";
import { extractCertifications } from "./certificationExtractor";
import { extractProducts } from "./productExtractor";
import { SCRAPER_USER_AGENT, type ScrapedSupplier } from "./types";

const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 2500);

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

function blocked(url: string, reason: string): ScrapedSupplier {
  return {
    sourceUrl: url,
    name: null,
    description: null,
    logoUrl: null,
    website: null,
    phone: null,
    email: null,
    address: null,
    images: [],
    certificationImages: [],
    certifications: [],
    products: [],
    warnings: [{ stage: "guard", message: reason }],
    ok: false,
    blockedReason: reason,
  };
}

/**
 * Scrape a single public supplier website. Returns a structured result with a
 * `warnings` log; `ok=false` + `blockedReason` when the site was refused.
 */
export async function scrapeSupplierWebsite(rawUrl: string): Promise<ScrapedSupplier> {
  const warnings: ScrapedSupplier["warnings"] = [];

  // 1) Our own safety policy (social/private/auth).
  const safety = checkUrlSafety(rawUrl);
  if (!safety.allowed) return blocked(rawUrl, safety.reason);

  // 2) robots.txt.
  let allowed = true;
  try {
    allowed = await isAllowed(rawUrl, SCRAPER_USER_AGENT);
  } catch {
    allowed = true; // robots fetch failure → permit, but we still rate-limit
  }
  if (!allowed) return blocked(rawUrl, "disallowed by robots.txt");

  // 3) Fetch.
  const { html, error, finalUrl } = await fetchHtml(rawUrl);
  if (!html) {
    const result = blocked(rawUrl, `fetch failed: ${error ?? "unknown"}`);
    return result;
  }

  // 4) Parse + extract. Each stage is wrapped so one failure can't abort.
  const $ = cheerio.load(html);
  const origin = (() => {
    try {
      return new URL(finalUrl).origin;
    } catch {
      return finalUrl;
    }
  })();

  let company = { name: null, description: null, phone: null, email: null, address: null } as ReturnType<
    typeof extractCompanyInfo
  >;
  try {
    company = extractCompanyInfo($);
  } catch (e) {
    warnings.push({ stage: "company", message: (e as Error).message });
  }

  let logoUrl: string | null = null;
  let supplierImages: string[] = [];
  try {
    logoUrl = extractLogo($, finalUrl);
    const imgs = extractImages($, finalUrl);
    // Separate badges (certs) from general gallery imagery; drop the logo.
    supplierImages = dedupe(
      imgs.filter((i) => !i.isBadge && i.url !== logoUrl).map((i) => i.url)
    ).slice(0, 24);
  } catch (e) {
    warnings.push({ stage: "images", message: (e as Error).message });
  }

  let certifications: ScrapedSupplier["certifications"] = [];
  let certificationImages: string[] = [];
  try {
    const certResult = extractCertifications($, finalUrl);
    certifications = certResult.certifications;
    certificationImages = dedupe(certResult.certificationImages).slice(0, 24);
  } catch (e) {
    warnings.push({ stage: "certifications", message: (e as Error).message });
  }

  let products: ScrapedSupplier["products"] = [];
  try {
    products = extractProducts($, finalUrl).slice(0, 60);
  } catch (e) {
    warnings.push({ stage: "products", message: (e as Error).message });
  }

  return {
    sourceUrl: finalUrl,
    name: company.name,
    description: company.description,
    logoUrl,
    website: origin,
    phone: company.phone,
    email: company.email,
    address: company.address,
    images: supplierImages,
    certificationImages,
    certifications,
    products,
    warnings,
    ok: true,
  };
}

/**
 * Scrape several supplier websites sequentially, honouring per-site Crawl-delay
 * and a global politeness delay between requests. Never throws — failures are
 * captured in each result's `warnings`/`blockedReason`.
 */
export async function scrapeSupplierWebsites(urls: string[]): Promise<ScrapedSupplier[]> {
  const results: ScrapedSupplier[] = [];
  const unique = dedupe(urls.map((u) => u.trim()));

  for (let i = 0; i < unique.length; i++) {
    const url = unique[i];
    let result: ScrapedSupplier;
    try {
      result = await scrapeSupplierWebsite(url);
    } catch (e) {
      result = blocked(url, `unexpected error: ${(e as Error).message}`);
    }
    results.push(result);

    if (i < unique.length - 1) {
      // Respect the larger of the site's declared crawl-delay and our default.
      let delay = DELAY_MS;
      try {
        const cd = await crawlDelaySeconds(url);
        if (cd && cd * 1000 > delay) delay = cd * 1000;
      } catch {
        // ignore — fall back to default delay
      }
      await sleep(delay);
    }
  }
  return results;
}

/**
 * Extension point: enrich a scraped supplier with location/factory photos and
 * verified contact data from Google Places via the existing Outscraper pipeline
 * (scripts/outscraper). We deliberately do NOT scrape third-party photos here.
 *
 * Wire this up by querying Outscraper/Places for the supplier name+address and
 * merging returned photo URLs into `images`. Left as a no-op pending an API key
 * (GOOGLE_PLACES_API_KEY / OUTSCRAPER_API_KEY).
 */
export async function enrichWithPlacePhotos(
  supplier: ScrapedSupplier
): Promise<ScrapedSupplier> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    // Optional feature: no key → skip cleanly, never crash the scrape.
    console.info(
      "[scraper] GOOGLE_PLACES_API_KEY not set — skipping Google Places photo enrichment."
    );
    return supplier;
  }

  // TODO(integration): call Outscraper/Google Places using supplier.name +
  // supplier.address, then append returned photo URLs to supplier.images.
  // The key is present; wire the Places/Outscraper call here. Until then we log
  // and return the supplier unchanged so behaviour stays safe and predictable.
  console.info(
    `[scraper] Google Places enrichment available (key present) but not yet wired for ${
      supplier.name ?? supplier.sourceUrl
    }.`
  );
  return supplier;
}

export type { ScrapedSupplier } from "./types";
