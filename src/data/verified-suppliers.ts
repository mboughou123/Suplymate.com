// Retired synthetic supplier directory.
//
// This module used to deterministically generate 108 fictional companies —
// names built as "{City} {Word}" ("Rotterdam Steel Works", "Istanbul Tube &
// Pipe Co."), with invented websites, email addresses, phone numbers, street
// addresses, Google ratings, review counts of up to ~1,200, years in business,
// and a `verified` flag set true for 72% of them. Each also carried a
// google.com/maps sourceUrl, which made the fabrication look sourced.
//
// It was reachable in production: data-service.ts merged this list into its
// supplier lookup, so /supplier/rotterdam-steel-works served a complete profile
// for a company that does not exist, and the ids were fed to
// generateStaticParams.
//
// The directory now serves only collected records: the Outscraper dataset
// (real Google Maps business listings) and the database. This export is kept as
// an empty array so the "no data" path stays explicit rather than silently
// disappearing, and so a future contributor sees why it must stay empty.
//
// Do not repopulate this with generated companies. To develop without the
// Outscraper API key, use `prisma/seed.ts`, which produces clearly-labelled
// demo records.

import type { Supplier } from "./suppliers";

export const verifiedSuppliers: Supplier[] = [];
