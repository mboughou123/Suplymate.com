// Supplier-website product scraper.
//
//   npm run products:scrape                         # scrape the curated TARGETS
//   npm run products:scrape -- --file=urls.txt      # scrape URLs from a file
//   npm run products:scrape -- --url=https://…      # scrape one or more URLs
//   npm run products:scrape -- --limit=150          # stop after N products
//
// The --file format is one entry per line; blank lines and lines starting with
// "#" are ignored. Each line may optionally carry a category and supplier id:
//   https://site.com/catalog
//   https://site.com/catalog | Steel & Metals
//   https://site.com/catalog | Steel & Metals | rotterdam-steel-works
//
// COMPLIANCE & SAFETY (delegated to src/lib/scraper):
//   - Refuses social networks + private/auth/checkout pages (safety.ts).
//   - Honours robots.txt + Crawl-delay (robotsChecker.ts).
//   - Descriptive User-Agent, single-threaded, rate-limited, per-request timeout.
//   - One failure never aborts the run.
//   - Stores the public source URL + original image source on every product.
//   - De-duplicates by source URL, (supplier + normalized name), SKU and image.
//   - All output is status="pending" and must be published by an admin.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import * as cheerio from "cheerio";
import { checkUrlSafety } from "../../src/lib/scraper/safety";
import { isAllowed, crawlDelaySeconds } from "../../src/lib/scraper/robotsChecker";
import { fetchHtml, sleep } from "../../src/lib/scraper/http";
import { extractProducts } from "../../src/lib/scraper/productExtractor";
import { SCRAPER_USER_AGENT } from "../../src/lib/scraper/types";
import { TARGETS } from "./targets";
import { inferCategory } from "./category";
import type { ScrapeTarget, ScrapedProduct, ScrapeStats } from "./types";
import type { ProductCategory } from "../../src/data/products";

const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 2500);
const CACHE_FILE = join(process.cwd(), "scripts", "product-scraper", "cache", "products.json");

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function dedupeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function loadCache(): ScrapedProduct[] {
  if (!existsSync(CACHE_FILE)) return [];
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as ScrapedProduct[];
  } catch {
    return [];
  }
}

function saveCache(items: ScrapedProduct[]) {
  mkdirSync(dirname(CACHE_FILE), { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(items, null, 2));
}

function parseFileTargets(path: string): ScrapeTarget[] {
  const abs = join(process.cwd(), path);
  if (!existsSync(abs)) return [];
  return readFileSync(abs, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((line, i) => {
      const [url, category, supplierId] = line.split("|").map((p) => p.trim());
      return {
        key: `file-${i}-${domainOf(url)}`,
        url,
        category: (category || undefined) as ProductCategory | undefined,
        supplierId: supplierId || undefined,
      } satisfies ScrapeTarget;
    });
}

function argValues(name: string): string[] {
  return process.argv
    .filter((a) => a.startsWith(`--${name}=`))
    .map((a) => a.split("=").slice(1).join("="));
}

async function main() {
  const limit = Number(argValues("limit")[0] ?? 0) || Infinity;

  const targets: ScrapeTarget[] = [];
  for (const u of argValues("url")) {
    targets.push({ key: `url-${domainOf(u)}`, url: u });
  }
  for (const f of argValues("file")) targets.push(...parseFileTargets(f));
  if (targets.length === 0) targets.push(...TARGETS);

  console.log(`Suplymate product scraper — ${targets.length} target(s)\n`);

  const existing = loadCache();
  const byUrl = new Set(existing.map((p) => p.sourceUrl));
  const byKey = new Set(existing.map((p) => `${p.supplierId}::${dedupeName(p.name)}`));
  const byImage = new Set(existing.map((p) => p.images?.[0]).filter(Boolean) as string[]);
  const collected: ScrapedProduct[] = [...existing];

  const stats: ScrapeStats = {
    attempted: 0,
    scraped: 0,
    skippedRobots: 0,
    skippedDuplicate: 0,
    errors: 0,
  };

  for (const target of targets) {
    if (stats.scraped >= limit) break;
    stats.attempted++;
    console.log(`→ ${target.url}`);

    const safety = checkUrlSafety(target.url);
    if (!safety.allowed) {
      console.warn(`  ⨯ refused: ${safety.reason}`);
      stats.skippedRobots++;
      continue;
    }

    let allowed = true;
    try {
      allowed = await isAllowed(target.url, SCRAPER_USER_AGENT);
    } catch {
      allowed = true;
    }
    if (!allowed) {
      console.warn("  ⨯ disallowed by robots.txt — skipping");
      stats.skippedRobots++;
      continue;
    }

    const { html, error, finalUrl } = await fetchHtml(target.url);
    if (!html) {
      console.warn(`  ! fetch failed: ${error ?? "unknown"}`);
      stats.errors++;
      await sleep(DELAY_MS);
      continue;
    }

    const $ = cheerio.load(html);
    const extracted = extractProducts($, finalUrl);
    console.log(`  found ${extracted.length} candidate product(s)`);

    const domain = domainOf(finalUrl);
    for (const e of extracted) {
      if (stats.scraped >= limit) break;
      if (!e.name) continue;
      const category = target.category ?? inferCategory(`${e.name} ${e.description ?? ""}`);
      const supplierId = target.supplierId ?? `domain:${domain}`;
      const key = `${supplierId}::${dedupeName(e.name)}`;
      const primaryImage = e.images?.[0] ?? e.imageUrl ?? null;

      if (byUrl.has(e.sourceUrl) && byKey.has(key)) {
        stats.skippedDuplicate++;
        continue;
      }
      if (key && byKey.has(key)) {
        stats.skippedDuplicate++;
        continue;
      }
      if (primaryImage && byImage.has(primaryImage)) {
        stats.skippedDuplicate++;
        continue;
      }

      byKey.add(key);
      byUrl.add(e.sourceUrl);
      if (primaryImage) byImage.add(primaryImage);

      const record: ScrapedProduct = {
        id: `scraped-${slugify(domain)}-${slugify(e.name)}`,
        supplierId,
        supplierName: target.supplierName ?? domain,
        supplierLogo: null,
        supplierCountry: null,
        name: e.name,
        slug: slugify(e.name),
        category,
        images: e.images ?? (primaryImage ? [primaryImage] : []),
        videos: [],
        basePrice: e.price,
        priceUnit: e.priceUnit,
        commissionRate: null,
        currency: e.currency ?? target.currency ?? "USD",
        moq: e.minimumOrderQuantity,
        minimumOrderUnit: null,
        shippingTime: e.shippingInfo,
        description: e.description,
        shortDescription: e.description ? e.description.slice(0, 160) : null,
        specifications: {},
        customizationOptions: [],
        certifications: [],
        rating: null,
        reviewCount: null,
        sourceUrl: e.sourceUrl,
        productUrl: e.productUrl,
        imageSourceUrl: primaryImage,
        sku: e.sku,
        verifiedSupplier: false,
        status: "pending",
        scrapedAt: new Date().toISOString(),
      };
      collected.push(record);
      stats.scraped++;
    }

    // Respect the larger of the site's crawl-delay and our default.
    let delay = DELAY_MS;
    try {
      const cd = await crawlDelaySeconds(target.url);
      if (cd && cd * 1000 > delay) delay = cd * 1000;
    } catch {
      // ignore
    }
    await sleep(delay);
  }

  saveCache(collected);
  console.log("\nDone.");
  console.log(stats);
  console.log(`\nCache: ${CACHE_FILE} (${collected.length} total)`);
  console.log("Next: npm run products:import   (links suppliers, then review at /admin/products)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
