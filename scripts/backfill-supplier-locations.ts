// Backfill city, location and description for suppliers already in the database.
//
// The normalizer (src/lib/supplier-normalize.ts) recovers a real city from the
// address and builds a description from it, but it only runs on import. Rows
// imported before that logic existed still carry the raw scraper output, where
// the city column holds a bare country code ("AE") and the description reads
// "Construction supplier in AE, United Arab Emirates."
//
// This script re-applies the current normalizer to existing rows. It reports
// without writing unless --apply is passed.
//
//   npx tsx scripts/backfill-supplier-locations.ts            # report only
//   npx tsx scripts/backfill-supplier-locations.ts --apply    # write

import { PrismaClient } from "@prisma/client";
import {
  extractSupplierCity,
  generateSupplierDescription,
  isBareIsoCode,
} from "../src/lib/supplier-normalize";

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const LIMIT = Number(
  argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0
);

/**
 * Descriptions matching the scraper's own template are safe to regenerate.
 * Anything else may be genuine copy written by a person, so it is left alone.
 */
function isGeneratedDescription(value: string | null): boolean {
  if (!value) return true;
  return /^.+ supplier in .+\.$/i.test(value.trim());
}

/**
 * A pending edit. `to` is non-nullable throughout: this script only ever
 * replaces a bad value with a recovered one, and never blanks a field.
 */
type Edit = { from: string | null; to: string };

type Change = {
  id: string;
  name: string;
  city?: Edit;
  location?: Edit;
  description?: Edit;
};

async function main() {
  const rows = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      address: true,
      location: true,
      category: true,
      industry: true,
      description: true,
    },
    orderBy: { name: "asc" },
  });

  const changes: Change[] = [];

  for (const row of rows) {
    const change: Change = { id: row.id, name: row.name };

    // Only the city is recomputed; country is left as imported because the
    // address is not a reliable source for it (US addresses omit it entirely).
    const nextCity = extractSupplierCity(row);
    const cityIsBroken = isBareIsoCode(row.city) || !row.city?.trim();
    if (cityIsBroken && nextCity && nextCity !== row.city) {
      change.city = { from: row.city, to: nextCity };
    }

    const effectiveCity = change.city?.to ?? row.city;

    // "AE, United Arab Emirates" should become "Dubai, United Arab Emirates".
    const nextLocation =
      [effectiveCity, row.country].filter(Boolean).join(", ") ||
      row.country ||
      null;
    if (nextLocation && nextLocation !== row.location) {
      const locationIsBroken =
        !row.location?.trim() ||
        isBareIsoCode(row.location.split(",")[0]?.trim());
      if (locationIsBroken) {
        change.location = { from: row.location, to: nextLocation };
      }
    }

    // Regenerate the description when the city it names has changed, so the
    // copy stops referring to a country code as if it were a city.
    if (isGeneratedDescription(row.description) && change.city) {
      const nextDescription = generateSupplierDescription({
        name: row.name,
        industry: row.industry,
        category: row.category,
        country: row.country,
        city: effectiveCity,
        address: row.address,
        location: change.location?.to ?? row.location,
      });
      if (nextDescription !== row.description) {
        change.description = { from: row.description, to: nextDescription };
      }
    }

    if (change.city || change.location || change.description) {
      changes.push(change);
    }
  }

  const planned = LIMIT > 0 ? changes.slice(0, LIMIT) : changes;

  console.log(`suppliers scanned:      ${rows.length}`);
  console.log(`rows needing changes:   ${changes.length}`);
  console.log(`  city rewritten:       ${changes.filter((c) => c.city).length}`);
  console.log(`  location rewritten:   ${changes.filter((c) => c.location).length}`);
  console.log(`  description rebuilt:  ${changes.filter((c) => c.description).length}`);

  console.log(`\nsample (first 8 of ${planned.length}):`);
  for (const change of planned.slice(0, 8)) {
    console.log(`\n  ${change.name}`);
    if (change.city) console.log(`    city:        ${JSON.stringify(change.city.from)} -> ${JSON.stringify(change.city.to)}`);
    if (change.location) console.log(`    location:    ${JSON.stringify(change.location.from)} -> ${JSON.stringify(change.location.to)}`);
    if (change.description) console.log(`    description: ${JSON.stringify(change.description.to)}`);
  }

  if (!APPLY) {
    console.log(`\nreport only — re-run with --apply to write ${planned.length} row(s).`);
    return;
  }

  let written = 0;
  for (const change of planned) {
    await prisma.supplier.update({
      where: { id: change.id },
      data: {
        ...(change.city ? { city: change.city.to } : {}),
        ...(change.location ? { location: change.location.to } : {}),
        ...(change.description ? { description: change.description.to } : {}),
      },
    });
    written += 1;
  }
  console.log(`\napplied to ${written} row(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
