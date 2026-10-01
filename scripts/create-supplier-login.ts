/**
 * Create (or reset) the login for a supplier and link it to that supplier's
 * profile, so the supplier can sign in and manage photos, products and RFQs
 * from /supplier-dashboard.
 *
 *   npm run supplier:login -- --supplier al-gharbia-pipe-company-llc-ae \
 *     --email sales@algharbiapipe.com [--password '...'] [--name 'Sales team'] [--force]
 *
 * Without --password a strong one is generated and printed once. Run it with
 * the production DATABASE_URL to create the account on the live site.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { getPackSupplier } from "../src/data/pack-catalog";
import { validatePassword } from "../src/lib/validation/signup";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${body.slice(0, 7)}-${body.slice(7)}-7`;
}

async function ensureSupplierRow(supplierId: string) {
  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
  const pack = getPackSupplier(supplierId);
  if (!existing && !pack) throw new Error(`No supplier with id "${supplierId}" in the database or curated catalogue.`);

  // Seed the owner-managed fields from the curated profile so claiming changes
  // nothing visible until the supplier edits it.
  const curated = pack
    ? {
        logoUrl: pack.logoUrl ?? null,
        imageUrl: pack.imageUrl ?? null,
        images: JSON.stringify(pack.supplierImages ?? []),
        description: pack.description ?? null,
      }
    : {};

  if (existing) {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: existing.claimedByUserId ? {} : curated,
    });
  }

  const p = pack!;
  return prisma.supplier.create({
    data: {
      id: p.id,
      name: p.name,
      industry: p.industry ?? "Industrial",
      category: p.category ?? null,
      location: p.location ?? [p.city, p.country].filter(Boolean).join(", "),
      country: p.country ?? null,
      city: p.city ?? null,
      website: p.website ?? null,
      products: JSON.stringify(p.products ?? []),
      deliveryRegions: JSON.stringify(p.deliveryRegions ?? []),
      moq: p.moq ?? "Contact supplier",
      verified: Boolean(p.verified),
      verificationStatus: "verified",
      sourceUrl: p.sourceUrl ?? null,
      score: p.score ?? null,
      reliabilityScore: p.reliabilityScore ?? 70,
      ...curated,
    },
  });
}

async function main() {
  const supplierId = arg("supplier")?.trim().toLowerCase();
  const email = arg("email")?.trim().toLowerCase();
  if (!supplierId || !email) {
    console.error("Usage: npm run supplier:login -- --supplier <supplier-id> --email <login email> [--password <pw>]");
    process.exit(1);
  }
  const password = arg("password") ?? generatePassword();
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(`Password rejected (${passwordError}): use 8+ characters with a letter and a number.`);

  const supplier = await ensureSupplierRow(supplierId);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: arg("name") ?? supplier.name,
      company: supplier.name,
      role: "supplier",
      passwordHash: await hash(password, 12),
      onboardedAt: new Date(),
    },
    update: {
      role: "supplier",
      company: supplier.name,
      passwordHash: await hash(password, 12),
    },
  });

  if (supplier.claimedByUserId && supplier.claimedByUserId !== user.id && !process.argv.includes("--force")) {
    throw new Error(`"${supplier.name}" is already linked to another account. Re-run with --force to move it.`);
  }

  // A supplier account manages exactly one profile.
  await prisma.supplier.updateMany({
    where: { claimedByUserId: user.id, NOT: { id: supplier.id } },
    data: { claimedByUserId: null },
  });
  await prisma.supplier.update({
    where: { id: supplier.id },
    data: {
      claimedByUserId: user.id,
      claimedAt: supplier.claimedAt ?? new Date(),
      marketplaceStatus: supplier.marketplaceStatus === "VERIFIED" ? "VERIFIED" : "CLAIMED",
    },
  });

  console.log(`\nSupplier login ready for ${supplier.name}`);
  console.log(`  Sign in at: /login?role=supplier`);
  console.log(`  Email:      ${email}`);
  console.log(`  Password:   ${password}${arg("password") ? "" : "   (generated — store it now, it is not saved anywhere)"}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
