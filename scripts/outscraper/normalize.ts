// Moved to src/lib/import/outscraper/normalize.ts so the daily import job on
// Vercel shares the same cleaning / dedupe / scoring rules. This shim keeps the
// script imports (`./normalize`) working unchanged.
export * from "../../src/lib/import/outscraper/normalize";
