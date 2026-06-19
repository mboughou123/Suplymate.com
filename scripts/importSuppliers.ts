// CSV supplier importer.
//
//   npm run suppliers:import:csv -- --file=scripts/import/examples/suppliers-sample.csv
//   add --dry-run to validate + preview without writing
//   add --no-skip-duplicates to import even when a duplicate is detected
//
// Behaviour:
//   - Reads + validates the CSV (required: name; valid website/email formats).
//   - Saves every valid row as a PENDING supplier (never auto-verified).
//   - Dedupes by id / website host / email / phone / name against the DB AND
//     within the file itself.
//   - Writes a clean error log (invalid rows) to scripts/import/logs/.
//   - Falls back to a JSON cache when the DB is unavailable (re-import later).
//
// All imported records are reviewable in the admin UI at /admin/import-suppliers.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { PrismaClient } from "@prisma/client";
import { importSuppliersFromCsv } from "../src/lib/supplier-csv";
import {
  normalizeSupplierInput,
  websiteKey,
  phoneKey,
  normKey,
  type AdminSupplier,
} from "../src/lib/supplier-normalize";

const prisma = new PrismaClient();

const LOG_DIR = join(process.cwd(), "scripts", "import", "logs");
const CACHE_DIR = join(process.cwd(), "scripts", "import", "cache");
const PENDING_CACHE = join(CACHE_DIR, "pending-suppliers.json");

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : undefined;
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

type ExistingKeys = {
  ids: Set<string>;
  sites: Set<string>;
  emails: Set<string>;
  phones: Set<string>;
  names: Set<string>;
};

async function loadExistingKeys(): Promise<ExistingKeys | null> {
  try {
    const rows = await prisma.supplier.findMany({
      select: { id: true, website: true, email: true, phone: true, name: true },
    });
    const keys: ExistingKeys = {
      ids: new Set(),
      sites: new Set(),
      emails: new Set(),
      phones: new Set(),
      names: new Set(),
    };
    for (const r of rows) {
      keys.ids.add(r.id);
      const site = websiteKey(r.website);
      if (site) keys.sites.add(site);
      const email = normKey(r.email);
      if (email) keys.emails.add(email);
      const phone = phoneKey(r.phone);
      if (phone) keys.phones.add(phone);
      const name = normKey(r.name);
      if (name) keys.names.add(name);
    }
    return keys;
  } catch {
    return null; // DB unavailable — dedupe within file only
  }
}

function duplicateReason(s: AdminSupplier, keys: ExistingKeys): string | null {
  if (keys.ids.has(s.id)) return "id";
  const site = websiteKey(s.website);
  if (site && keys.sites.has(site)) return "website";
  const email = normKey(s.email);
  if (email && keys.emails.has(email)) return "email";
  const phone = phoneKey(s.phone);
  if (phone && keys.phones.has(phone)) return "phone";
  const name = normKey(s.name);
  if (name && keys.names.has(name)) return "name";
  return null;
}

function indexKeys(s: AdminSupplier, keys: ExistingKeys): void {
  keys.ids.add(s.id);
  const site = websiteKey(s.website);
  if (site) keys.sites.add(site);
  const email = normKey(s.email);
  if (email) keys.emails.add(email);
  const phone = phoneKey(s.phone);
  if (phone) keys.phones.add(phone);
  const name = normKey(s.name);
  if (name) keys.names.add(name);
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

async function main() {
  const file = arg("file");
  if (!file) {
    console.error(
      "Usage: tsx scripts/importSuppliers.ts --file=path/to/suppliers.csv [--dry-run] [--no-skip-duplicates]"
    );
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const skipDuplicates = !process.argv.includes("--no-skip-duplicates");

  const abs = join(process.cwd(), file);
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  const text = readFileSync(abs, "utf8");
  const { headers, recognized, valid, errors, warnings } = importSuppliersFromCsv(text);

  console.log(`\nCSV: ${file}`);
  console.log(`  Columns: ${headers.length} (recognized: ${recognized.join(", ") || "none"})`);
  console.log(`  Valid rows: ${valid.length} · Invalid: ${errors.length} · Warnings: ${warnings.length}`);

  // Write a clean error log for invalid rows.
  if (errors.length || warnings.length) {
    mkdirSync(LOG_DIR, { recursive: true });
    const logPath = join(LOG_DIR, `${basename(file).replace(/\.[^.]+$/, "")}-errors.json`);
    writeFileSync(logPath, JSON.stringify({ errors, warnings }, null, 2) + "\n");
    console.log(`  ↳ error log: ${logPath}`);
    for (const e of errors.slice(0, 10)) {
      console.warn(`    ✗ line ${e.line}: ${e.message}`);
    }
    if (errors.length > 10) console.warn(`    … and ${errors.length - 10} more`);
  }

  if (valid.length === 0) {
    console.log("\nNothing to import.");
    return;
  }

  // Normalize + dedupe.
  const normalized = valid.map(normalizeSupplierInput);
  const keys = (await loadExistingKeys()) ?? {
    ids: new Set<string>(),
    sites: new Set<string>(),
    emails: new Set<string>(),
    phones: new Set<string>(),
    names: new Set<string>(),
  };

  const toImport: AdminSupplier[] = [];
  let skipped = 0;
  for (const s of normalized) {
    const reason = duplicateReason(s, keys);
    if (reason && skipDuplicates) {
      skipped++;
      console.warn(`    ↷ skip duplicate (${reason}): ${s.name} [${s.id}]`);
      continue;
    }
    indexKeys(s, keys);
    toImport.push(s);
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] Would import ${toImport.length} supplier(s), skip ${skipped} duplicate(s).`);
    for (const s of toImport.slice(0, 20)) {
      console.log(`    • ${s.name} — trust ${s.trustScore}/100 — ${s.verificationStatus}`);
    }
    return;
  }

  let imported = 0;
  const cacheFallback: AdminSupplier[] = [];
  for (const s of toImport) {
    const data = toData(s);
    try {
      await prisma.supplier.upsert({
        where: { id: s.id },
        create: { id: s.id, ...data },
        update: data,
      });
      imported++;
    } catch (err) {
      console.warn(`    ! DB unavailable for ${s.id}; caching.`, (err as Error).message);
      cacheFallback.push(s);
    }
  }

  if (cacheFallback.length) appendCache(cacheFallback);

  console.log(`\n✅ Imported ${imported} pending supplier(s); skipped ${skipped} duplicate(s).`);
  if (cacheFallback.length) {
    console.log(`   ${cacheFallback.length} cached to ${PENDING_CACHE} (re-run after db:push).`);
  }
  console.log("   Review them at /admin/import-suppliers");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
