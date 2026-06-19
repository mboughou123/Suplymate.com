// Read-only audit of supplier image coverage + ranking in the database.
//
//   set -a; . ./.env; set +a; npx tsx scripts/verify-supplier-images.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hasArr(v: string | null | undefined): boolean {
  if (!v) return false;
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) && a.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const total = await prisma.supplier.count();
  const rows = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      logoUrl: true,
      images: true,
      sourceUrl: true,
      score: true,
      verificationStatus: true,
    },
    orderBy: [{ score: "desc" }, { name: "asc" }],
  });

  let withImageUrl = 0;
  let withLogo = 0;
  let withImagesArr = 0;
  let withAnyPhoto = 0;
  let withSource = 0;
  let pending = 0;
  for (const r of rows) {
    const img = Boolean(r.imageUrl);
    const logo = Boolean(r.logoUrl);
    const arr = hasArr(r.images);
    if (img) withImageUrl++;
    if (logo) withLogo++;
    if (arr) withImagesArr++;
    if (img || arr) withAnyPhoto++;
    if (r.sourceUrl) withSource++;
    if (r.verificationStatus === "pending") pending++;
  }

  console.log(`Total suppliers in DB: ${total}`);
  console.log(`  pending moderation:  ${pending}`);
  console.log(`  with imageUrl:       ${withImageUrl}`);
  console.log(`  with logoUrl:        ${withLogo}`);
  console.log(`  with images[]:       ${withImagesArr}`);
  console.log(`  with ANY photo:      ${withAnyPhoto}`);
  console.log(`  with sourceUrl:      ${withSource}`);
  console.log(`  NO photo at all:     ${total - withAnyPhoto}`);

  // Confirm ranking using the SAME comparator the public directory uses:
  // image-bearing first, then score (or reliabilityScore), then name.
  const hasImg = (r: (typeof rows)[number]) => Boolean(r.imageUrl) || hasArr(r.images);
  const ordered = [...rows].sort((a, b) => {
    const img = Number(hasImg(b)) - Number(hasImg(a));
    if (img) return img;
    const sc = (b.score ?? 0) - (a.score ?? 0);
    if (sc) return sc;
    return a.name.localeCompare(b.name);
  });
  console.log(`\nTop 10 in PUBLIC directory order (image-first) → has photo?`);
  for (const r of ordered.slice(0, 10)) {
    console.log(`  ${hasImg(r) ? "📷" : "  "} ${String(r.score ?? "—").padStart(3)} ${r.name.slice(0, 50)}`);
  }
  console.log(`\nLast 10 in PUBLIC directory order (no-image sink to bottom):`);
  for (const r of ordered.slice(-10)) {
    console.log(`  ${hasImg(r) ? "📷" : "  "} ${String(r.score ?? "—").padStart(3)} ${r.name.slice(0, 50)}`);
  }

  const noPhoto = rows.filter((r) => !r.imageUrl && !hasArr(r.images));
  if (noPhoto.length) {
    console.log(`\nSuppliers with NO photo (${noPhoto.length}):`);
    for (const r of noPhoto.slice(0, 20)) {
      console.log(`  score ${r.score} · ${r.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
