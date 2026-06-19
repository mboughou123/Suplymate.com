import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/admin";
import { scrapeSupplierWebsite, scrapeSupplierWebsites } from "@/lib/scraper";
import { scrapedToSupplierInput } from "@/lib/scraper/toSupplierInput";
import { normalizeSupplierInput } from "@/lib/suppliers-store";

export const dynamic = "force-dynamic";
// Scraping is sequential + rate-limited; give it headroom for several URLs.
export const maxDuration = 60;

// POST /api/admin/suppliers/scrape — scrape ONE or MANY public supplier sites.
// Body: { url: string }  OR  { urls: string[] }
// Returns the raw scrape results AND normalized PENDING supplier previews so the
// admin can review (and edit) before saving via POST /api/admin/suppliers.
export async function POST(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as { url?: string; urls?: string[] };
  const urls = body.urls ?? (body.url ? [body.url] : []);
  const cleaned = urls.map((u) => String(u).trim()).filter(Boolean);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "Provide 'url' or 'urls'." }, { status: 400 });
  }
  if (cleaned.length > 20) {
    return NextResponse.json({ error: "Max 20 URLs per request." }, { status: 400 });
  }

  const results =
    cleaned.length === 1
      ? [await scrapeSupplierWebsite(cleaned[0])]
      : await scrapeSupplierWebsites(cleaned);

  // Build editable pending-supplier previews from successful scrapes.
  const suppliers = results
    .filter((r) => r.ok)
    .map((r) => normalizeSupplierInput(scrapedToSupplierInput(r)));

  return NextResponse.json({
    results,
    suppliers,
    counts: {
      requested: cleaned.length,
      scraped: results.filter((r) => r.ok).length,
      blocked: results.filter((r) => !r.ok).length,
    },
  });
}
