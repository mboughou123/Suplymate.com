# Daily supplier / product / media import ("the grok bot" link)

Suplymate imports new suppliers and products **every day** and re-hosts their
photos (supplier factory stills, product photos, certification scans) in Vercel
Blob, optionally passing each image through an "enhancer". Grok (xAI) curates
the photos and writes factual product copy when a key is present.

Everything imported lands **unpublished / pending review**:

| Entity | Where it lands | Status after import |
| --- | --- | --- |
| Supplier (`Supplier`) | `/admin/import-suppliers`, `/admin/suppliers` | `verificationStatus = "pending"`, `marketplaceStatus = "LISTED"` (DB default). Never `verified`. |
| Product (`ScrapedProduct`) | `/admin/products` review queue | `status = "pending"` (existing rows keep their status) |
| Certification (`Certification`) | `/admin/certifications` | `status = "claimed"` |
| Media (`Media`) | `/admin/media` | `status = "unpublished"` |

Publishing / verifying stays a manual admin action.

## What runs when

| Trigger | Entry point | Auth |
| --- | --- | --- |
| Vercel Cron, daily 03:00 UTC | `GET /api/cron/daily-import` (`vercel.json` → `"0 3 * * *"`) | `Authorization: Bearer $CRON_SECRET` (Vercel adds it automatically) |
| Manual / Grok Bot push | `POST /api/admin/import/run` | Admin session (`ADMIN_EMAILS`) **or** `Authorization: Bearer $CRON_SECRET` |
| Local CLI | `npx tsx scripts/daily-import.ts [--file=… --url=… --limit=N --dry-run --no-enhance --no-grok]` | — |

All three call the same orchestrator, `src/lib/import/daily-import.ts`:

1. **Load sources** → one normalised `ImportPack` (`src/lib/import/sources.ts`, `pack-formats.ts`).
2. **Suppliers** (max `IMPORT_DAILY_LIMIT`, default 25): duplicate detection by id /
   website / email / phone / name (`findDuplicates`). New → `saveSuppliers` as
   *pending*. Existing → non-destructive merge (fill blanks, append photos,
   certifications, product lines). Grok writes a ≤60-word summary only when the
   source has no description.
3. **Supplier media**: logo → `SUPPLIER_LOGO`; candidate photos are classified by
   Grok vision (factory exterior / production line / product / certificate / logo /
   irrelevant, quality 1–5). Best `IMPORT_MEDIA_PER_SUPPLIER` (default 6) are
   imported as `SUPPLIER_FACTORY` / `SUPPLIER_GALLERY`; certificates become a
   `Certification` row + `CERTIFICATION` media; logos and irrelevant/stock shots
   are dropped. Without Grok, URL heuristics are used.
4. **Products** (max `IMPORT_DAILY_PRODUCT_LIMIT`, default 150): upsert
   `ScrapedProduct` by stable id `import-<supplier>-<slug>` (or `bundle-…`).
   Prices are only stored when the pack gives one — `null` means RFQ, never
   invented. Grok writes a factual description + spec bullets when the pack has
   none (prompt forbids inventing certifications, prices, MOQ, lead times).
   Up to `IMPORT_MEDIA_PER_PRODUCT` (default 3) images → `PRODUCT_PRIMARY` / `PRODUCT_GALLERY`.
5. **Media pipeline** for every image (`src/lib/import/media-ingest.ts`):
   SSRF-safe download (`media-fetch`) → MIME sniff (`media-upload`) → Vercel Blob
   (`image-storage`) → enhancer (`enhance-image.ts`) → `Media` row (unpublished).
   Dedupe: a URL already attached to the entity (`url` or `originalUrl`) is skipped.
6. **Run log**: structured JSON line `[daily-import] {...}` in the Vercel function
   logs, the same summary as the HTTP response, and a `MediaAuditLog` row with
   `action = "daily_import"` (there is no ImportRun table; no schema change).

