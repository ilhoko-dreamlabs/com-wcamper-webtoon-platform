# Public Catalog Browser Smoke v0.11

Date: 2026-07-15
Status: Approved local browser-like smoke path

## Goal

Verify that the public reader app can execute against the generated public catalog artifact before changing the default runtime catalog script.

## Command

| Item | Value |
|---|---|
| Repeatable command | `npm run smoke:public-artifact-browser` |
| Runtime script under test | `/data/catalog.generated.js` |
| Default runtime script | `/data/catalog.js` |
| Browser app under test | `assets/js/app.js` |

## Smoke Scope

The command performs a local-only browser-like smoke:

1. Generate `public/data/catalog.generated.js` through the guarded dry-run artifact writer.
2. Generate static pages with `WCAMPER_CATALOG_SCRIPT_PATH=/data/catalog.generated.js`.
3. Regenerate the artifact after `public/` is recreated.
4. Verify generated artifact payload hash and published baseline match.
5. Execute `public/data/catalog.generated.js` and `assets/js/app.js` in a Node `vm` context with a small DOM shim.
6. Verify representative public reader routes render:
   - home `/`
   - series `/@{authorId}/works/{seriesId}`
   - episode `/@{authorId}/works/{seriesId}/episodes/{number}`
7. Verify the generated static HTML for those routes references `/data/catalog.generated.js`.

## Non-Goals

- Do not change the default browser runtime path.
- Do not deploy the generated artifact.
- Do not add a browser automation dependency.
- Do not execute DB migrations or read from production DB.
- Do not treat `public/data/catalog.generated.js` as authoritative source data.

## Next Step

The next implementation step is to add a guarded build mode that can include the generated artifact and generated runtime path as an explicit non-default build contract, then keep default `npm run build` on `/data/catalog.js` until release approval.
