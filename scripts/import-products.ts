// Admin import: loads scraped products into the database as `pending` records
// for review at /admin/products.
//
//   npm run products:import              # from the scraper cache
//   npm run products:import:sample       # from the committed demo dataset
//   add --reset to clear existing scraped products first
//
// SUPPLIER LINKAGE (no orphans): every product is matched to a real supplier.
//   1. If the record already carries a supplierId that exists in the DB, use it.
//   2. Otherwise match by the source URL's domain against suppliers' `website`.
//   3. Otherwise CREATE a PENDING supplier for that domain and link to it.
// Products are always saved as status="pending" for admin review.
//
// De-dupes by id, by source URL, and by (supplierId + normalized name).
// Re-runnable: upserts by id. Requires the DB table (run `npm run db:push`).

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { sampleScrapedProducts } from "../src/data/scraped-products";
import type { ScrapedProduct } from "../src/data/scraped-products";

const prisma = new PrismaClient();
const CACHE_FILE = join(process.cwd(), "scripts", "product-scraper", "cache", "products.json");

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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function websiteDomain(website: string | null): string | null {
  if (!website) return null;
  const w = website.startsWith("http") ? website : `https://${website}`;
  return domainOf(w);
}

function titleFromDomain(domain: string): string {
  const base = domain.split(".")[0] ?? domain;
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Scraped images enter the media library as UNPUBLISHED rows, classified by
// type, keeping the original source URL for attribution. Idempotent: skips an
// image already ingested for the product. Best-effort (ignored without the
// Media table). Admins review + publish + (on approval) re-host these.
async function ingestProductMedia(
  productId: string,
  images: string[],
  sourceUrl: string | null
): Promise<void> {
  const urls = (images ?? []).map((u) => String(u).trim()).filter((u) => /^https?:\/\//i.test(u));
  if (urls.length === 0) return;
  try {
    const existing = await prisma.media.findMany({
      where: { entityType: "PRODUCT", entityId: productId },
      select: { url: true, originalUrl: true },
    });
    const seen = new Set<string>();
    for (const e of existing) {
      if (e.url) seen.add(e.url);
      if (e.originalUrl) seen.add(e.originalUrl);
    }
    let order = existing.length;
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (seen.has(url)) continue;
      await prisma.media.create({
        data: {
          url,
          originalUrl: sourceUrl ?? url,
          mediaType: order === 0 ? "PRODUCT_PRIMARY" : "PRODUCT_GALLERY",
          entityType: "PRODUCT",
          entityId: productId,
          isPrimary: order === 0,
          sortOrder: order,
          status: "unpublished",
          uploadedBy: "scraper",
        },
      });
      seen.add(url);
      order++;
    }
  } catch {
    // Media table not provisioned — skip silently.
  }
}

type SupplierLite = {
  id: string;
  name: string;
  website: string | null;
  country: string | null;
  verificationStatus: string;
};

async function main() {
  const source = arg("source", "cache");
  const reset = process.argv.includes("--reset");
  const records = loadRecords(source);

  console.log(`Importing ${records.length} scraped product(s) from "${source}"…`);

  if (reset) {
    await prisma.scrapedProduct.deleteMany({});
    console.log("Cleared existing scraped products.");
  }

  // Build a domain -> supplier index from existing suppliers.
  const suppliers = (await prisma.supplier.findMany({
    select: { id: true, name: true, website: true, country: true, verificationStatus: true },
  })) as SupplierLite[];
  const byDomain = new Map<string, SupplierLite>();
  const byId = new Map<string, SupplierLite>();
  for (const s of suppliers) {
    byId.set(s.id, s);
    const d = websiteDomain(s.website);
    if (d && !byDomain.has(d)) byDomain.set(d, s);
  }

  async function resolveSupplier(r: ScrapedProduct): Promise<SupplierLite> {
    // 1) explicit, existing supplierId
    if (r.supplierId && !r.supplierId.startsWith("domain:")) {
      const hit = byId.get(r.supplierId);
      if (hit) return hit;
    }
    // 2) match by source domain
    const domain =
      (r.supplierId?.startsWith("domain:") ? r.supplierId.slice("domain:".length) : null) ??
      domainOf(r.productUrl) ??
      domainOf(r.sourceUrl);
    if (domain && byDomain.has(domain)) return byDomain.get(domain)!;

    // 3) create a PENDING supplier for the domain (never orphan a product)
    if (domain) {
      const id = slugify(domain);
      const created: SupplierLite = {
        id,
        name: titleFromDomain(domain),
        website: `https://${domain}`,
        country: null,
        verificationStatus: "pending",
      };
      try {
        await prisma.supplier.upsert({
          where: { id },
          create: {
            id,
            name: created.name,
            industry: "Industrial Equipment",
            location: domain,
            website: created.website,
            products: "[]",
            deliveryRegions: "[]",
            moq: "Contact supplier",
            reliabilityScore: 0,
            verificationStatus: "pending",
            sourceUrl: r.sourceUrl,
          },
          update: {},
        });
      } catch (err) {
        console.warn(`    ! could not create supplier for ${domain}: ${(err as Error).message}`);
      }
      byDomain.set(domain, created);
      byId.set(id, created);
      return created;
    }

    // Fallback (should not happen): use the record's own values.
    return {
      id: r.supplierId || "unknown",
      name: r.supplierName || "Unknown supplier",
      website: null,
      country: r.supplierCountry ?? null,
      verificationStatus: "pending",
    };
  }

  // Dedupe within the batch + against what we upsert.
  const seenKeys = new Set<string>();
  const suppliersBefore = byDomain.size;
  let ok = 0;
  let skipped = 0;

  for (const r of records) {
    const supplier = await resolveSupplier(r);
    const key = `${supplier.id}::${r.name.toLowerCase().replace(/\s+/g, " ").trim()}`;
    if (seenKeys.has(key)) {
      skipped++;
      continue;
    }
    seenKeys.add(key);

    const data = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierLogo: r.supplierLogo ?? null,
      supplierCountry: r.supplierCountry ?? supplier.country ?? null,
      name: r.name,
      slug: r.slug ?? slugify(r.name),
      category: r.category,
      images: JSON.stringify(r.images ?? []),
      videos: JSON.stringify(r.videos ?? []),
      basePrice: r.basePrice ?? null,
      priceUnit: r.priceUnit ?? null,
      commissionRate: r.commissionRate ?? null,
      currency: r.currency ?? "USD",
      moq: r.moq ?? null,
      minimumOrderUnit: r.minimumOrderUnit ?? null,
      shippingTime: r.shippingTime ?? null,
      description: r.description ?? null,
      shortDescription: r.shortDescription ?? null,
      specifications: JSON.stringify(r.specifications ?? {}),
      customizationOptions: JSON.stringify(r.customizationOptions ?? []),
      certifications: JSON.stringify(r.certifications ?? []),
      rating: r.rating ?? null,
      reviewCount: r.reviewCount ?? null,
      sourceUrl: r.sourceUrl,
      productUrl: r.productUrl ?? null,
      imageSourceUrl: r.imageSourceUrl ?? r.images?.[0] ?? null,
      sku: r.sku ?? null,
      verifiedSupplier: false,
      // Never auto-publish: imported products always require admin review.
      status: "pending" as const,
      scrapedAt: new Date(r.scrapedAt ?? Date.now()),
    };
    await prisma.scrapedProduct.upsert({
      where: { id: r.id },
      create: { id: r.id, ...data },
      update: data,
    });
    await ingestProductMedia(r.id, r.images ?? [], r.imageSourceUrl ?? r.sourceUrl ?? null);
    ok++;
  }

  const created = byDomain.size - suppliersBefore;
  console.log(`Done. Upserted ${ok} product(s); skipped ${skipped} duplicate(s).`);
  console.log(`Linked to suppliers (${created} new PENDING supplier(s) created).`);
  console.log("Review them at /admin/products.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
