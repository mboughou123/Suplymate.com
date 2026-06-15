// Admin import: loads suppliers into the Suplymate database.
//
//   npx tsx scripts/import-suppliers.ts --source=sample        # generated 100+ dataset
//   npx tsx scripts/import-suppliers.ts --source=outscraper    # from fetched cache
//   add --reset to clear existing suppliers first
//
// Re-runnable: upserts by id so refreshing the database is safe.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { verifiedSuppliers } from "../src/data/verified-suppliers";
import { normalizeCache } from "./outscraper/normalize";

const prisma = new PrismaClient();
const CACHE_FILE = join(process.cwd(), "scripts", "outscraper", "cache", "raw.json");

type ImportRecord = {
  id: string;
  name: string;
  industry: string;
  category?: string | null;
  location: string;
  country?: string | null;
  city?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  googleRating?: number | null;
  googleReviews?: number | null;
  description?: string | null;
  products: string[];
  deliveryRegions: string[];
  moq: string;
  verified?: boolean | null;
  address?: string | null;
  openingHours?: string | null;
  sourceUrl?: string | null;
  score?: number | null;
  reliabilityScore: number;
};

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
}

function loadRecords(source: string): ImportRecord[] {
  if (source === "outscraper") {
    if (!existsSync(CACHE_FILE)) {
      console.error(
        `No cache found at ${CACHE_FILE}.\n` +
          "Run the fetch step first:\n" +
          "  OUTSCRAPER_API_KEY=xxx npx tsx scripts/outscraper/fetch.ts"
      );
      process.exit(1);
    }
    const entries = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    const { records, stats } = normalizeCache(entries);
    console.log(
      `Normalized Outscraper cache: ${records.length} kept ` +
        `(found ${stats.found}, rejected ${stats.rejected}, deduped ${stats.deduped})`
    );
    return records;
  }
  // Default: generated verified directory (100+ suppliers).
  return verifiedSuppliers as unknown as ImportRecord[];
}

function toData(r: ImportRecord) {
  return {
    name: r.name,
    industry: r.industry,
    category: r.category ?? null,
    location: r.location,
    country: r.country ?? null,
    city: r.city ?? null,
    website: r.website ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    googleRating: r.googleRating ?? null,
    googleReviews: r.googleReviews ?? null,
    description: r.description ?? null,
    products: JSON.stringify(r.products ?? []),
    deliveryRegions: JSON.stringify(r.deliveryRegions ?? []),
    moq: r.moq,
    verified: Boolean(r.verified),
    address: r.address ?? null,
    openingHours: r.openingHours ?? null,
    sourceUrl: r.sourceUrl ?? null,
    score: r.score ?? null,
    reliabilityScore: r.reliabilityScore,
  };
}

async function main() {
  const source = arg("source", "sample");
  const reset = process.argv.includes("--reset");

  const records = loadRecords(source);
  if (records.length === 0) {
    console.error("No records to import.");
    process.exit(1);
  }

  if (reset) {
    const del = await prisma.supplier.deleteMany();
    console.log(`Cleared ${del.count} existing suppliers.`);
  }

  let imported = 0;
  for (const r of records) {
    const data = toData(r);
    await prisma.supplier.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    });
    imported++;
  }

  // Summary
  const byCategory: Record<string, number> = {};
  let verified = 0;
  for (const r of records) {
    const cat = r.category ?? r.industry;
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    if (r.verified) verified++;
  }

  console.log(`\n✅ Imported ${imported} suppliers (source: ${source}).`);
  console.log(`   Verified: ${verified} · Countries: ${new Set(records.map((r) => r.country)).size}`);
  console.log("   By category:");
  for (const [cat, n] of Object.entries(byCategory).sort()) {
    console.log(`     - ${cat}: ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