The run is bounded by a wall-clock deadline (270 s under the 300 s function
limit) and is idempotent, so a partial run simply continues the next night
(`partial: true`, `remaining` counts in the summary).

### Response / summary shape

```json
{
  "ok": true,
  "trigger": "cron",
  "started": "2026-09-06T03:00:01.000Z",
  "finished": "2026-09-06T03:03:40.000Z",
  "durationMs": 219000,
  "dryRun": false,
  "partial": false,
  "sources": ["url:https://…/suppliers.json"],
  "limit": 25,
  "pack": { "label": "suppliers.json", "format": "lister", "generatedAt": "…", "suppliers": 50, "products": 51 },
  "suppliers": { "seen": 50, "created": 20, "updated": 3, "skipped": 2, "failed": 0, "remaining": 25 },
  "products": { "seen": 51, "created": 40, "updated": 0, "skipped": 11, "failed": 0, "remaining": 0 },
  "media": { "candidates": 210, "imported": 96, "enhanced": 96, "skipped": 80, "failed": 4 },
  "certifications": { "created": 12, "skipped": 0, "failed": 0 },
  "grok": { "configured": true, "model": "grok-4.6", "visionModel": "grok-4.6", "photosClassified": 130, "descriptions": 40, "summaries": 5, "notes": [] },
  "enhancer": { "provider": "webhook", "configured": true, "note": "Webhook enhancer at …" },
  "storage": { "provider": "vercel-blob", "configured": true },
  "errors": [],
  "warnings": []
}
```

When nothing is configured the job returns `{ ok: true, skipped: "no_source_configured", … }`
and exits 200 — it never fails the cron for a missing source.

## Environment variables (Vercel → Project Settings → Environment Variables)

| Var | Required? | Purpose |
| --- | --- | --- |
| `CRON_SECRET` | **Yes** for the cron | Vercel sends it as `Authorization: Bearer …`; the endpoint refuses everything without it. `openssl rand -hex 32`. |
| `BLOB_READ_WRITE_TOKEN` | Strongly recommended | Vercel Blob token (Storage → Blob). Without it images stay hotlinked and enhancement is skipped (nowhere to store the result). |
| `IMPORT_BUNDLE_URL` | One source needed | Comma/newline-separated public URL(s) of the pack(s) to import each night. See "Plugging in the grok bot". |
| `OUTSCRAPER_API_KEY` | One source needed | Live Google-Maps business listings; the job runs `IMPORT_OUTSCRAPER_QUERIES_PER_DAY` (default 3) rotating queries from `src/lib/import/outscraper/queries.ts`. |
| `IMPORT_DAILY_LIMIT` | No (25) | Suppliers per run. |
| `IMPORT_DAILY_PRODUCT_LIMIT` | No (150) | Products per run. |
| `IMPORT_MEDIA_PER_SUPPLIER` / `IMPORT_MEDIA_PER_PRODUCT` | No (6 / 3) | Photos kept per entity. |
| `IMPORT_PUBLIC_BASE_URL` | No | Resolves site-relative image paths in packs (`/images/suppliers/…`) — e.g. `https://suplymate.com`. Bot-VM paths (`/workspace/…`) are ignored. |
| `XAI_API_KEY` | No | Enables Grok curation / copy. Get it at console.x.ai. |
| `XAI_MODEL` | No (`grok-4.6`) | Text model for descriptions / summaries. |
| `XAI_VISION_MODEL` | No (`grok-4.6`) | Vision model for photo classification (grok-4.6 accepts text + image input per docs.x.ai). |
| `IMAGE_ENHANCER_URL` | No | Webhook enhancer (contract below). |
| `IMAGE_ENHANCER_KEY` | No | Bearer token sent to the webhook. |
| `IMAGE_ENHANCER_TIMEOUT_MS` | No (60000) | Webhook timeout. |
| `IMAGE_ENHANCE_WITH_OPENAI` | No (`false`) | Use OpenAI `gpt-image-1` image edits when no webhook is set. Paid; off by default. Needs `OPENAI_API_KEY`. |
| `GOOGLE_PLACES_API_KEY`, `SCRAPE_DELAY_MS`, `SCRAPE_TIMEOUT_MS` | No | Existing scraper knobs, unchanged. |

