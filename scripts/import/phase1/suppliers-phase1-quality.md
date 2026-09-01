# Suplymate phase-1 supplier pack — quality note

**Total:** 59 manufacturers (Tata Steel Construction duplicate dropped; Tata kept under Steel & Metals only)
**Skipped as traders/unverified (sum of category logs):** ~12
**Import CSV:** `suppliers-phase1-merged-60.csv` (matches `scripts/import/examples/suppliers-sample.csv` + `photoUrls`)
**JSON:** `suppliers-phase1-merged-60.json`

## Categories
### Tube & Pipes
- File: `tube-and-pipes.json` / `tube-and-pipes.csv`
- Kept: 10
- Skipped (from quality log): 12
- Empty photo rows: 0 []
### Steel & Metals
- File: `steel-and-metals.json` / `steel-and-metals.csv`
- Kept: 10
- Skipped (from quality log): 0
- Empty photo rows: 0 []
### Cables & Electrical
- File: `cables-and-electrical.json` / `cables-and-electrical.csv`
- Kept: 10
- Skipped (from quality log): 0
- Empty photo rows: 0 (Luxing factory photos filled)
### Construction
- File: `construction.json` / `construction.csv`
- Kept: 9 (Tata Steel dropped as duplicate of Steel & Metals)
- Skipped (from quality log): 0
- Empty photo rows: 0 []
### Industrial Parts
- File: `industrial-parts.json` / `industrial-parts.csv`
- Kept: 10
- Skipped (from quality log): 0
- Empty photo rows: 0 (Kirloskar product photos filled)
### Packaging
- File: `packaging.json` / `packaging.csv`
- Kept: 10
- Skipped (from quality log): 0
- Empty photo rows: 0 []


## Seeded from homepage band
- Foliflex → Cables & Electrical
- Al Gharbia + AJ Steel → Tube & Pipes
- EMSTEEL + Ferrite → Steel & Metals

## Known media caveats
- AJ Steel (Tube): logo-only historically; Image Enhancer skipped
- APL Apollo (Tube): product/jobsite photos only (no public mill floor)
- Jingye (Steel): Made-in-China company image after CDN 567
- Construction photos filled 2026-08-31 (UltraTech kept via Wikimedia)

## Tata Steel slug
- Kept: Steel & Metals (Jamshedpur)
- Dropped: Construction duplicate (Tiscon rebar stays in Steel products)

## Next
Image Enhancer: remaining media. Head of Website: PR-import after enhanced JPGs — no deploy.
