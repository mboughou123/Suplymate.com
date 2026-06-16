// Supplier bundle JSON import — logos, banners, and product images in one file.
//
// Usage:
//   npm run import:bundle -- --file=scripts/import/examples/metalworks-china.json
//   npm run import:bundle -- --file=scripts/import/examples/          # all *.json in dir
//   add --approve to publish products to the public catalogue immediately
//   add --dry-run to preview without writing
//
// Bundle shape: see src/data/supplier-bundle.ts
//
// Hosting images under public/ (served at the site root):
//   public/logos/metalworks.png      → https://suplymate.com/logos/metalworks.png
//   public/banners/metalworks.jpg    → https://suplymate.com/banners/metalworks.jpg
//   public/products/steelbeam.jpg    → https://suplymate.com/products/steelbeam.jpg
//
// When the database is unavailable, records are merged into
// scripts/import/cache/ (suppliers.json + scraped-products.json) for later import.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, extname, basename } from "node:path";
import { PrismaClient } from "@prisma/client";
import { COMMISSION_RATE } from "../src/config/commerce";
import {
  parseSupplierBundle,
  slugifySupplierId,
  normalizeBundleImages,
  industryForCategory,
  defaultMoqForCategory,
  type SupplierBundle,
} from "../src/data/supplier-bundle";
import type { ScrapedProduct } from "../src/data/scraped-products";
import type { ProductCategory } from "../src/data/products";

const prisma = new PrismaClient();

const CACHE_DIR = join(process.cwd(), "scripts", "import", "cache");
const SUPPLIER_CACHE = join(CACHE_DIR, "suppliers.json");
const SCRAPED_CACHE = join(CACHE_DIR, "scraped-products.json");

type CachedSupplier = {
  id: string;
  name: string;
  industry: string;
  category: string | null;
  location: string;
  country: string | null;
  website: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  description: string | null;
  products: string[];
  deliveryRegions: string[];
  moq: string;
  verified: boolean;
  reliabilityScore: number;
};

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : undefined;
}

function slugifyProduct(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function resolveBundlePaths(fileArg: string): string[] {
  const abs = join(process.cwd(), fileArg);
  if (!existsSync(abs)) {
    console.error(`Path not found: ${abs}`);
    process.exit(1);
  }
  const stat = statSync(abs);
  if (stat.isDirectory()) {
    return readdirSync(abs)
      .filter((f) => extname(f).toLowerCase() === ".json")
      .map((f) => join(abs, f));
  }
  return [abs];
}

function regionFor(country: string | undefined): string[] {
  const c = (country ?? "").toLowerCase();
  if (/(usa|united states|mexico|canada)/.test(c)) return ["North America", "EU"];
  if (/(china|india|vietnam|korea|japan)/.test(c)) return ["Asia", "EU", "Africa"];
  if (/(uae|emirates|saudi|qatar)/.test(c)) return ["MENA", "Asia"];
  return ["EU", "MENA", "Global"];
}

function bundleToSupplier(bundle: SupplierBundle): CachedSupplier {
  const id = bundle.supplierId?.trim() || slugifySupplierId(bundle.supplierName);
  const category = bundle.category ?? bundle.products[0]?.category ?? "Industrial Parts";
  const moq = bundle.moq ?? defaultMoqForCategory(bundle.category);
  const productNames = bundle.products.map((p) => p.name);

  return {
    id,
    name: bundle.supplierName,
    industry: industryForCategory(bundle.category),
    category,
    location: bundle.country ?? "Global",
    country: bundle.country ?? null,
    website: bundle.website ?? null,
    logoUrl: bundle.logo ?? null,
    imageUrl: bundle.bannerImage ?? null,
    description: bundle.description ?? null,
    products: productNames,
    deliveryRegions: regionFor(bundle.country),
    moq,
    verified: true,
    reliabilityScore: 88,
  };
}

function productId(supplierId: string, name: string): string {
  return `bundle-${supplierId}-${slugifyProduct(name)}`;
}

function bundleToScrapedProducts(
  bundle: SupplierBundle,
  supplier: CachedSupplier,
  approve: boolean
): ScrapedProduct[] {
  const currency = bundle.currency ?? "USD";
  const defaultCategory = (bundle.category ?? "Industrial Parts") as ProductCategory;
  const defaultCommission = bundle.commissionRate ?? null;

  return bundle.products.map((p) => {
    const id = productId(supplier.id, p.name);
    const status = approve ? "approved" : (p.status ?? bundle.status ?? "pending");
    return {
      id,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierLogo: bundle.logo ?? null,
      name: p.name,
      category: (p.category ?? defaultCategory) as ProductCategory,
      images: normalizeBundleImages(p.image),
      videos: [],
      basePrice: p.price,
      commissionRate: p.commissionRate ?? defaultCommission ?? null,
      currency,
      moq: p.moq ?? bundle.moq ?? supplier.moq,
      shippingTime: null,
      description: p.description ?? null,
      specifications: p.specifications ?? {},
      customizationOptions: [],
      certifications: [],
      rating: null,
      reviewCount: null,
      sourceUrl: bundle.website ?? `bundle://${supplier.id}/${slugifyProduct(p.name)}`,
      verifiedSupplier: supplier.verified,
      status,
      scrapedAt: new Date().toISOString(),
    };
  });
}

function readJsonCache<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeJsonCache<T extends { id: string }>(path: string, rows: T[]): void {
  mkdirSync(join(path, ".."), { recursive: true });
  const byId = new Map<string, T>();
  for (const row of rows) byId.set(row.id, row);
  writeFileSync(path, JSON.stringify([...byId.values()], null, 2) + "\n");
}

function mergeCache<T extends { id: string }>(path: string, incoming: T[]): void {
  const existing = readJsonCache<T>(path);
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const row of incoming) byId.set(row.id, row);
  writeJsonCache(path, [...byId.values()]);
}

