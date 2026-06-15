// Supplier-website product scraper.
//
//   npm run products:scrape
//
// COMPLIANCE & SAFETY:
//   - Checks robots.txt before every request (skips disallowed paths).
//   - Descriptive User-Agent, single-threaded, rate-limited between requests.
//   - Per-request timeout + try/catch; one failure never aborts the run.
//   - Never scrapes login / account / checkout / restricted pages.
//   - Stores the public source URL on every product.
//   - De-duplicates by (supplier + product name) and by source URL.
//   - All output is marked status="pending" and must be approved by an admin
//     (/admin/products) before it ever appears publicly.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import * as cheerio from "cheerio";
import { TARGETS } from "./targets";
import { isAllowed } from "./robots";
import type { ScrapeTarget, ScrapedProduct, ScrapeStats } from "./types";

const USER_AGENT =
  "SuplymateBot/1.0 (+https://suplymate.com/bot; product catalogue indexer)";
const DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 2500);
const TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS ?? 15_000);
const CACHE_FILE = join(
  process.cwd(),
  "scripts",
  "product-scraper",
  "cache",
  "products.json"
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function dedupeKey(supplierId: string, name: string): string {
  return `${supplierId}::${name.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

function parsePrice(text: string | undefined | null): number | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

function absUrl(base: string, href: string | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

type Extracted = {
  name: string;
  price: number | null;
  image: string | null;
  description: string | null;
  link: string | null;
};

// Prefer schema.org Product JSON-LD when present.
function extractJsonLd($: cheerio.CheerioAPI, baseUrl: string): Extracted[] {
  const out: Extracted[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    const nodes: Record<string, unknown>[] = [];
    const visit = (n: unknown) => {
      if (Array.isArray(n)) n.forEach(visit);
      else if (n && typeof n === "object") {
        const obj = n as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(visit);
        nodes.push(obj);
      }
    };
    visit(data);
    for (const node of nodes) {
      const type = node["@type"];
      const isProduct = Array.isArray(type)
        ? type.includes("Product")
        : type === "Product";
      if (!isProduct || typeof node.name !== "string") continue;
      const offers = node.offers as Record<string, unknown> | undefined;
      const priceRaw =
        offers && (offers.price ?? (offers.lowPrice as unknown));
      const img = node.image;
      const image = Array.isArray(img)
        ? absUrl(baseUrl, String(img[0]))
        : typeof img === "string"
        ? absUrl(baseUrl, img)
        : null;
      out.push({
        name: node.name,
        price: parsePrice(priceRaw != null ? String(priceRaw) : null),
        image,
        description:
          typeof node.description === "string" ? node.description : null,
        link: typeof node.url === "string" ? absUrl(baseUrl, node.url) : null,
      });
    }
  });
  return out;
}

// Heuristic fallback for common product-card markup.
function extractCards($: cheerio.CheerioAPI, baseUrl: string): Extracted[] {
  const out: Extracted[] = [];
  const selectors = [
    ".product",
    ".thumbnail",
    ".card",
    "[itemtype*='Product']",
    "li.product",
  ];
  const seen = new Set<string>();
  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const name =
        $el.find(".title, .card-title, h3, h4, [itemprop='name']").first().text().trim() ||
        $el.find("a[title]").first().attr("title") ||
        "";
      if (!name || seen.has(name.toLowerCase())) return;
      const price =
        $el.find(".price, .card-price, [itemprop='price']").first().text().trim() ||
        $el.find("[data-price]").first().attr("data-price") ||
        "";
      const imgEl = $el.find("img").first();
      const image = absUrl(baseUrl, imgEl.attr("src") || imgEl.attr("data-src"));
      const description = $el
        .find(".description, .card-text, p")
        .first()
        .text()
        .trim();
      const link = absUrl(baseUrl, $el.find("a").first().attr("href"));
      seen.add(name.toLowerCase());
      out.push({
        name,
        price: parsePrice(price),
        image,
        description: description || null,
        link,
      });
    });
    if (out.length) break; // first selector that yields results wins
  }
  return out;
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`  ! ${res.status} ${res.statusText} for ${url}`);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) {
      console.warn(`  ! non-HTML content (${ct}) for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.warn(`  ! fetch error for ${url}: ${(err as Error).message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toScrapedProduct(
  target: ScrapeTarget,
  e: Extracted
): ScrapedProduct {
  return {
    id: `scraped-${target.key}-${slugify(e.name)}`,
    supplierId: target.supplierId,
    supplierName: target.supplierName,
    supplierLogo: null,
    name: e.name,
    category: target.category,
    images: e.image ? [e.image] : [],
    videos: [],
    basePrice: e.price,
    commissionRate: null,
    currency: target.currency ?? "USD",
    moq: null,
    shippingTime: null,
    description: e.description,
    specifications: {},
    customizationOptions: [],
    certifications: [],
    rating: null,
    reviewCount: null,
    sourceUrl: e.link ?? target.url,
    verifiedSupplier: false,
    status: "pending",
    scrapedAt: new Date().toISOString(),
  };
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

async function main() {
  console.log(`Suplymate product scraper — ${TARGETS.length} target(s)\n`);
  const existing = loadCache();
  const byKey = new Set(existing.map((p) => dedupeKey(p.supplierId, p.name)));
  const byUrl = new Set(existing.map((p) => p.sourceUrl));
  const collected: ScrapedProduct[] = [...existing];

  const stats: ScrapeStats = {
    attempted: 0,
    scraped: 0,
    skippedRobots: 0,
    skippedDuplicate: 0,
    errors: 0,
  };

  for (const target of TARGETS) {
    stats.attempted++;
    console.log(`→ ${target.supplierName}: ${target.url}`);

    const allowed = await isAllowed(target.url, USER_AGENT);
    if (!allowed) {
      console.warn("  ⨯ disallowed by robots.txt — skipping");
      stats.skippedRobots++;
      continue;
    }

    const html = await fetchHtml(target.url);
    if (!html) {
      stats.errors++;
      await sleep(DELAY_MS);
      continue;
    }

    const $ = cheerio.load(html);
    let extracted = extractJsonLd($, target.url);
    if (!extracted.length) extracted = extractCards($, target.url);
    console.log(`  found ${extracted.length} candidate product(s)`);

    for (const e of extracted) {
      if (!e.name) continue;
      const key = dedupeKey(target.supplierId, e.name);
      const product = toScrapedProduct(target, e);
      if (byKey.has(key) || byUrl.has(product.sourceUrl)) {
        stats.skippedDuplicate++;
        continue;
      }
      byKey.add(key);
      byUrl.add(product.sourceUrl);
      collected.push(product);
      stats.scraped++;
    }

    await sleep(DELAY_MS); // rate limit between targets
  }

  saveCache(collected);
  console.log("\nDone.");
  console.log(stats);
  console.log(`\nCache: ${CACHE_FILE}`);
  console.log("Next: npm run products:import   (then review at /admin/products)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
