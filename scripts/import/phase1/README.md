# Phase-1 supplier pack (59 manufacturers)

Committed for review only. Do not merge to production without Amine yes.

## What is in this PR

- Import-ready CSV: scripts/import/examples/suppliers-phase1.csv (59 rows)
- Enhanced mill/factory JPGs: public/images/suppliers/phase1/<category>/
- Image mapping: scripts/import/phase1/IMAGE-MAPPING.md
- CSV parser: photoUrls alias plus Tube and Pipes mapped to Tubes and Pipes

## Apply the import (staging / preview DB only)

From the repo root, after Prisma is available, dry-run then write pending suppliers using the CSV importer.
File path: scripts/import/examples/suppliers-phase1.csv
Convenience script name: suppliers:import:phase1
Review pending rows at /admin/import-suppliers. Never auto-verified.
Cache fallback: scripts/import/cache/pending-suppliers.json

## Gaps

See IMAGE-MAPPING.md. Gaps left empty: AJ Steel (Tube), Tong Ming (Industrial Parts), Magicrete (no enhanced mill stills).

## Notes

- Local gallery paths are used when enhanced JPGs exist; remote photo URLs are fallback only.
- logoUrl stays on the original remote logo/source image (this pack is mill/factory stills, not logos).
- imageUrl (banner/hero) is the first preferred local still, or the first remote photo when none exists.
- Preferred stills: Al Gharbia production gallery first; APL Apollo Raipur-1 hero; Jingye Pingshan only.
