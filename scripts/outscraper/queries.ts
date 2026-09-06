// Moved to src/lib/import/outscraper/queries.ts so the daily import job on
// Vercel shares the same query matrix. This shim keeps the script imports
// (`./queries`) working unchanged.
export * from "../../src/lib/import/outscraper/queries";
