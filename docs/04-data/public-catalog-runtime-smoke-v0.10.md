# Public Catalog Runtime Smoke v0.10

Date: 2026-07-15
Status: Approved local smoke path

## Goal

Verify that public reader HTML can load the generated public catalog artifact before replacing the default runtime catalog path.

## Runtime Toggle

| Item | Value |
|---|---|
| Default runtime script | `/data/catalog.js` |
| Smoke runtime script | `/data/catalog.generated.js` |
| Toggle | `WCAMPER_CATALOG_SCRIPT_PATH=/data/catalog.generated.js node scripts/generate-static-pages.js` |
| Repeatable command | `npm run smoke:public-artifact-runtime` |

The default `npm run build` path still emits `/data/catalog.js`. The generated artifact path is used only by the explicit smoke command.

## Smoke Sequence

`npm run smoke:public-artifact-runtime` performs this local-only sequence:

1. Generate `public/data/catalog.generated.js` through the guarded dry-run artifact writer.
2. Compare the artifact payload hash with the expected published-only artifact payload.
3. Generate static pages with `WCAMPER_CATALOG_SCRIPT_PATH=/data/catalog.generated.js`.
4. Regenerate `public/data/catalog.generated.js` because the static build recreates `public/`.
5. Confirm `public/index.html` references `/data/catalog.generated.js`.
6. Confirm the regenerated artifact still matches the expected payload hash and published baseline.

## Non-Goals

- Do not change the default browser runtime path.
- Do not deploy the generated artifact.
- Do not execute a DB migration or load data from production DB.
- Do not treat `public/data/catalog.generated.js` as the authoritative source.

## Next Step

The next implementation step is a public reader route smoke test that executes the browser app against `/data/catalog.generated.js` and verifies a representative home, series, and episode route.
