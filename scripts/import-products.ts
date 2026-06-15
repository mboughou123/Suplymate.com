// Admin import: loads scraped products into the Suplymate database as `pending`
// records for review at /admin/products.
//
//   npm run products:import              # from the scraper cache
//   npm run products:import:sample       # from the committed demo dataset
//   add --reset to clear existing scraped products first
//
// Re-runnable: upserts by id so re-importing is safe. Requires the DB table
// (run `npm run db:push` once to create it).

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { sampleScrapedProducts } from "../src/data/scraped-products";
import type { ScrapedProduct } from "../src/data/scraped-products";

const prisma = new PrismaClient();
const CACHE_FILE = join(
  process.cwd(),
  "scripts",
  "product-scraper",
  "cache",
  "products.json"
);

function arg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
}

function loadRecords(source: string): ScrapedProduct[] {
  if (source === "sample") return sampleScrapedProducts;
  if (!existsSync(CACHE_FILE)) {
    console.error(`No scraper cache at ${CACHE_FILE}. Run: npm run products:scrape`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as ScrapedProduct[];
}

async function main() {
  const source = arg("source", "cache");
  const reset = process.argv.includes("--reset");
  const records = loadRecords(source);

  console.log(`Importing ${records.length} scraped product(s) from "${source}"…`);

  if (reset) {
    await prisma.scrapedProduct.deleteMany({});
    console.log("Cleared existing scraped products.");
  }

  let ok = 0;
  for (const r of records) {
    const data = {
      supplierId: r.supplierId,
      supplierName: r.supplierName,
      supplierLogo: r.supplierLogo ?? null,
      name: r.name,
      category: r.category,
      images: JSON.stringify(r.images ?? []),
      videos: JSON.stringify(r.videos ?? []),
      basePrice: r.basePrice ?? null,
      commissionRate: r.commissionRate ?? null,
      currency: r.currency ?? "USD",
      moq: r.moq ?? null,
      shippingTime: r.shippingTime ?? null,
      description: r.description ?? null,
      specifications: JSON.stringify(r.specifications ?? {}),
      customizationOptions: JSON.stringify(r.customizationOptions ?? []),
      certifications: JSON.stringify(r.certifications ?? []),
      rating: r.rating ?? null,
      reviewCount: r.reviewCount ?? null,
      sourceUrl: r.sourceUrl,
      verifiedSupplier: r.verifiedSupplier ?? false,
      status: r.status ?? "pending",
      scrapedAt: new Date(r.scrapedAt ?? Date.now()),
    };
    await prisma.scrapedProduct.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    });
    ok++;
  }

  console.log(`Done. Upserted ${ok} record(s). Review them at /admin/products.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
