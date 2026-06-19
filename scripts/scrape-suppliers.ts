// Public supplier-website scraper CLI.
//
//   npm run suppliers:scrape -- --url=https://example-supplier.com
//   npm run suppliers:scrape -- --file=scripts/import/examples/scrape-urls.txt
//   add --dry-run to scrape + preview without writing
//
// COMPLIANCE: see src/lib/scraper — respects robots.txt + Crawl-delay, refuses
// social networks (LinkedIn/X) and private/auth/transactional pages, rate-limits
// every request, and never bypasses captcha/anti-bot. Results are saved as
// PENDING suppliers for manual review at /admin/import-suppliers.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { scrapeSupplierWebsites } from "../src/lib/scraper";
import { scrapedToSupplierInput } from "../src/lib/scraper/toSupplierInput";
import {
  normalizeSupplierInput,
  websiteKey,
  phoneKey,
  normKey,
  type AdminSupplier,
} from "../src/lib/supplier-normalize";

const prisma = new PrismaClient();
const CACHE_DIR = join(process.cwd(), "scripts", "import", "cache");
const PENDING_CACHE = join(CACHE_DIR, "pending-suppliers.json");

function args(name: string): string[] {
  return process.argv
    .filter((a) => a.startsWith(`--${name}=`))
    .map((a) => a.split("=").slice(1).join("="));
}

function toData(s: AdminSupplier) {
  return {
    name: s.name,
    industry: s.industry,
    category: s.category,
    location: s.location,
    country: s.country,
    city: s.city,
    address: s.address,
    website: s.website,
    phone: s.phone,
    email: s.email,
    description: s.description,
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    images: JSON.stringify(s.images),
    certificationImages: JSON.stringify(s.certificationImages),
    certifications: JSON.stringify(s.certifications),
    products: JSON.stringify(s.products),
    deliveryRegions: JSON.stringify(s.deliveryRegions),
    moq: s.moq,
    verified: s.verified,
    verificationStatus: s.verificationStatus,
    trustScore: s.trustScore,
    googleRating: s.rating,
    googleReviews: s.reviewCount,
    sourceUrl: s.sourceUrl,
    reliabilityScore: s.reliabilityScore,
    score: s.score,
  };
}

function appendCache(records: AdminSupplier[]): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  let existing: AdminSupplier[] = [];
  if (existsSync(PENDING_CACHE)) {
    try {
      existing = JSON.parse(readFileSync(PENDING_CACHE, "utf8"));
    } catch {
      existing = [];
    }
  }
  const byId = new Map(existing.map((s) => [s.id, s]));
  for (const r of records) byId.set(r.id, r);
  writeFileSync(PENDING_CACHE, JSON.stringify([...byId.values()], null, 2) + "\n");
}

async function existingKeys() {
  const keys = {
    ids: new Set<string>(),
    sites: new Set<string>(),
    phones: new Set<string>(),
    names: new Set<string>(),
  };
  try {
    const rows = await prisma.supplier.findMany({
      select: { id: true, website: true, phone: true, name: true },
    });
    for (const r of rows) {
      keys.ids.add(r.id);
      const site = websiteKey(r.website);
      if (site) keys.sites.add(site);
      const phone = phoneKey(r.phone);
      if (phone) keys.phones.add(phone);
      const name = normKey(r.name);
      if (name) keys.names.add(name);
    }
  } catch {
    // DB unavailable — dedupe within batch only
  }
  return keys;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const urls = [...args("url")];
  for (const f of args("file")) {
    const abs = join(process.cwd(), f);
    if (existsSync(abs)) {
      urls.push(
        ...readFileSync(abs, "utf8")
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#"))
      );
    }
  }

  if (urls.length === 0) {
    console.error(
      "Usage: tsx scripts/scrape-suppliers.ts --url=https://site.com [--url=…] [--file=urls.txt] [--dry-run]"
    );
    process.exit(1);
  }

  console.log(`\nScraping ${urls.length} supplier website(s) (compliant: robots.txt + rate-limited)…\n`);
  const results = await scrapeSupplierWebsites(urls);

  const keys = await existingKeys();
  const toSave: AdminSupplier[] = [];
  for (const r of results) {
    if (!r.ok) {
      console.warn(`  ⨯ ${r.sourceUrl}: ${r.blockedReason}`);
      continue;
    }
    const supplier = normalizeSupplierInput(scrapedToSupplierInput(r));
    console.log(
      `  ✓ ${supplier.name ?? r.sourceUrl} — ${r.products.length} product(s), ` +
        `${r.certifications.length} cert(s), ${r.images.length} image(s), trust ${supplier.trustScore}/100`
    );
    for (const w of r.warnings) console.log(`      · note [${w.stage}]: ${w.message}`);

    const site = websiteKey(supplier.website);
    const name = normKey(supplier.name);
    if (keys.ids.has(supplier.id) || (site && keys.sites.has(site)) || (name && keys.names.has(name))) {
      console.warn(`      ↷ duplicate — skipping`);
      continue;
    }
    keys.ids.add(supplier.id);
    if (site) keys.sites.add(site);
    if (name) keys.names.add(name);
    toSave.push(supplier);
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would save ${toSave.length} pending supplier(s).`);
    return;
  }

  let saved = 0;
  const cacheFallback: AdminSupplier[] = [];
  for (const s of toSave) {
    try {
      const data = toData(s);
      await prisma.supplier.upsert({
        where: { id: s.id },
        create: { id: s.id, ...data },
        update: data,
      });
      saved++;
    } catch (err) {
      console.warn(`    ! DB unavailable for ${s.id}; caching.`, (err as Error).message);
      cacheFallback.push(s);
    }
  }
  if (cacheFallback.length) appendCache(cacheFallback);

  console.log(`\n✅ Saved ${saved} pending supplier(s). Review at /admin/import-suppliers`);
  if (cacheFallback.length) {
    console.log(`   ${cacheFallback.length} cached to ${PENDING_CACHE} (re-run after db:push).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
