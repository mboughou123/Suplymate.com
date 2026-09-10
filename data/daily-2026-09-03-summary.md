# Daily 2026-09-03 — overnight catalog push (products)

**Generated:** 2026-09-02 22:21 PT (UTC `2026-09-03T05:21:59Z`)

Morning PT pack (evening 2 Sep 2026 work). New SKUs only vs phase-1 product-media + gaps-fill + daily/2026-09-02.

## Counts

| Metric | Count |
|---|---:|
| **Products (NEW)** | **70** |
| Distinct mills (SKU owners) | 37 |
| New mills added this pack | 0 |
| Public unit_price | 0 |
| RFQ / unit_price null | 70 |
| With real local photos | 70 |
| needs_ai_generate | 0 |
| Local product image files | 159 |

### Products by category

| Category | Count |
|---|---:|
| Tube & Pipes | 18 |
| Packaging | 18 |
| Industrial Parts | 16 |
| Steel & Metals | 8 |
| Cables & Electrical | 6 |
| Construction | 4 |
| **Total** | **70** |

## Bias / fill notes

- Bias categories (Tube & Pipes, Packaging, Industrial Parts) filled first from **empty 2026-09-02 mills** (Youfa, Jiuli, YUTO, Greif, Ball, Tetra Pak, SKF, LYC, Shakti) then thin mills (Tenaris, Vallourec, Huhtamaki, Amcor, Mondi, Timken, WILO, KSB, NSK, International Paper, Smurfit Westrock).
- Remaining empty 2026-09-02 mills in steel/cables/construction also received first SKUs (POSCO, BlueScope, Outokumpu, SAIL, Prysmian, Far East, Hengtong, Oman Cables, Interarch, Shree, JSW Cement, Gerdau/Nippon/ArcelorMittal extras).
- No new mill import (`suppliers.json` not written). Website can attach SKUs to existing phase-1 + 2026-09-02 mill records.
- **Never invented prices.** All 70 SKUs are mill RFQ (`unit_price: null`).
- `needs_ai_generate` is true only when no real local photo could be saved.
- Post-pass: YUTO locals reordered to mill packaging product photography; Ball campus/wind-turbine mill photos demoted vs aluminum-can product photo.

## AI-generate list

None — every SKU has at least one real local photo.

## Dropped for quality (no real photo)

- Ball Aluminum Cups and Specialty Aluminum Packaging
- Tetra Pak Tetra Recart Retortable Carton Packages
- SKF Tapered Roller Bearings
- LS Cable & System Power and Submarine Cables
- Sika Waterproofing Membranes and Coatings

## Paths

| Artifact | Path |
|---|---|
| products.json | `/workspace/suppliers-phase1/daily/2026-09-03/products.json` |
| products.md | `/workspace/suppliers-phase1/daily/2026-09-03/products.md` |
| summary.md | `/workspace/suppliers-phase1/daily/2026-09-03/summary.md` |
| Product photos | `/workspace/suppliers-phase1/daily/2026-09-03/images/products/` |
| Dedup sources | phase-1 `product-media/*-products.json`, `product-gaps-fill*.json`, `daily/2026-09-02/products.json` |

