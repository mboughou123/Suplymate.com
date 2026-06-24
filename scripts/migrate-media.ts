// Backfill the unified Media library from existing image fields WITHOUT deleting
// the originals (they remain as a fallback). Re-runnable / idempotent: an image
// already present for an entity (matched by url or originalUrl) is skipped.
//
//   npx tsx scripts/migrate-media.ts          # backfill everything
//   npx tsx scripts/migrate-media.ts --dry    # report only, write nothing
//
// Migrated rows are marked PUBLISHED where the source was already public
// (verified/visible suppliers, approved products, existing supplier cert
// images). Everything else is created UNPUBLISHED for admin review.
//
// Requires the Media table (run `npm run db:push` first).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

function parseArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v !== "string" || !v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p.map(String) : [];
  } catch {
    return [];
  }
}

function clean(urls: string[]): string[] {
  return [...new Set(urls.map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u)))];
}

const stats = { suppliers: 0, products: 0, certs: 0, created: 0, skipped: 0 };

async function existingKeys(entityType: string, entityId: string): Promise<Set<string>> {
  const rows = await prisma.media.findMany({
    where: { entityType, entityId },
    select: { url: true, originalUrl: true },
  });
  const set = new Set<string>();
  for (const r of rows) {
    if (r.url) set.add(r.url);
    if (r.originalUrl) set.add(r.originalUrl);
  }
  return set;
}

type NewMedia = {
  url: string;
  originalUrl: string;
  mediaType: string;
  entityType: string;
  entityId: string;
  isPrimary: boolean;
  sortOrder: number;
  status: string;
};

async function insert(items: NewMedia[]) {
  for (const m of items) {
    if (DRY) {
      stats.created++;
      continue;
    }
    await prisma.media.create({ data: { ...m, uploadedBy: "migration" } });
    stats.created++;
  }
}

async function migrateSuppliers() {
  const suppliers = await prisma.supplier.findMany();
  for (const s of suppliers) {
    const publiclyVisible = !["pending", "rejected", "needs_info"].includes(
      (s as { verificationStatus?: string }).verificationStatus ?? ""
    );
    const status = publiclyVisible ? "published" : "unpublished";
    const seen = await existingKeys("SUPPLIER", s.id);
    const batch: NewMedia[] = [];
    let order = 0;

    const add = (url: string, mediaType: string, isPrimary = false) => {
      const u = url.trim();
      if (!/^https?:\/\//i.test(u) || seen.has(u)) return;
      seen.add(u);
      batch.push({ url: u, originalUrl: u, mediaType, entityType: "SUPPLIER", entityId: s.id, isPrimary, sortOrder: order++, status });
    };

    if (s.logoUrl) add(s.logoUrl, "SUPPLIER_LOGO", true);
    if (s.imageUrl) add(s.imageUrl, "SUPPLIER_COVER", true);
    for (const u of clean(parseArr((s as { images?: unknown }).images))) add(u, "SUPPLIER_GALLERY");
    for (const u of clean(parseArr((s as { certificationImages?: unknown }).certificationImages))) {
      add(u, "CERTIFICATION");
    }

    if (batch.length) {
      await insert(batch);
      stats.suppliers++;
    } else {
      stats.skipped++;
    }
  }
}

async function migrateProducts() {
  const products = await prisma.scrapedProduct.findMany();
  for (const p of products) {
    const status = p.status === "approved" ? "published" : "unpublished";
    const seen = await existingKeys("PRODUCT", p.id);
    const imgs = clean(parseArr((p as { images?: unknown }).images));
    const batch: NewMedia[] = [];
    let order = 0;
    for (const u of imgs) {
      if (seen.has(u)) continue;
      seen.add(u);
      batch.push({
        url: u,
        originalUrl: (p as { imageSourceUrl?: string | null }).imageSourceUrl ?? u,
        mediaType: order === 0 ? "PRODUCT_PRIMARY" : "PRODUCT_GALLERY",
        entityType: "PRODUCT",
        entityId: p.id,
        isPrimary: order === 0,
        sortOrder: order,
        status,
      });
      order++;
    }
    if (batch.length) {
      await insert(batch);
      stats.products++;
    } else {
      stats.skipped++;
    }
  }
}

async function migrateCertifications() {
  let certs: { id: string; imageUrl: string | null; status?: string }[] = [];
  try {
    certs = (await prisma.certification.findMany()) as typeof certs;
  } catch {
    return; // table/columns not present
  }
  for (const c of certs) {
    if (!c.imageUrl || !/^https?:\/\//i.test(c.imageUrl)) continue;
    const seen = await existingKeys("CERTIFICATION", c.id);
    if (seen.has(c.imageUrl)) {
      stats.skipped++;
      continue;
    }
    const published = c.status === "verified" || c.status === "reviewed";
    await insert([
      {
        url: c.imageUrl,
        originalUrl: c.imageUrl,
        mediaType: "CERTIFICATION",
        entityType: "CERTIFICATION",
        entityId: c.id,
        isPrimary: true,
        sortOrder: 0,
        status: published ? "published" : "unpublished",
      },
    ]);
    stats.certs++;
  }
}

async function main() {
  console.log(`Media migration${DRY ? " (dry run)" : ""}…`);
  await migrateSuppliers();
  await migrateProducts();
  await migrateCertifications();
  console.log(
    `Done. Suppliers touched: ${stats.suppliers}, products: ${stats.products}, certs: ${stats.certs}. ` +
      `Media rows created: ${stats.created}. Entities skipped (no new images): ${stats.skipped}.`
  );
  console.log("Original logoUrl/imageUrl/images[] fields were NOT modified (kept as fallback).");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