async function upsertSupplierDb(s: CachedSupplier, dryRun: boolean): Promise<boolean> {
  const data = {
    name: s.name,
    industry: s.industry,
    category: s.category,
    location: s.location,
    country: s.country,
    website: s.website,
    logoUrl: s.logoUrl,
    imageUrl: s.imageUrl,
    description: s.description,
    products: JSON.stringify(s.products),
    deliveryRegions: JSON.stringify(s.deliveryRegions),
    moq: s.moq,
    verified: s.verified,
    reliabilityScore: s.reliabilityScore,
  };

  if (dryRun) {
    console.log(`  [dry-run] supplier ${s.id} (${s.name})`);
    return true;
  }

  try {
    await prisma.supplier.upsert({
      where: { id: s.id },
      create: { id: s.id, ...data },
      update: data,
    });
    return true;
  } catch (err) {
    console.warn(`  DB unavailable for supplier ${s.id}; writing to cache.`, err);
    return false;
  }
}

async function upsertScrapedProductDb(sp: ScrapedProduct, dryRun: boolean): Promise<boolean> {
  const data = {
    supplierId: sp.supplierId,
    supplierName: sp.supplierName,
    supplierLogo: sp.supplierLogo ?? null,
    name: sp.name,
    category: sp.category,
    images: JSON.stringify(sp.images ?? []),
    videos: JSON.stringify(sp.videos ?? []),
    basePrice: sp.basePrice ?? null,
    commissionRate: sp.commissionRate ?? null,
    currency: sp.currency ?? "USD",
    moq: sp.moq ?? null,
    shippingTime: sp.shippingTime ?? null,
    description: sp.description ?? null,
    specifications: JSON.stringify(sp.specifications ?? {}),
    customizationOptions: JSON.stringify(sp.customizationOptions ?? []),
    certifications: JSON.stringify(sp.certifications ?? []),
    rating: sp.rating ?? null,
    reviewCount: sp.reviewCount ?? null,
    sourceUrl: sp.sourceUrl,
    verifiedSupplier: sp.verifiedSupplier ?? false,
    status: sp.status ?? "pending",
    scrapedAt: new Date(sp.scrapedAt),
  };

  if (dryRun) {
    const rate = sp.commissionRate ?? COMMISSION_RATE;
    console.log(
      `  [dry-run] product ${sp.id}: base $${sp.basePrice} + ${(rate * 100).toFixed(0)}% commission → status ${sp.status}`
    );
    return true;
  }

  try {
    await prisma.scrapedProduct.upsert({
      where: { id: sp.id },
      create: { id: sp.id, ...data },
      update: data,
    });
    return true;
  } catch (err) {
    console.warn(`  DB unavailable for product ${sp.id}; writing to cache.`, err);
    return false;
  }
}

