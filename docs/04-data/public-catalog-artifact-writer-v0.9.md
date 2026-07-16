# Public Catalog Artifact Writer v0.9

Date: 2026-07-15
Status: Approved local candidate writer

## Purpose

Add a local-only generated JS artifact writer for the public catalog candidate defined in v0.8.

The browser runtime remains on `/data/catalog.js`. This phase writes `public/data/catalog.generated.js` only when the explicit local command is used.

## Commands

| Command | Behavior |
|---|---|
| `npm run snapshot:catalog` | Writes dry-run reports only |
| `npm run artifact:catalog` | Writes dry-run reports and `public/data/catalog.generated.js` |
| `npm run verify:public-artifact` | Loads `public/data/catalog.generated.js` and verifies its payload hash against the generated artifact report model |

## Write Guard

- `scripts/generate-public-catalog.js` still refuses to run without `--dry-run`.
- `--write-artifact` is required before any local JS artifact file is written.
- The writer stops before file output if published baseline comparison or artifact invariants fail.
- The generated artifact is a local candidate, not a production deployment artifact.

## Build Interaction

`npm run build` recreates `public/` and copies `data/` into `public/data/`. Because of that, `public/data/catalog.generated.js` is expected to be regenerated after a build when artifact verification is needed.

## Verification

Expected local sequence:

```bash
npm run build
npm run artifact:catalog
npm run verify:public-artifact
```

Expected artifact values:

| Metric | Value |
|---|---:|
| Published series | 2 |
| Published episodes | 16 |
| Image rows | 17 |
| Baseline match | yes |

## Non-Goals

- Do not replace `<script src="/data/catalog.js">`.
- Do not deploy `public/data/catalog.generated.js`.
- Do not connect to production DB or execute a DB-backed export.
