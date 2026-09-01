# Phase-1 supplier import (59 factories)

Do not deploy. Stage CSV/JSON + local factory images for a Cursor cloud agent import PR.

## Import

    npm run suppliers:import:csv -- --file=scripts/import/phase1/suppliers-phase1-import.csv --dry-run
    npm run suppliers:import:csv -- --file=scripts/import/phase1/suppliers-phase1-import.csv

## Required patch in src/lib/csv.ts HEADER_ALIASES

Add these aliases so photoUrls maps to images:

    photourls: "images",
    photos: "images",

(canonicalHeader strips case/_/-, so photoUrls -> photourls.)

CSV columns match canonical (18 cols). Category Tube & Pipes normalized to Tubes & Pipes.
photoUrls use local /images/suppliers/phase1/<slug>/<file>.jpg when available.
Remote photoUrls kept only when no local media exists.

Coverage: 56/59 suppliers have local images.
Gaps: AJ Steel (empty); Tong Ming (logo-only backup); Magicrete (no plant still).
Chaoda now has 4 staged factory aerials (chaoda-1..4.jpg).

Image slugs: steel-metals, tube-pipes, construction, packaging, cables-electrical, industrial-parts.
Box zip: /workspace/suppliers-phase1/import/phase1-images.zip

Open PR against main. No production deploy.
