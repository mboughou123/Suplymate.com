// Load the curated media packs (generated `src/data/generated/pack-catalog.json`)
// into the database so the DB-backed site shows the same supplier photos,
// certificate scans and product photos as the no-DB fallback.
//
//   npm run catalog:build                # regenerate the catalogue first
//   npx tsx scripts/seed-pack-media.ts   # upsert everything (idempotent)
//   npx tsx scripts/seed-pack-media.ts --dry        # report only, write nothing
//   npx tsx scripts/seed-pack-media.ts --pending    # new rows land in the review queue
//   npx tsx scripts/seed-pack-media.ts --unpublished  # Media rows stay unpublished
//
// Writes (no schema changes):
//   Supplier        – upsert by id. New rows are complete directory rows. Rows that
//                     already exist only receive the pack MEDIA / curated fields
//                     (logo, cover, gallery, certificate images, certification
//                     details, description); admin moderation state, contact
//                     data and ratings are never touched. Distributors (Bossard)
//                     are forced to verified=false.
//   Certification   – upsert by the catalogue's deterministic cert id, status
//                     "claimed" (a scan on file is NOT a verification).
//   ScrapedProduct  – upsert by id, status "approved" (or "pending" with --pending).
//   Media           – one row per local /images/... asset (logo, cover, factory /
//                     gallery photos, product primary / gallery, certificate
//                     scans) — skipped when the same url already exists for the
//                     entity. Published by default (the assets are public files
//                     shipped with the app).
//
// Re-runnable: every write is an upsert or an existence-checked insert.

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const DRY = process.argv.includes("--dry");
const PENDING = process.argv.includes("--pending");
const UNPUBLISHED = process.argv.includes("--unpublished");

const ROOT = process.cwd();
const CATALOG_PATH = join(ROOT, "src/data/generated/pack-catalog.json");
const PUBLIC_DIR = join(ROOT, "public");

type CatCert = {
  id: string;
  supplierId: string;
  name: string;
  type: string | null;
  imageUrl: string;
  certificateUrl: string | null;
  sourceUrl: string | null;
  issuingOrg: string | null;
  notes: string | null;
  status: string;
};

type CatSupplier = {
  id: string;
  packSlug: string;
  pack: string;
  name: string;
  industry: string;
  category?: string;
  location: string;
  country?: string;
  city?: string;
  website?: string;
  logoUrl?: string;
  imageUrl?: string;
  supplierImages?: string[];
  description?: string;
  products: string[];
  deliveryRegions: string[];
  moq: string;
  verified?: boolean;
  businessType?: string;
  sourceUrl?: string;
  certificationsDetailed?: {
    name: string;
    type?: string | null;
    imageUrl?: string | null;
    certificateUrl?: string | null;
    sourceUrl?: string | null;
  }[];
  certificationImages?: string[];
  lastUpdated?: string;
  score?: number;
  reliabilityScore: number;
  overlaysExisting: boolean;
};

type CatProduct = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierLogo?: string | null;
  supplierCountry?: string | null;
  name: string;
  slug?: string | null;
  category: string;
  images: string[];
  videos: string[];
  basePrice: number | null;
  priceUnit: string | null;
  commissionRate: number | null;
  currency: string;
  moq: string | null;
  minimumOrderUnit: string | null;
  shippingTime: string | null;
  description: string | null;
  shortDescription: string | null;
  specifications: Record<string, string>;
  customizationOptions: string[];
  certifications: string[];
  rating: number | null;
  reviewCount: number | null;
  sourceUrl: string;
  productUrl: string | null;
  imageSourceUrl: string | null;
  sku: string | null;
  verifiedSupplier: boolean;
  status: string;
  scrapedAt: string;
};

type Catalog = {
  stats: Record<string, unknown>;
  suppliers: CatSupplier[];
  certifications: CatCert[];
  products: CatProduct[];
};

