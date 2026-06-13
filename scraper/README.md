# Suplymate — Supplier Research & Scraping System

A polite, compliance-first system to **discover, rank, and serve verified suppliers**
across Suplymate's industry categories. It scrapes *public* directory/marketplace
pages (where their robots.txt + ToS allow), normalizes the data, scores each
supplier, stores everything in a database, and exposes a **FastAPI** endpoint your
Next.js frontend can query.

## ⚠️ Read this first — legal & ethical use

Most large marketplaces (**Alibaba, Amazon Business, Made-in-China, IndiaMART,
Global Sources, Faire, Etsy**) **prohibit scraping in their Terms of Service** and
deploy anti-bot protection. This system is built to **respect** those boundaries:

- ✅ Checks `robots.txt` (path permission **and** crawl-delay) before every request
- ✅ Rate-limits with delays + jitter; identifies itself via a real User-Agent
- ✅ Stores the **source URL** for every record so data is auditable
- ❌ Never logs in, solves CAPTCHAs, or bypasses anti-bot systems
- ❌ Never collects private/personal data — only publicly listed business info

> For reliable, ToS-clean access to the big marketplaces, use their **official
> APIs / partner programs** (e.g. Alibaba Open Platform, IndiaMART API). Add those
> as new adapters — the architecture is built for it.

## Architecture

```
scraper/
├── config.py                 # env-driven settings (delays, UA, robots toggle)
├── main.py                   # CLI: init-db | sources | scrape | top | serve
├── requirements.txt
├── .env.example
└── app/
    ├── db.py                 # SQLAlchemy engine/session (Postgres or SQLite)
    ├── models.py             # ScrapedSupplier, ScrapeRun (audit log)
    ├── record.py             # SupplierRecord (normalized, + dedupe key)
    ├── categories.py         # category taxonomy + search keywords
    ├── ranking.py            # 0–100 supplier scoring function
    ├── pipeline.py           # run source -> normalize -> dedupe -> score -> upsert
    ├── schemas.py            # Pydantic API models
    ├── api.py                # FastAPI routes (filters + pagination)
    └── scrapers/
        ├── base.py           # BaseScraper: robots gate, throttling, fetch/render
        ├── sample.py         # fixture source (runs offline, no ToS concerns)
        ├── thomasnet.py      # real example adapter (robots-gated)
        └── data/sample_suppliers.json
```

## Data collected per supplier

Company name · website · country · category · products · MOQ · price range ·
shipping countries · rating · review count · verification status · years in
business · certifications · public contact · marketplace profile link ·
**source URL** (always) · computed **score**.

## Ranking

`app/ranking.py` produces a 0–100 score (higher = better):

| Signal              | Max pts | Notes                                  |
| ------------------- | ------- | -------------------------------------- |
| Verified supplier   | 25      | hard trust signal                      |
| Rating (of 5)       | 22      | linear, 5.0★ = full marks              |
| Review count        | 14      | log scale (~1000 reviews ≈ full)       |
| Years in business   | 14      | capped at 20 yrs                       |
| Certifications      | 10      | up to 3 distinct certs                 |
| Fast shipping       | 8       | ≤7 days best                           |
| Low MOQ             | 7       | lower minimum order = higher           |

Missing data contributes 0 (never penalized).

## Setup

```bash
cd scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Optional: only if you'll use Playwright-rendered adapters
playwright install chromium

cp .env.example .env   # edit if you want Postgres instead of local SQLite
```

By default it uses a local **SQLite** file (`suplymate_scraper.db`) so you can try
it instantly. To use your Neon Postgres, set `SCRAPER_DATABASE_URL` in `.env`
(use a **separate** database/schema from the website's tables).

## Usage

```bash
python main.py init-db                                   # create tables
python main.py sources                                   # list adapters
python main.py scrape --source sample                    # load fixture data (offline)
python main.py scrape --source thomasnet --category metal-steel --limit 30
python main.py top --category metal-steel --limit 10     # show ranked results
python main.py serve --reload                            # start the API on :8000
```

## API

Base URL: `http://localhost:8000`

| Method | Path                  | Description                                   |
| ------ | --------------------- | --------------------------------------------- |
| GET    | `/health`             | health check                                  |
| GET    | `/categories`         | categories + supplier counts                  |
| GET    | `/suppliers`          | filter & rank suppliers (see params)          |
| GET    | `/suppliers/{id}`     | one supplier                                  |

**`/suppliers` query params:** `category`, `country`, `min_rating`, `max_price`,
`verified`, `source`, `sort` (`score|rating|reviews|name`), `limit`, `offset`.

Example:

```bash
curl "http://localhost:8000/suppliers?category=metal-steel&verified=true&min_rating=4&sort=score&limit=10"
```

Interactive docs (Swagger UI): `http://localhost:8000/docs`.

## Connecting to the Suplymate website

The Next.js frontend can call this API directly (CORS is pre-allowed for
`localhost:3000` and `suplymate.com`). A typical flow:

1. Run scrapes on a schedule (cron / a worker) to keep `scraped_suppliers` fresh.
2. Frontend fetches `/suppliers?category=...&verified=true&sort=score` to populate
   the Suppliers page, already ranked.

(If you'd rather store these in the website's own Prisma `Supplier` table, we can
add a small sync step + extend the Prisma schema with rating/reviews/verification.)

## Adding a new source

1. Create `app/scrapers/yoursite.py` with a class extending `BaseScraper`.
2. Implement `scrape(categories, limit)` yielding `SupplierRecord`s — use
   `self.get(url)` (static) or `self.render(url)` (JS). robots.txt + throttling
   are handled for you.
3. Register it in `app/scrapers/__init__.py`.
```
