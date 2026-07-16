# Public Catalog Snapshot Boundary v0.7

Date: 2026-07-15
Status: Approved local implementation baseline

## Purpose

Separate public reader catalog generation logic from ad hoc script code so build, dry-run snapshot generation, and future DB-backed snapshot generation share one boundary.

## Current Boundary

| Module | Role |
|---|---|
| `api/_lib/public-catalog-snapshot.js` | Builds published-only snapshot reports, compares them with baseline, and exposes the public catalog build loader |
| `scripts/generate-public-catalog.js` | CLI wrapper for dry-run snapshot report generation |
| `scripts/generate-static-pages.js` | Static page generator; now loads catalog through `loadPublicCatalogForBuild` |
| `scripts/verify-public-catalog-boundary.js` | Repeatable verification that the boundary is read-only and matches the published baseline |

## Source Rules

- Current local source remains `data/catalog.js` until a DB-backed snapshot export is approved.
- Public snapshot rows include only `publicationStatus = PUBLISHED` series and episodes.
- The boundary must report `mutationPerformed: false` for all local dry-run and build paths.
- Public static build may read the current catalog through the boundary, but must not write a generated catalog artifact without separate approval.

## Verification

```bash
npm run verify:public-catalog
npm run snapshot:catalog
npm run build
```

Expected public snapshot counts:

| Metric | Value |
|---|---:|
| Published series | 2 |
| Published episodes | 16 |
| Image rows | 17 |

## Next Step

After production DB migration is separately approved and executed, replace the `loadPublicCatalogForBuild` source adapter with a generated public catalog artifact or DB-exported snapshot while preserving the same verification command.