const stats = {
  suppliersCreated: 0,
  suppliersUpdated: 0,
  certsUpserted: 0,
  productsUpserted: 0,
  mediaCreated: 0,
  mediaSkipped: 0,
  missingFiles: 0,
};

function loadCatalog(): Catalog {
  if (!existsSync(CATALOG_PATH)) {
    throw new Error(
      `Catalogue not found at ${CATALOG_PATH}. Run \`node scripts/build-catalog-from-packs.mjs\` first.`
    );
  }
  return JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Catalog;
}

/** Only ship local assets that really exist in /public. */
function localAssetOk(url: string | null | undefined): url is string {
  if (!url || !url.startsWith("/images/")) return false;
  const ok = existsSync(join(PUBLIC_DIR, decodeURI(url)));
  if (!ok) stats.missingFiles += 1;
  return ok;
}

function mergeUnique(first: string[], second: string[]): string[] {
  return [...new Set([...first, ...second].filter(Boolean))];
}

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

/* ------------------------------------------------------------------ */
/* Suppliers                                                           */
/* ------------------------------------------------------------------ */

async function seedSupplier(s: CatSupplier) {
  const isDistributor = s.businessType === "Distributor";
  const images = (s.supplierImages ?? []).filter(localAssetOk);
  const certImages = (s.certificationImages ?? []).filter(localAssetOk);
  const logoUrl = localAssetOk(s.logoUrl) ? s.logoUrl : null;
  const imageUrl = localAssetOk(s.imageUrl) ? s.imageUrl : images[0] ?? null;

  const existing = await prisma.supplier.findUnique({ where: { id: s.id } });

  if (!existing) {
    if (DRY) {
      console.log(`  [dry] create supplier ${s.id} (${s.name}) — ${images.length} photos`);
      stats.suppliersCreated += 1;
      return;
    }
    await prisma.supplier.create({
      data: {
        id: s.id,
        name: s.name,
        industry: s.industry,
        category: s.category ?? null,
        location: s.location,
        country: s.country ?? null,
        city: s.city ?? null,
        website: s.website ?? null,
        logoUrl,
        imageUrl,
        description: s.description ?? null,
        products: JSON.stringify(s.products ?? []),
        deliveryRegions: JSON.stringify(s.deliveryRegions ?? []),
        moq: s.moq ?? "Not published — mill RFQ",
        verified: isDistributor ? false : Boolean(s.verified),
        sourceUrl: s.sourceUrl ?? null,
        score: s.score ?? null,
        reliabilityScore: s.reliabilityScore,
        // Import moderation state. "verified" here means "cleared for the
        // public directory" (the packs were QA'd by hand); the green mill badge
        // is the separate `verified` boolean above and marketplaceStatus
        // VERIFIED stays admin-only.
        verificationStatus: PENDING ? "pending" : "verified",
        images: JSON.stringify(images),
        certificationImages: JSON.stringify(certImages),
        certifications: JSON.stringify(s.certificationsDetailed ?? []),
      },
    });
    stats.suppliersCreated += 1;
    return;
  }

  // Existing row: media + curated copy only. Local pack photos lead; remote
  // (Google Places) photos already on the row follow.
  const mergedImages = mergeUnique(images, parseArr(existing.images));
  const mergedCertImages = mergeUnique(certImages, parseArr(existing.certificationImages));
  const existingCerts = parseArr(existing.certifications);
  const data = {
    logoUrl: logoUrl ?? existing.logoUrl,
    imageUrl: imageUrl ?? existing.imageUrl,
    images: JSON.stringify(mergedImages),
    certificationImages: JSON.stringify(mergedCertImages),
    certifications:
      (s.certificationsDetailed?.length ?? 0) > 0
        ? JSON.stringify(s.certificationsDetailed)
        : JSON.stringify(existingCerts),
    description: s.description ?? existing.description,
    website: existing.website ?? s.website ?? null,
    ...(isDistributor ? { verified: false } : {}),
  };
  if (DRY) {
    console.log(`  [dry] update supplier ${s.id} (${s.name}) — ${mergedImages.length} photos`);
    stats.suppliersUpdated += 1;
    return;
  }
  await prisma.supplier.update({ where: { id: s.id }, data });
  stats.suppliersUpdated += 1;
}

