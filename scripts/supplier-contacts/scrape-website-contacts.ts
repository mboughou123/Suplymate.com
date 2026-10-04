// Fill missing supplier phone / email from each supplier's OFFICIAL website.
//
//   npx tsx scripts/supplier-contacts/scrape-website-contacts.ts
//   add --limit=20 to try a few suppliers, --only=<id>,<id> for specific ones
//
// Reads the public directory (DB when DATABASE_URL is set, else the bundled
// Outscraper + curated pack dataset), visits the homepage plus up to two
// contact / imprint pages per supplier, and writes what it finds to
// src/data/generated/supplier-contacts.json with the page each value came from.
// Values already stored on the supplier are never overwritten. Respects
// robots.txt and the scraper safety policy; no value is ever guessed.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { getSuppliersFromDb } from "../../src/lib/data-service";
import { fetchHtml } from "../../src/lib/scraper/http";
import { isAllowed } from "../../src/lib/scraper/robotsChecker";
import { checkUrlSafety } from "../../src/lib/scraper/safety";
import {
  extractContactCandidates,
  findContactPageUrls,
  pickEmail,
} from "../../src/lib/scraper/contactExtractor";
import type { WebsiteContactFile, WebsiteContact } from "../../src/lib/supplier-contact";

const OUT = join(process.cwd(), "src", "data", "generated", "supplier-contacts.json");
const CONCURRENCY = 12;
const TIMEOUT_MS = 12_000;

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : null;
}

function withScheme(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

async function loadPage(url: string) {
  if (!checkUrlSafety(url).allowed) return null;
  if (!(await isAllowed(url))) return null;
  const res = await fetchHtml(url, TIMEOUT_MS);
  if (!res.html) return null;
  return { $: cheerio.load(res.html), url: res.finalUrl };
}

async function scrapeOne(website: string, needPhone: boolean, needEmail: boolean) {
  const home = await loadPage(withScheme(website));
  if (!home) return null;
  const pages = [home];
  for (const url of findContactPageUrls(home.$, home.url)) {
    const page = await loadPage(url);
    if (page) pages.push(page);
  }

  // Contact pages first: their numbers are the ones the supplier wants buyers to use.
  const ordered = [...pages.slice(1), pages[0]].map((p) => ({
    url: p.url,
    ...extractContactCandidates(p.$, p.url),
  }));
  const result: WebsiteContact = { collectedAt: new Date().toISOString().slice(0, 10) };
  if (needPhone) {
    const hit = ordered.find((p) => p.phones.length);
    if (hit) {
      result.phone = hit.phones[0];
      result.phoneSourceUrl = hit.url;
    }
  }
  if (needEmail) {
    const all = ordered.flatMap((p) => p.emails.map((email) => ({ email, url: p.url })));
    const email = pickEmail(all.map((x) => x.email), home.url);
    if (email) {
      result.email = email;
      result.emailSourceUrl = all.find((x) => x.email === email)!.url;
    }
  }
  return result.phone || result.email ? result : null;
}

async function main() {
  const only = arg("only")?.split(",") ?? null;
  const limit = Number(arg("limit") ?? 0) || Infinity;
  const suppliers = (await getSuppliersFromDb())
    .filter((s) => s.website && (!s.phone?.trim() || !s.email?.trim()))
    .filter((s) => !only || only.includes(s.id))
    .slice(0, limit);

  console.log(`[contacts] ${suppliers.length} suppliers with a website and a missing phone or email`);
  const found: Record<string, WebsiteContact> = {};
  let done = 0;
  let next = 0;
  async function worker() {
    while (next < suppliers.length) {
      const s = suppliers[next++];
      try {
        const r = await scrapeOne(s.website!, !s.phone?.trim(), !s.email?.trim());
        if (r) found[s.id] = r;
      } catch (err) {
        console.warn(`[contacts] ${s.id}: ${err instanceof Error ? err.message : err}`);
      }
      done++;
      if (done % 25 === 0) console.log(`[contacts] ${done}/${suppliers.length} · ${Object.keys(found).length} with data`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Partial runs (--only / --limit) refresh just the suppliers they visited.
  const previous = (JSON.parse(readFileSync(OUT, "utf8")) as WebsiteContactFile).suppliers;
  const merged = { ...previous };
  for (const s of suppliers) delete merged[s.id];
  Object.assign(merged, found);
  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  const file: WebsiteContactFile = {
    generatedAt: new Date().toISOString(),
    method:
      "Official supplier website (homepage + contact/imprint pages): tel:/mailto: links, schema.org, Cloudflare-protected and on-domain emails. robots.txt respected.",
    suppliers: sorted,
  };
  writeFileSync(OUT, JSON.stringify(file, null, 2) + "\n");
  const phones = Object.values(sorted).filter((c) => c.phone).length;
  const emails = Object.values(sorted).filter((c) => c.email).length;
  console.log(`[contacts] wrote ${OUT}: ${Object.keys(sorted).length} suppliers · ${phones} phones · ${emails} emails`);
  process.exit(0);
}

main();
