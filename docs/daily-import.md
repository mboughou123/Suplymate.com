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
| **Grok machine push (primary)** — after the Researcher OKs a day | `POST /api/admin/import/run` (multipart or JSON, chunked; see [Push hook](#push-hook-the-grok-machine--suplymate)) | `Authorization: Bearer $CRON_SECRET` (timing-safe) → attributed as `grok-bot` |
| Admin manual run | `POST /api/admin/import/run`, `GET …/run` for status | Admin session (`ADMIN_EMAILS`) **or** the same bearer |
| Vercel Cron, daily 03:00 UTC (fallback) | `GET /api/cron/daily-import` (`vercel.json` → `"0 3 * * *"`) | `Authorization: Bearer $CRON_SECRET` (Vercel adds it automatically) |
| Local CLI | `npx tsx scripts/daily-import.ts [--file=… --url=… --limit=N --dry-run --no-enhance --no-grok]` | — |

The cron only does something when `IMPORT_BUNDLE_URL` / `OUTSCRAPER_API_KEY` are
set; today neither is, so it returns `{ ok: true, skipped: "no_source_configured" }`
every night and the push hook is the real feed.

All entry points call the same orchestrator, `src/lib/import/daily-import.ts`:

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
5. **Media pipeline** for every image (`src/lib/import/media-ingest.ts`). Two sources:
   - **Uploaded bytes** (push mode): the pack's `local_images` /
     `image_urls` that point at the Grok machine's filesystem become
     `packfile:<relative path>` refs and are resolved against the files uploaded
     with the request (`enhanced/…` preferred over `images/…`, manifest-aware).
     MIME sniff → Vercel Blob under `<prefix>/enhanced/<entityId>/` → `Media`
     row. **No enhancer runs** — the stills are already the Image Enhancer's
     output — and each gets a `MediaAuditLog` `action: "enhance"` entry with
     `provider: "grok-bot-image-enhancer", preEnhanced: true`.
   - **Remote URLs**: SSRF-safe download (`media-fetch`) → MIME sniff
     (`media-upload`) → Vercel Blob (`image-storage`) → optional enhancer
     (`enhance-image.ts`, unset in production) → `Media` row.
   Dedupe: a ref already attached to the entity (`url` or `originalUrl`,
   including the `packfile:` ref) is skipped, so chunks and re-posts never
   duplicate media. Refs whose bytes are not in the current chunk are counted
   as `media.deferred` and picked up by the chunk that carries them.
6. **Run log**: structured JSON line `[daily-import] {...}` in the Vercel function
   logs, the same summary as the HTTP response, and a `MediaAuditLog` row with
   `action = "daily_import"` (there is no ImportRun table; no schema change).
   Pushed days additionally get one `action = "import_day"` row per chunk
   (`entityType = "IMPORT_DAY"`, `entityId = <day>`, `detail = { digest, part, of }`)
   — that is the per-day idempotency ledger.

The run is bounded by a wall-clock deadline (270 s under the 300 s function
limit) and is idempotent, so a partial run simply continues the next night
(`partial: true`, `remaining` counts in the summary).

### Response / summary shape

```json
{
  "ok": true,
  "trigger": "admin",
  "actor": "grok-bot",
  "started": "2026-09-06T03:00:01.000Z",
  "finished": "2026-09-06T03:03:40.000Z",
  "durationMs": 219000,
  "dryRun": false,
  "partial": false,
  "sources": ["inline:push:2026-09-02 (1/3)"],
  "limit": 25,
  "pack": { "label": "push:2026-09-02 (1/3)", "format": "lister", "generatedAt": "…", "suppliers": 50, "products": 51 },
  "day": "2026-09-02",
  "chunk": { "part": 1, "of": 3 },
  "seal": { "day": "2026-09-02", "digest": "3f2a…", "researcherOk": true, "approvedBy": "Researcher", "approvedAt": "…", "hashedFiles": ["suppliers.json", "products.json"] },
  "uploads": { "files": 61, "bytes": 3350112 },
  "suppliers": { "seen": 50, "created": 20, "updated": 3, "skipped": 2, "failed": 0, "remaining": 25 },
  "products": { "seen": 51, "created": 40, "updated": 0, "skipped": 11, "failed": 0, "remaining": 0 },
  "media": { "candidates": 210, "imported": 61, "enhanced": 61, "skipped": 0, "failed": 0, "deferred": 149 },
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
| `CRON_SECRET` | **Yes** | Gates both the cron (`GET /api/cron/daily-import`, Vercel sends it) **and** the push hook (`POST /api/admin/import/run` with `Authorization: Bearer …` from the Grok machine). Both endpoints refuse everything without it. `openssl rand -hex 32`; share it with the Grok machine. |
| `BLOB_READ_WRITE_TOKEN` | **Yes** for pushed stills | Vercel Blob token (Storage → Blob). Uploaded `enhanced/` files need somewhere to live — without it they are reported as failed (remote URLs merely stay hotlinked). |
| `IMPORT_REQUIRE_SEAL` | No (`true`) | Refuse pushed packs without a valid Researcher seal (422 `skipped: "unsealed"`). Set `false` only for local dry-runs. |
| `IMPORT_PUSH_MAX_BYTES` | No (`4000000`) | Per-request body cap for the push hook → 413 above it. Vercel's own limit is 4.5 MB; the CLI chunks at 3.5 MB. |
| `IMPORT_BUNDLE_URL` | No (cron fallback) | Comma/newline-separated public URL(s) of pack(s) for the nightly cron. Unset today — the packs live only on the Grok machine. |
| `OUTSCRAPER_API_KEY` | No (cron fallback) | Live Google-Maps business listings; the cron runs `IMPORT_OUTSCRAPER_QUERIES_PER_DAY` (default 3) rotating queries from `src/lib/import/outscraper/queries.ts`. |
| `IMPORT_DAILY_LIMIT` | No (25) | Suppliers per run. |
| `IMPORT_DAILY_PRODUCT_LIMIT` | No (150) | Products per run. |
| `IMPORT_MEDIA_PER_SUPPLIER` / `IMPORT_MEDIA_PER_PRODUCT` | No (6 / 3) | Photos kept per entity. |
| `IMPORT_PUBLIC_BASE_URL` | No | Resolves site-relative image paths in packs (`/images/suppliers/…`) — e.g. `https://suplymate.com`. Bot-VM paths (`/workspace/…`) are ignored. |
| `XAI_API_KEY` | No | Enables Grok curation / copy. Get it at console.x.ai. |
| `XAI_MODEL` | No (`grok-4.6`) | Text model for descriptions / summaries. |
| `XAI_VISION_MODEL` | No (`grok-4.6`) | Vision model for photo classification (grok-4.6 accepts text + image input per docs.x.ai). |
| `IMAGE_ENHANCER_URL` | No — **intentionally unset** | Webhook enhancer for remote URLs (contract below). Amine's decision (Sep 2026): leave unset; the Grok machine's `enhanced/` stills are ingested as-is. |
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

Amine's answers (Sep 2026) fixed the integration shape:

> Packs live only on the shared Grok machine: `/workspace/suppliers-phase1/daily/YYYY-MM-DD/`
> (suppliers.json, products.json, enhanced/, seals). No public IMPORT_BUNDLE_URL.
> Best hook: POST /api/admin/import/run with CRON_SECRET after Researcher OK.
> No IMAGE_ENHANCER_URL — use enhanced/ stills as-is. Don't import a day until
> seals exist + Researcher OK.

So the site does not pull; **the Grok machine pushes** a sealed day. The daily
job reads the pack format natively (`format: "lister"` in `pack-formats.ts`).

## Push hook: the Grok machine → Suplymate

### One command (recommended)

On the Grok machine, once the Researcher has OK'd the day and `seal.json` exists:

```bash
# in a checkout of this repo (node ≥ 20; `npm ci` once)
export CRON_SECRET=…            # same value as on Vercel
npx tsx scripts/daily-import.ts --push https://suplymate.com --secret "$CRON_SECRET" \
    --day 2026-09-02 --dir /workspace/suppliers-phase1/daily/2026-09-02
# add --dry-run to validate without writing; --chunk-bytes 3000000 for smaller requests
```

The CLI reads the folder, finds `suppliers.json`, `products.json`, the seal
(`seal.json` | `seals.json` | `seals/<day>.json` | first `seals/*.json`), every
`*manifest*.json` and every image under `enhanced/**`, splits the images into
requests under the size cap, POSTs them in order and prints the per-chunk
summaries. It stops at the first 4xx (unsealed / hash mismatch / too large) so
nothing half-imports.

### Request contract (what the CLI sends; any HTTP client can do the same)

```
POST /api/admin/import/run
Authorization: Bearer <CRON_SECRET>
Content-Type: multipart/form-data
```

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `day` | text `YYYY-MM-DD` | yes | Must equal `seal.day`. |
| `part`, `of` | text ints | for chunks | `1`/`1` for a single request; `k`/`N` for chunk k of N. |
| `seal` | file or JSON text | yes (unless `IMPORT_REQUIRE_SEAL=false`) | Repeat in **every** chunk. |
| `suppliers.json` | file | yes* | Repeat in every chunk (small; lets each chunk stand alone). |
| `products.json` | file | yes* | *at least one of the two. |
| `manifest` | file, repeatable | no | `[{ src, dst }]` from the Image Enhancer — maps `images/…` → `enhanced/…` when names differ. |
| `options` | JSON text | no | `{"dryRun":true,"limit":50,"productLimit":200,"grok":false}`. |
| `enhanced/suppliers/<slug>/<file>.jpg`, `enhanced/products/<slug>/<file>.jpg`, … | file | the stills | **Field name = path relative to the pack root.** Absolute `/workspace/suppliers-phase1/daily/<day>/…` names are also accepted and normalised. |

How the pack's paths meet the uploaded files: every `local_images` / `image_urls`
entry that is a Grok-machine path (`/workspace/…/daily/<day>/images/suppliers/posco/05.jpg`)
becomes `packfile:images/suppliers/posco/05.jpg`; at ingest time the server looks
for, in order, the manifest `dst`, `enhanced/suppliers/posco/05.jpg`, the exact
path, then `images/…` as a last resort. Uploading only `enhanced/**` is therefore
enough. Certificate scans (`certifications[].image_url` / `cert_image_urls` /
`local_cert_images`) go through the same mapping.

**Chunking protocol.** Vercel rejects bodies over 4.5 MB, and the server enforces
`IMPORT_PUSH_MAX_BYTES` (default 4 MB) → `413` with a message. A day with
hundreds of stills is sent as N requests: each carries `day`, `part=k`, `of=N`,
the seal, both JSON files (and manifests), plus a disjoint subset of the image
files. The server processes the whole pack every time — suppliers/products
upsert idempotently (second and later chunks report them as `skipped`), media is
deduped on the `packfile:` ref, images whose bytes are not in this chunk are
counted as `media.deferred`. Chunks may be retried or sent out of order; a chunk
already recorded for the same seal digest returns `skipped: "already_imported"`.

### Seal gate

No machine-readable seal exists in the packs so far (the bot's commits call the
Image-Enhancer output "sealed JPEGs" and there is no seals file), so this is the
contract the Researcher/Grok machine must write as `seal.json` in the day folder:

```json
{
  "day": "2026-09-02",
  "researcherOk": true,
  "approvedBy": "Researcher (Grok Bot)",
  "approvedAt": "2026-09-02T19:40:00Z",
  "sha256": {
    "suppliers.json": "<sha256 hex of the file bytes>",
    "products.json": "<sha256 hex of the file bytes>"
  },
  "note": "optional"
}
```

`sha256sum suppliers.json products.json` produces the hashes. Accepted aliases:
`date`, `researcher_ok` / `research_ok` / `approved` / `ok`, `approved_by`,
`approved_at`, `hashes`; a `{ "seal": {…} }` wrapper or `{ "seals": [ {…} ] }`
with one entry also parses.

The server refuses with **422 `{ ok: false, skipped: "unsealed", error }`** when
the seal is missing/malformed, `researcherOk` is not true, `day` differs from
the pushed `day`, or a listed hash does not match the uploaded file. Hashes are
optional but strongly recommended; a listed file that is not in the request is
not checked (it is checked in the chunk that carries it).

**Per-day idempotency.** The canonical seal (`day` + sorted `sha256`) is
digested; every chunk that fully landed (`ok`, not `partial`, `media.failed = 0`)
writes `MediaAuditLog { action: "import_day", entityType: "IMPORT_DAY",
entityId: day, detail: { digest, part, of } }` (mirrored in memory when no DB is
reachable). A chunk with failed uploads is *not* recorded, so it can simply be
pushed again after the cause is fixed (e.g. `BLOB_READ_WRITE_TOKEN` missing) —
suppliers, products and already-stored media dedupe on retry. Re-posting a completed day, or an
already-imported chunk, at the same digest returns
`200 { ok: true, skipped: "already_imported", importedParts, complete }` and
touches nothing. To re-import a revised pack, change the pack (new hashes) or
bump `approvedAt` — that yields a new digest. No schema change was needed.

`GET /api/admin/import/run?day=2026-09-02&digest=<digest>` (same auth) shows
the ledger for a pack revision.

### curl examples

```bash
# Whole day in one request (small pack)
D=/workspace/suppliers-phase1/daily/2026-09-02
curl -sS -X POST https://suplymate.com/api/admin/import/run \
  -H "Authorization: Bearer $CRON_SECRET" \
  -F day=2026-09-02 -F part=1 -F of=1 \
  -F "seal=@$D/seal.json;type=application/json" \
  -F "suppliers.json=@$D/suppliers.json;type=application/json" \
  -F "products.json=@$D/products.json;type=application/json" \
  -F "manifest=@$D/daily-2026-09-02-manifest-suppliers.json;type=application/json" \
  -F "enhanced/suppliers/posco/05.jpg=@$D/enhanced/suppliers/posco/05.jpg;type=image/jpeg" \
  -F "enhanced/suppliers/posco/06.jpg=@$D/enhanced/suppliers/posco/06.jpg;type=image/jpeg" \
  -F 'options={"dryRun":false}'

# Chunk 2 of 3: same JSON + seal, a different slice of stills
curl -sS -X POST https://suplymate.com/api/admin/import/run \
  -H "Authorization: Bearer $CRON_SECRET" \
  -F day=2026-09-02 -F part=2 -F of=3 \
  -F "seal=@$D/seal.json" -F "suppliers.json=@$D/suppliers.json" -F "products.json=@$D/products.json" \
  -F "enhanced/products/amcor/amcor-pack-1.jpg=@$D/enhanced/products/amcor/amcor-pack-1.jpg"

# JSON body (tiny pushes / tests): pack inline, images as data: URLs
curl -sS -X POST https://suplymate.com/api/admin/import/run \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
  -d '{ "day": "2026-09-02", "seal": { "day": "2026-09-02", "researcherOk": true },
        "suppliers": { "suppliers": [ { "company_name": "POSCO", "local_images": ["/workspace/suppliers-phase1/daily/2026-09-02/images/suppliers/posco/05.jpg"] } ] },
        "files": { "enhanced/suppliers/posco/05.jpg": "data:image/jpeg;base64,/9j/4AAQ…" },
        "dryRun": true }'
# (pass "suppliers"/"products" as JSON *strings* if you want their sha256 verified)

# Status / ledger
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://suplymate.com/api/admin/import/run?day=2026-09-02&digest=<digest>"
```

Responses: `200` run summary (`ok`, counts, `seal`, `chunk`, `uploads`,
`media.deferred`), `200 skipped: "already_imported"`, `401` bad/missing bearer
and no admin session, `400` malformed fields, `413` body over the cap, `422`
unsealed, `500` the run itself failed (`errors[]`).

### Cron fallback (unchanged)

If a public pack URL ever exists, set `IMPORT_BUNDLE_URL` (comma-separated) and
the 03:00 UTC cron imports it without a seal — that path is meant for
bot-independent sources (Outscraper, public bundles). It is a no-op today.

### Enhancer webhook (not used — kept for completeness)

`IMAGE_ENHANCER_URL` is **intentionally unset**: pushed `enhanced/**` stills are
stored as-is and logged as pre-enhanced. If a server-side enhancer for *remote*
URLs is ever wanted, the contract is:

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

# Exercise the push hook against a local dev server (no DB: writes go to the
# in-memory overlays; stills need BLOB_READ_WRITE_TOKEN or are reported failed)
CRON_SECRET=devsecret npm run dev -- -p 3400 &
npx tsx scripts/daily-import.ts --push http://localhost:3400 --secret devsecret \
    --day 2026-09-02 --dir /tmp/daily/2026-09-02 --dry-run
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
- `src/lib/import/media-ingest.ts` — download or uploaded bytes → Blob → (enhance) → `Media`
- `src/lib/import/pack-files.ts` — `packfile:` refs, pack-relative path normalisation, uploaded-file lookup (manifest-aware)
- `src/lib/import/push-request.ts` — multipart / JSON push parser, size cap (413)
- `src/lib/import/push-client.ts` — folder reader, chunk planner, multipart sender (used by the CLI `--push`)
- `src/lib/import/seal.ts` — seal schema + verification, per-day import ledger
- `src/lib/import/enhance-image.ts` — pluggable enhancer (webhook / OpenAI / none)
- `src/lib/import/grok-curation.ts` — Grok photo curation, product copy, supplier summary
- `src/lib/import/cron-auth.ts` — `CRON_SECRET` bearer check
- `src/lib/import/outscraper/{client,queries,normalize}.ts` — shared Outscraper code (scripts re-export it)
- `src/lib/xai.ts` — xAI chat-completions client (OpenAI-compatible, no SDK)
- `scripts/daily-import.ts` — CLI
- `src/lib/import/__tests__/*` — unit tests (mocked fetch / Prisma)
