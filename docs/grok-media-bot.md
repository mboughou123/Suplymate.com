# Grok media bots: logos, photos and certificates

The media bots fill in the pictures Suplymate is missing: supplier logos and
factory photos, product photos, certificate scans and the logos of the
logistics / cargo-insurance providers. They run **on the bot machines** (a
workstation, a VM, Docker or Kubernetes), not on Vercel and not by Suplymate
scraping anyone. The bot collects and enhances the images on its own
machine, a free local AI model reviews each one, and only the result is
pushed to Suplymate.

Everything pushed lands **unpublished** in `/admin/media`. Certificates pushed
for a supplier create a `Certification` with `status = "claimed"`. Publishing
and verifying stay a manual admin action.

## Where images may come from

The page an image was found on (`sourceUrl`) must be on the **entity's own
official website**, the domain of the supplier's or provider's `website` in
Suplymate. The image file itself (`imageUrl`) may sit on the site's CDN.

Marketplaces and competing directories are refused, both by the bot before
uploading and again by the server: Alibaba / AliExpress / 1688 / Taobao,
Made-in-China, Global Sources, IndiaMART, TradeIndia, DHgate, EC21, Amazon,
eBay, Walmart, Temu, Etsy and similar (`MARKETPLACE_DOMAINS` in
`src/lib/media-bot/provenance.ts`; `GET /api/admin/import/media` returns the
live list). Photos on those sites belong to their sellers or to the platform,
often show another company's goods, and re-hosting them would misrepresent
where a picture comes from. Images carrying a marketplace watermark are also
refused, even when found on the official site.

Enhancements are limited to `none`, `resize`, `restore`, `upscale` and
`background-removed`. Generative edits (inpainting, redrawn or "improved"
logos) are not accepted: buyers must see the real factory, product and
certificate. Certificates are only resized, never restored or upscaled.

## Endpoints

Both take `Authorization: Bearer $CRON_SECRET` (attributed as `grok-bot`) or
an admin session.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/admin/import/media-needs?industry=metals&target=supplier&limit=200&offset=0` | What is missing, per industry: each entity with its official domains and the roles it still needs. `industry` is `all` or one of `metals`, `construction`, `packaging`, `machinery`, `hardware-components`, `biomedical`, `electrical-industrial`, `logistics-insurance`. |
| `GET /api/admin/import/media` | The push contract: targets, roles, allowed enhancements, blocked domains. |
| `POST /api/admin/import/media` | Multipart push: a `manifest` part (`media-manifest.json`) plus one part per file, named by its pack-relative path. Optional `dryRun=true`. Keep each request under ~4 MB (the worker chunks automatically). |

Per-item results are `imported`, `would-import` (dry run), `skipped` (same
image already stored), `rejected` (with the reason), `failed` (e.g. storage
not configured; safe to push again) or `deferred` (its file was not in this
request).

## Folder layout and manifest

A bot drops one folder per batch into the inbox:

```
inbox/2026-10-04-metals/
  media-manifest.json
  originals/            # untouched downloads
```

```json
{
  "version": 1,
  "bot": "grok-media-bot",
  "industry": "metals",
  "items": [
    {
      "target": "supplier",
      "entityId": "dillinger",
      "role": "logo",
      "original": "originals/dillinger-logo.svg",
      "sourceUrl": "https://www.dillinger.de/",
      "imageUrl": "https://www.dillinger.de/app/uploads/sites/3/2023/11/logo-dillinger.svg"
    },
    {
      "target": "supplier",
      "entityId": "dillinger",
      "role": "certificate",
      "original": "originals/iso-9001.jpg",
      "sourceUrl": "https://www.dillinger.de/certificates/",
      "certification": { "name": "ISO 9001", "issuingOrg": "TÜV SÜD", "expirationDate": "2027-05-31" }
    },
    {
      "target": "logistics-provider",
      "entityId": "aig-ocean-cargo",
      "role": "logo",
      "original": "originals/aig-logo.png",
      "sourceUrl": "https://www.aig.com/home"
    }
  ]
}
```

| `target` | `entityId` | Roles |
| --- | --- | --- |
| `supplier` | supplier id | `logo`, `cover`, `factory`, `gallery`, `certificate` (needs `certification.name`) |
| `product` | product id | `product` |
| `certification` | existing certification id | `certificate` |
| `logistics-provider` | provider id from `src/data/logistics-providers.ts` | `logo` |

Optional per item: `imageUrl`, `altText`, `caption`, `enhancement` (set by
`prepare`), `sha256`, `width`, `height`.

## The worker (`scripts/media-bot.ts`)

```
npx tsx scripts/media-bot.ts needs    --industry metals --out needs/metals.json
npx tsx scripts/media-bot.ts prepare  --dir inbox/2026-10-04-metals --needs needs/metals.json [--no-ai]
npx tsx scripts/media-bot.ts push     --dir inbox/2026-10-04-metals [--dry-run] [--force]
npx tsx scripts/media-bot.ts run      --root inbox --needs-dir needs [--industries metals,packaging] [--every 60] [--dry-run]
npx tsx scripts/media-bot.ts status
```

- **prepare** checks provenance, enhances each original with sharp (logos
  trimmed and squared, photos restored or upscaled, certificates downscaled
  only), asks the local vision model whether the image matches its role,
  rates its quality and looks for marketplace watermarks. Writes
  `media-manifest.prepared.json` with what is ready, and `prepare-report.json`
  with every held item and the reason.
- **push** uploads the prepared items in chunks and writes `push-result.json`.
  Items already imported are remembered and not sent again (`--force` to
  resend). Dry runs never mark anything as pushed.
- **run** refreshes the needs files, then prepares and pushes every folder
  that has not been fully pushed. Exits non-zero when any push failed.

| Env | Default |
| --- | --- |
| `SUPLYMATE_URL` | `https://suplymate.com` |
| `CRON_SECRET` | required, same value as on Vercel |
| `LOCAL_AI_BASE_URL` | `http://localhost:11434/v1` (Ollama) |
| `LOCAL_AI_VISION_MODEL` | `qwen2.5vl:3b` |
| `AI_CACHE_DATABASE_URL` | unset → JSON file (`MEDIA_BOT_CACHE_FILE`, else `.media-bot-cache.json` in the inbox) |
| `MEDIA_BOT_INBOX`, `MEDIA_BOT_NEEDS_DIR` | `/data/media/inbox`, `/data/media/needs` |
| `MEDIA_BOT_INDUSTRIES` | `all` |
| `MEDIA_BOT_AI=off` | skip local AI review |

