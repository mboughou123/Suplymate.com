// Fetches PUBLIC business listings from Outscraper (Google Maps data) for each
// category/country query and caches the raw results to disk.
//
// Usage:
//   OUTSCRAPER_API_KEY=xxx npx tsx scripts/outscraper/fetch.ts [--limit=20]
//
// Compliance: only public business information is requested. No private data,
// no CAPTCHA solving, no logins. Respect Outscraper & Google Terms of Service
// and your Outscraper plan's rate limits / credits.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildQueries } from "./queries";

const API = "https://api.outscraper.com/maps/search-v3";
const CACHE_DIR = join(process.cwd(), "scripts", "outscraper", "cache");
const CACHE_FILE = join(CACHE_DIR, "raw.json");

type RawPlace = Record<string, unknown>;
type CacheEntry = { category: string; query: string; places: RawPlace[] };

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchQuery(
  apiKey: string,
  query: string,
  limit: number
): Promise<RawPlace[]> {
  const url =
    `${API}?query=${encodeURIComponent(query)}` +
    `&limit=${limit}&async=false&dropDuplicates=true&language=en`;

  const res = await fetch(url, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Outscraper ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: RawPlace[][] };
  // Sync response: data is an array (one entry per query) of place arrays.
  return json.data?.[0] ?? [];
}

async function main() {
  const apiKey = process.env.OUTSCRAPER_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Missing OUTSCRAPER_API_KEY. Get one at https://outscraper.com and run:\n" +
        "  OUTSCRAPER_API_KEY=xxx npx tsx scripts/outscraper/fetch.ts"
    );
    process.exit(1);
  }

  const limit = Number(arg("limit", "20"));
  const { jobs } = buildQueries(limit);
  console.log(`Fetching ${jobs.length} queries (limit ${limit} each)…`);

  const entries: CacheEntry[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const { query, category } = jobs[i];
    try {
      const places = await fetchQuery(apiKey, query, limit);
      entries.push({ category, query, places });
      console.log(`  [${i + 1}/${jobs.length}] ${query} → ${places.length}`);
    } catch (err) {
      console.warn(
        `  [${i + 1}/${jobs.length}] ${query} → FAILED: ${(err as Error).message}`
      );
    }
    // Polite spacing between requests.
    await sleep(1200);
  }

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(entries, null, 2));
  const total = entries.reduce((n, e) => n + e.places.length, 0);
  console.log(`\nSaved ${total} raw places across ${entries.length} queries to`);
  console.log(`  ${CACHE_FILE}`);
  console.log("Next: npx tsx scripts/import-suppliers.ts --source=outscraper");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
