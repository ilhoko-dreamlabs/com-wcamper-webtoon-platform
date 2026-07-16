# Public Catalog Release Readiness v0.13

Date: 2026-07-15
Status: Approved local release-readiness comparison

## Goal

Compare the default public build and the generated-artifact public build side by side before approving any default runtime replacement.

## Command

| Item | Value |
|---|---|
| Release-readiness command | `npm run readiness:public-artifact` |
| Guard flag | `--release-readiness` |
| Default runtime script | `/data/catalog.js` |
| Generated runtime script | `/data/catalog.generated.js` |
| Report | `reports/public-catalog-release-readiness.json` |

## Comparison Contract

The command performs local-only work:

1. Run the default `npm run build`.
2. Copy `public/` to a temporary default-output directory.
3. Run `npm run build:public-artifact`.
4. Copy `public/` to a temporary generated-output directory.
5. Compare both outputs.
6. Allow only one generated-only file: `data/catalog.generated.js`.
7. Require every HTML file to match after normalizing `/data/catalog.generated.js` back to `/data/catalog.js`.
8. Require all shared non-HTML files to match exactly.
9. Verify the generated artifact payload hash and published baseline comparison.
10. Restore the default `npm run build` output.

## Guardrails

- The script refuses direct execution without `--release-readiness`.
- The command does not replace the default runtime script.
- The command does not deploy, push, migrate DB state, rotate secrets, or change production state.
- Temporary side-by-side build directories are removed after comparison.
- The final local `public/` output is restored to `/data/catalog.js`.

## Verification

Required local checks for this contract:

```bash
npm run readiness:public-artifact
npm run build:public-artifact
npm run verify:public-artifact
npm run smoke:public-artifact-runtime
npm run smoke:public-artifact-browser
npm run build
```

Expected readiness values:

| Metric | Expected |
|---|---:|
| HTML files compared | 30 |
| Shared non-HTML files compared | 81 |
| Allowed generated-only files | `data/catalog.generated.js` |
| Published series | 2 |
| Published episodes | 16 |
| Published images | 17 |

## Next Step

The next implementation step is to add a default-runtime replacement proposal document and rollback plan. The actual default runtime switch should remain gated until the proposal, readiness report, and rollback plan are reviewed.