All of these are listed as optional in `src/lib/env.ts` and documented in `.env.example`.

## Plugging in "the grok bot"

What we found in the repo history: the "grok bot" is a set of xAI **Grok Bot**
agents (persistent cloud-VM teammates; named in commits as *Lister*, *Research
QA* and *Image Enhancer*) that Amine connected to GitHub. They committed, under
his account, daily research packs plus enhanced JPGs to the
`cursor/amine-review-nav-mate-ctas-83a7` / `import/phase1-suppliers-59` /
`cursor/phase1-supplier-import-7b9c` branches:

- `data/daily-YYYY-MM-DD-suppliers.json` — `{ suppliers: [{ company_name, primary_category, country, city, website, description, product_lines, certifications[{name, source}], moq, source_url, photo_urls, local_images, slug, … }] }`
- `data/daily-YYYY-MM-DD-products.json` — `{ products: [{ product_name, product_slug, supplier_name, supplier_slug_guess, source_url, unit_price, currency, unit, price_note, price_source_type, image_urls, needs_ai_generate }] }`
- `data/product-media-certs-enhanced-manifest.json`, `data/certs-seed.tsv` — certificate scans (src → enhanced dst)
- `public/images/{suppliers,products,certs}/…` — the enhanced JPGs (produced by the bot's own "Image Enhancer" step on its VM; `local_images` paths point at `/workspace/suppliers-phase1/…` on that VM)

Those packs were wired into the site by hand each day. The daily job now reads
the **same pack format natively** (`format: "lister"` in `pack-formats.ts`), so
connecting the bot is a configuration step, in one of three ways:

### Option A — the bot publishes its pack to a URL (recommended)

Set `IMPORT_BUNDLE_URL` to the public URL(s) of the latest pack, e.g. the raw
GitHub URL of the file(s) the bot commits, a Vercel Blob / S3 object, or a Google
Drive "anyone with the link" export:

```
IMPORT_BUNDLE_URL="https://raw.githubusercontent.com/<org>/<repo>/<bot-branch>/data/latest-suppliers.json,https://raw.githubusercontent.com/<org>/<repo>/<bot-branch>/data/latest-products.json"
```

Ask the bot to always (over)write a stable filename (`latest-*.json`) or update
the env var. Because the pack's `local_images` are VM paths, ask the bot to also
include **public URLs** of its enhanced files — any of `enhanced_image_urls`,
`hosted_images`, `image_urls`, `photo_urls` on suppliers and
`enhanced_image_urls` / `image_urls` on products are accepted. If it commits the
JPGs under `public/images/...` in this repo, set
`IMPORT_PUBLIC_BASE_URL=https://suplymate.com` and put `/images/...` paths in the pack.

### Option B — the bot POSTs the pack to Suplymate

```
POST https://suplymate.com/api/admin/import/run
Authorization: Bearer <CRON_SECRET>
Content-Type: application/json

{ "label": "daily-2026-09-06", "pack": { "suppliers": [ … ], "products": [ … ] } }
```

(`"csv": "name,country,…"` and `"bundleUrl": "https://…"` are also accepted.)
The response is the run summary above.

### Option C — the Image Enhancer bot as the enhancer webhook

If the bot can expose an HTTP endpoint (or you put a tiny relay in front of
it), set `IMAGE_ENHANCER_URL` (+ `IMAGE_ENHANCER_KEY`). The job will call it for
every imported photo / certificate scan:

```
POST {IMAGE_ENHANCER_URL}
Authorization: Bearer {IMAGE_ENHANCER_KEY}      # when set
Content-Type: application/json

{ "imageUrl": "https://newsroom.posco.com/…/14-1024x576.jpg",
  "kind": "photo" | "certificate",
  "entity": { "type": "SUPPLIER" | "PRODUCT" | "CERTIFICATION", "id": "posco" },
  "requestId": "posco-3f2a9c1e0b7d4e5f" }

200 → { "url": "https://…/enhanced.jpg" }          # we download and store it
   or { "image": "data:image/jpeg;base64,…" }       # inline result
   or { "skipped": true, "reason": "already sharp" } # keep the original
```

Non-2xx, timeouts or invalid bodies never fail the run — the original is kept.
Enhanced files are stored in Blob under `<prefix>/enhanced/<entityId>/…` and
each gets a `MediaAuditLog` entry `action: "enhance"` with the provider and the
original stored URL (the `Media` table has no dedicated flag; no schema change).

Without a webhook, `IMAGE_ENHANCE_WITH_OPENAI=true` + `OPENAI_API_KEY` uses
OpenAI `gpt-image-1` edits with a conservative prompt ("clean up lighting/noise,
keep every real detail, do not add or remove objects"). It is off by default
because it costs money and a generative model must never fabricate details on
factory or certificate photos.

## Sources & formats accepted

| Format | Detected by | Example |
| --- | --- | --- |
| Lister / Grok Bot daily pack | `suppliers[].company_name` / `products[].product_name` | `data/daily-2026-09-02-suppliers.json` on the bot branch |
| SupplierBundle JSON (or array / `{bundles:[…]}`) | `supplierName` + `products[]` | `scripts/import/examples/metalworks-china.json` |
| Supplier CSV | non-JSON text | `scripts/import/examples/suppliers-sample.csv` (headers per `src/lib/csv.ts`; a phase-1 style `photoUrls` column is mapped to `images`) |
| Outscraper | `OUTSCRAPER_API_KEY` | `src/lib/import/outscraper/*` (shared with `scripts/outscraper/*`) |

## Running locally

```bash
# Dry-run the example bundle (no DB writes, no downloads)
npx tsx scripts/daily-import.ts --file=scripts/import/examples/metalworks-china.json --dry-run

# Import a Grok Bot pack you downloaded (needs DATABASE_URL; BLOB token optional)
npx tsx scripts/daily-import.ts --file=data/daily-2026-09-02-suppliers.json --file=data/daily-2026-09-02-products.json --limit=10

# Same as the cron would do (uses IMPORT_BUNDLE_URL / OUTSCRAPER_API_KEY from .env.local)
npx tsx scripts/daily-import.ts

# Hit the deployed cron endpoint manually
curl -H "Authorization: Bearer $CRON_SECRET" https://suplymate.com/api/cron/daily-import?dryRun=1
```

The script loads `.env.local` / `.env` automatically. Without `DATABASE_URL`
the stores fall back to in-memory overlays, so you can still validate a pack.

## Files

- `vercel.json` — cron schedule
- `src/app/api/cron/daily-import/route.ts` — cron entry (GET, 300 s)
- `src/app/api/admin/import/run/route.ts` — manual trigger (POST) + config view (GET)
- `src/lib/import/daily-import.ts` — orchestrator
- `src/lib/import/sources.ts` — source resolution (inline / URL / Outscraper)
- `src/lib/import/pack-formats.ts` — Lister pack / SupplierBundle / CSV → `ImportPack`
- `src/lib/import/media-ingest.ts` — download → Blob → enhance → `Media`
- `src/lib/import/enhance-image.ts` — pluggable enhancer (webhook / OpenAI / none)
- `src/lib/import/grok-curation.ts` — Grok photo curation, product copy, supplier summary
- `src/lib/import/cron-auth.ts` — `CRON_SECRET` bearer check
- `src/lib/import/outscraper/{client,queries,normalize}.ts` — shared Outscraper code (scripts re-export it)
- `src/lib/xai.ts` — xAI chat-completions client (OpenAI-compatible, no SDK)
- `scripts/daily-import.ts` — CLI
- `src/lib/import/__tests__/*` — unit tests (mocked fetch / Prisma)