async function upsertCatalogProductDb(sp: ScrapedProduct, dryRun: boolean): Promise<void> {
  const base = sp.basePrice ?? 1;
  const data = {
    name: sp.name,
    category: sp.category,
    priceMin: base,
    priceMax: Math.round(base * 1.35 * 100) / 100,
    currency: sp.currency,
    bestDeliveryDays: 14,
    supplierCount: 1,
    unit: "unit",
  };

  if (dryRun) {
    console.log(`  [dry-run] catalogue product ${sp.id}`);
    return;
  }

  try {
    await prisma.product.upsert({
      where: { id: sp.id },
      create: { id: sp.id, ...data },
      update: data,
    });
  } catch (err) {
    console.warn(`  Could not upsert catalogue product ${sp.id}:`, err);
  }
}

async function importBundle(
  bundle: SupplierBundle,
  opts: { approve: boolean; dryRun: boolean }
): Promise<{ supplierOk: boolean; productsOk: number; cached: boolean }> {
  const supplier = bundleToSupplier(bundle);
  const scraped = bundleToScrapedProducts(bundle, supplier, opts.approve);

  console.log(`\n📦 ${supplier.name} (${supplier.id}) — ${scraped.length} product(s)`);
  if (supplier.logoUrl) console.log(`   logo: ${supplier.logoUrl}`);
  if (supplier.imageUrl) console.log(`   banner: ${supplier.imageUrl}`);

  const supplierDbOk = await upsertSupplierDb(supplier, opts.dryRun);
  let productsDbOk = 0;
  let anyProductFail = false;

  for (const sp of scraped) {
    const ok = await upsertScrapedProductDb(sp, opts.dryRun);
    if (ok) {
      productsDbOk++;
      if (opts.approve && sp.status === "approved") {
        await upsertCatalogProductDb(sp, opts.dryRun);
      }
    } else {
      anyProductFail = true;
    }
  }

  const cached = !opts.dryRun && (!supplierDbOk || anyProductFail);
  if (cached) {
    mergeCache(SUPPLIER_CACHE, [supplier]);
    mergeCache(SCRAPED_CACHE, scraped);
    console.log(`   ↳ merged into ${basename(CACHE_DIR)}/ cache`);
  }

  return { supplierOk: supplierDbOk, productsOk: productsDbOk, cached };
}

async function main() {
  const fileArg = arg("file");
  if (!fileArg) {
    console.error(
      "Usage: tsx scripts/import-supplier-bundle.ts --file=path/to/bundle.json [--approve] [--dry-run]"
    );
    process.exit(1);
  }

  const approve = process.argv.includes("--approve");
  const dryRun = process.argv.includes("--dry-run");
  const paths = resolveBundlePaths(fileArg);

  if (paths.length === 0) {
    console.error("No JSON bundle files found.");
    process.exit(1);
  }

  console.log(
    `Importing ${paths.length} bundle file(s)${approve ? " (approve → public catalogue)" : ""}${dryRun ? " [DRY RUN]" : ""}…`
  );

  let bundles = 0;
  let suppliers = 0;
  let products = 0;
  let cachedRuns = 0;

  for (const path of paths) {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      console.error(`Skipping ${path}: invalid JSON`, err);
      continue;
    }

    let bundle: SupplierBundle;
    try {
      bundle = parseSupplierBundle(raw);
    } catch (err) {
      console.error(`Skipping ${path}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    bundles++;
    const result = await importBundle(bundle, { approve, dryRun });
    if (result.supplierOk) suppliers++;
    products += result.productsOk;
    if (result.cached) cachedRuns++;
  }

  console.log(
    `\n✅ Done. ${bundles} bundle(s), ${suppliers} supplier(s), ${products} product(s) processed.`
  );
  if (cachedRuns > 0 && !dryRun) {
    console.log(
      `   ${cachedRuns} bundle(s) also written to cache (re-run after db:push when DB is available).`
    );
  }
  if (!approve) {
    console.log("   Pending products: review at /admin/products (or re-run with --approve).");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