`run` runs once unless `--every <minutes>` is given (docker compose passes
`--every $MEDIA_BOT_EVERY_MINUTES`; Kubernetes schedules single runs).

### Local AI and its own database

The vision model runs in [Ollama](https://ollama.com) on the bot machine:
free, and no image leaves the machine for review. `qwen2.5vl:3b` runs on CPU
with about 4 GB of RAM (roughly 30–40 s per image on 4 cores); with 12 GB or
more, or a GPU, `qwen2.5vl:7b` or `llama3.2-vision` review more accurately.
When Ollama is not reachable the worker continues without review and says so.

AI verdicts (keyed by image hash, model and prompt version) and push
fingerprints are stored in the bot's **own** Postgres, `AI_CACHE_DATABASE_URL`,
never Suplymate's `DATABASE_URL` (the worker refuses to start if they are the
same). An image is reviewed once; later runs reuse the verdict. Tables
(`media_bot_ai_results`, `media_bot_pushed`) are created automatically.

## Docker

```
cd deploy/media-bot
cp .env.example .env        # set CRON_SECRET and AI_CACHE_DB_PASSWORD
docker compose up -d        # Ollama + the bot's Postgres + the worker, every 60 min
docker compose run --rm media-bot status
docker compose run --rm media-bot run --dry-run
```

Drop batches into `deploy/media-bot/data/inbox/<folder>/`. The model is pulled
on first start and reused afterwards.

## Kubernetes

```
docker build -f deploy/media-bot/Dockerfile -t <registry>/suplymate/media-bot:<tag> .
docker push <registry>/suplymate/media-bot:<tag>
# set images[].newName / newTag in deploy/k8s/media-bot/kustomization.yaml

kubectl apply -f deploy/k8s/media-bot/namespace.yaml
kubectl -n suplymate-media-bot create secret generic media-bot-secrets \
  --from-literal=CRON_SECRET=... --from-literal=AI_CACHE_DB_PASSWORD=...
kubectl apply -k deploy/k8s/media-bot
```

This creates Ollama (with a 30 Gi model volume), the bot's Postgres
(StatefulSet), a 20 Gi `media-bot-data` volume for `inbox/` and `needs/`, and
a CronJob at minute 30 of every hour. The CronJob pulls the model only if it
is missing, runs as non-root with a read-only root filesystem, and never
overlaps runs. NetworkPolicies limit Ollama and the database to the worker
(they take effect on CNIs that enforce NetworkPolicy, e.g. Calico or Cilium).
Settings live in the `media-bot-config` ConfigMap. To run once by hand:

```
kubectl -n suplymate-media-bot create job media-bot-now --from=cronjob/media-bot
kubectl -n suplymate-media-bot logs -f job/media-bot-now -c media-bot
```

## Requirements on the Suplymate side

- `CRON_SECRET` set on Vercel (shared with the bots).
- `BLOB_READ_WRITE_TOKEN` (Vercel Blob). Without it pushes report `failed` with
  "no storage provider configured" and nothing is marked as pushed, so the
  bots retry on their next run.
- Supplier certificates need the supplier to exist in the database (static
  directory entries get logos and photos, but certificates are refused until
  the supplier is imported).