/* ------------------------------------------------------------------ */
/* Certifications                                                      */
/* ------------------------------------------------------------------ */

async function seedCertification(c: CatCert) {
  const imageUrl = localAssetOk(c.imageUrl) ? c.imageUrl : null;
  const data = {
    supplierId: c.supplierId,
    name: c.name,
    type: c.type ?? null,
    imageUrl,
    certificateUrl: c.certificateUrl ?? null,
    sourceUrl: c.sourceUrl ?? null,
    issuingOrg: c.issuingOrg ?? null,
    notes: c.notes ?? null,
  };
  if (DRY) {
    stats.certsUpserted += 1;
    return;
  }
  // Never downgrade an admin decision: status is only set on create.
  await prisma.certification.upsert({
    where: { id: c.id },
    create: { id: c.id, ...data, status: "claimed" },
    update: data,
  });
  stats.certsUpserted += 1;
}

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

async function seedProduct(p: CatProduct) {
  const images = p.images.filter(localAssetOk);
  const data = {
    supplierId: p.supplierId,
    supplierName: p.supplierName,
    supplierLogo: localAssetOk(p.supplierLogo) ? p.supplierLogo : null,
    supplierCountry: p.supplierCountry ?? null,
    name: p.name,
    slug: p.slug ?? null,
    category: p.category,
    images: JSON.stringify(images),
    videos: JSON.stringify(p.videos ?? []),
    basePrice: p.basePrice,
    priceUnit: p.priceUnit,
    commissionRate: p.commissionRate,
    currency: p.currency || "USD",
    moq: p.moq,
    minimumOrderUnit: p.minimumOrderUnit,
    shippingTime: p.shippingTime,
    description: p.description,
    shortDescription: p.shortDescription,
    specifications: JSON.stringify(p.specifications ?? {}),
    customizationOptions: JSON.stringify(p.customizationOptions ?? []),
    certifications: JSON.stringify(p.certifications ?? []),
    rating: p.rating,
    reviewCount: p.reviewCount,
    sourceUrl: p.sourceUrl,
    productUrl: p.productUrl,
    imageSourceUrl: p.imageSourceUrl,
    sku: p.sku,
    verifiedSupplier: Boolean(p.verifiedSupplier),
    scrapedAt: new Date(p.scrapedAt),
  };
  if (DRY) {
    stats.productsUpserted += 1;
    return;
  }
  const status = PENDING ? "pending" : p.status || "approved";
  const existing = await prisma.scrapedProduct.findUnique({
    where: { id: p.id },
    select: { status: true },
  });
  await prisma.scrapedProduct.upsert({
    where: { id: p.id },
    create: { id: p.id, ...data, status },
    // Keep an admin's later moderation decision (e.g. rejected) on re-runs.
    update: existing?.status === "rejected" ? data : { ...data, status },
  });
  stats.productsUpserted += 1;
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

type NewMedia = {
  url: string;
  mediaType: string;
  entityType: string;
  entityId: string;
  altText: string;
  isPrimary: boolean;
  sortOrder: number;
};

async function insertMedia(items: NewMedia[]) {
  if (items.length === 0) return;
  const { entityType, entityId } = items[0];
  const existing = await prisma.media.findMany({
    where: { entityType, entityId },
    select: { url: true },
  });
  const have = new Set(existing.map((m) => m.url));
  const fresh = items.filter((m) => !have.has(m.url));
  stats.mediaSkipped += items.length - fresh.length;
  if (fresh.length === 0) return;
  if (DRY) {
    stats.mediaCreated += fresh.length;
    return;
  }
  await prisma.media.createMany({
    data: fresh.map((m) => ({
      ...m,
      originalUrl: m.url,
      mimeType: guessMime(m.url),
      status: UNPUBLISHED ? "unpublished" : "published",
      uploadedBy: "seed-pack-media",
    })),
  });
  stats.mediaCreated += fresh.length;
}

function guessMime(url: string): string {
  const ext = url.toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function seedSupplierMedia(s: CatSupplier) {
  const items: NewMedia[] = [];
  if (localAssetOk(s.logoUrl)) {
    items.push({
      url: s.logoUrl,
      mediaType: "SUPPLIER_LOGO",
      entityType: "SUPPLIER",
      entityId: s.id,
      altText: `${s.name} logo`,
      isPrimary: false,
      sortOrder: 0,
    });
  }
  const photos = (s.supplierImages ?? []).filter(localAssetOk);
  const cover = localAssetOk(s.imageUrl) ? s.imageUrl : photos[0];
  photos
    .filter((u) => u !== cover)
    .forEach((url, i) => {
      items.push({
        url,
        mediaType: i < 4 ? "SUPPLIER_FACTORY" : "SUPPLIER_GALLERY",
        entityType: "SUPPLIER",
        entityId: s.id,
        altText: `${s.name} — facility photo ${i + 2}`,
        isPrimary: false,
        sortOrder: i + 1,
      });
    });
  if (cover) {
    items.unshift({
      url: cover,
      mediaType: "SUPPLIER_COVER",
      entityType: "SUPPLIER",
      entityId: s.id,
      altText: `${s.name} — facility`,
      isPrimary: true,
      sortOrder: 0,
    });
  }
  await insertMedia(items);
}

async function seedProductMedia(p: CatProduct) {
  const images = p.images.filter(localAssetOk);
  await insertMedia(
    images.map((url, i) => ({
      url,
      mediaType: i === 0 ? "PRODUCT_PRIMARY" : "PRODUCT_GALLERY",
      entityType: "PRODUCT",
      entityId: p.id,
      altText: `${p.name} — ${p.supplierName}`,
      isPrimary: i === 0,
      sortOrder: i,
    }))
  );
}

async function seedCertMedia(c: CatCert, supplierName: string) {
  if (!localAssetOk(c.imageUrl)) return;
  await insertMedia([
    {
      url: c.imageUrl,
      mediaType: "CERTIFICATION",
      entityType: "CERTIFICATION",
      entityId: c.id,
      altText: `${c.name} — ${c.issuingOrg ?? supplierName}`,
      isPrimary: true,
      sortOrder: 0,
    },
  ]);
}

/* ------------------------------------------------------------------ */

async function main() {
  const catalog = loadCatalog();
  console.log(
    `Pack catalogue: ${catalog.suppliers.length} suppliers, ${catalog.certifications.length} certifications, ${catalog.products.length} products${DRY ? " (dry run)" : ""}`
  );

  const supplierName = new Map(catalog.suppliers.map((s) => [s.id, s.name]));

  console.log("→ suppliers");
  for (const s of catalog.suppliers) await seedSupplier(s);

  console.log("→ certifications");
  for (const c of catalog.certifications) {
    if (!supplierName.has(c.supplierId)) {
      // Cert for a supplier the pack does not define — only attach if the row exists.
      const row = await prisma.supplier.findUnique({ where: { id: c.supplierId }, select: { id: true } });
      if (!row) continue;
    }
    await seedCertification(c);
  }

  console.log("→ products");
  for (const p of catalog.products) await seedProduct(p);

  console.log("→ media");
  for (const s of catalog.suppliers) await seedSupplierMedia(s);
  for (const p of catalog.products) await seedProductMedia(p);
  for (const c of catalog.certifications) {
    await seedCertMedia(c, supplierName.get(c.supplierId) ?? c.supplierId);
  }

  console.log("\nDone.");
  console.table(stats);
  if (stats.missingFiles > 0) {
    console.warn(
      `${stats.missingFiles} referenced image path(s) were missing under /public and were skipped — rebuild the catalogue.`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
