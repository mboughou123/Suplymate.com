// Reads the fetched Outscraper cache, cleans + ranks it, and writes a committed
// TypeScript dataset (src/data/outscraper-suppliers.ts) that the site serves.
// This lets the REAL public supplier data go live without DB access.
//
//   npx tsx scripts/outscraper/build-dataset.ts

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { normalizeCache, type SupplierRecord } from "./normalize";

const CACHE_FILE = join(process.cwd(), "scripts", "outscraper", "cache", "raw.json");
const OUT_FILE = join(process.cwd(), "src", "data", "outscraper-suppliers.ts");
const TODAY = new Date().toISOString().slice(0, 10);

const u = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

function toSupplier(r: SupplierRecord) {
  // Use undefined (not null) so JSON.stringify omits empty fields and the
  // output matches the optional Supplier type.
  return {
    id: r.id,
    name: r.name,
    industry: r.industry,
    category: u(r.category),
    location: r.location,
    country: u(r.country),
    city: u(r.city),
    website: u(r.website),
    phone: u(r.phone),
    email: u(r.email),
    imageUrl: u(r.imageUrl),
    logoUrl: u(r.logoUrl),
    supplierImages: r.images && r.images.length > 0 ? r.images : undefined,
    googleRating: u(r.googleRating),
    googleReviews: u(r.googleReviews),
    rating: u(r.googleRating),
    reviewCount: u(r.googleReviews),
    verified: r.verified,
    description: u(r.description),
    products: r.products,
    deliveryRegions: r.deliveryRegions,
    moq: r.moq,
    address: u(r.address),
    openingHours: u(r.openingHours),
    sourceUrl: u(r.sourceUrl),
    score: r.score,
    reliabilityScore: r.reliabilityScore,
    lastUpdated: TODAY,
  };
}

function main() {
  if (!existsSync(CACHE_FILE)) {
    console.error(`No cache at ${CACHE_FILE}. Run: npm run suppliers:fetch`);
    process.exit(1);
  }
  const entries = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  const raw = normalizeCache(entries);
  const stats = raw.stats;
  // Require a usable country so filters/flags stay clean.
  const records = raw.records.filter((r) => r.country && r.location !== "—");

  const byCategory: Record<string, number> = {};
  let verified = 0;
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    if (r.verified) verified++;
  }

  const suppliers = records.map(toSupplier);
  const header =
    "// AUTO-GENERATED from public Outscraper (Google Maps) data.\n" +
    "// Regenerate: npm run suppliers:fetch && npx tsx scripts/outscraper/build-dataset.ts\n" +
    `// Generated ${TODAY} · ${suppliers.length} suppliers\n` +
    'import type { Supplier } from "./suppliers";\n\n' +
    "export const outscraperSuppliers: Supplier[] =\n" +
    JSON.stringify(suppliers, null, 2) +
    " as Supplier[];\n";

  writeFileSync(OUT_FILE, header);

  console.log(
    `Normalized: found ${stats.found}, rejected ${stats.rejected}, ` +
      `deduped ${stats.deduped} → ${records.length} kept`
  );
  console.log(`Verified: ${verified} · Countries: ${new Set(records.map((r) => r.country)).size}`);
  console.log("By category:");
  for (const [c, n] of Object.entries(byCategory).sort()) console.log(`  - ${c}: ${n}`);
  console.log(`\nWrote ${OUT_FILE}`);
}

main();
