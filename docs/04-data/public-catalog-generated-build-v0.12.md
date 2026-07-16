# Public Catalog Generated Build v0.12

Date: 2026-07-15
Status: Approved local generated-artifact build mode contract

## Goal

Produce generated public catalog runtime HTML and `public/data/catalog.generated.js` together behind an explicit non-default command, without changing the default `npm run build` runtime path.

## Command

| Item | Value |
|---|---|
| Explicit generated build command | `npm run build:public-artifact` |
| Guard flag | `--generated-artifact-build` |
| Runtime script under test | `/data/catalog.generated.js` |
| Generated artifact | `public/data/catalog.generated.js` |
| Build report | `reports/public-catalog-generated-build.json` |
| Default build command | `npm run build` |
| Default runtime script | `/data/catalog.js` |

## Build Contract

The generated build command performs local-only work:

1. Run `scripts/generate-static-pages.js` with `WCAMPER_CATALOG_SCRIPT_PATH=/data/catalog.generated.js`.
2. Run `scripts/generate-public-catalog.js --dry-run --write-artifact` after `public/` is recreated.
3. Load `public/data/catalog.generated.js`.
4. Compare its payload hash with the expected public artifact payload.
5. Verify the generated artifact matches the published static catalog baseline.
6. Verify representative generated route HTML references `/data/catalog.generated.js`.
7. Write `reports/public-catalog-generated-build.json`.

## Guardrails

- The script refuses direct execution without `--generated-artifact-build`.
- The command is not the default build.
- The command does not deploy, push, migrate DB state, rotate secrets, or replace production runtime behavior.
- The default `npm run build` must still emit `/data/catalog.js`.
- `public/data/catalog.generated.js` remains a generated candidate artifact, not source data.

## Verification

Required local checks for this contract:

```bash
npm run build:public-artifact
npm run verify:public-artifact
npm run smoke:public-artifact-runtime
npm run smoke:public-artifact-browser
npm run build
```

The final `npm run build` restores the default local `public/` output to `/data/catalog.js`.

## Next Step

The next implementation step is to add generated-artifact release-readiness checks that compare the default build and generated build outputs side by side before any default runtime replacement is approved.
