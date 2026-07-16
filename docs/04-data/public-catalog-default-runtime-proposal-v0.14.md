# Public Catalog Default Runtime Proposal v0.14

Date: 2026-07-15
Status: Proposed, not applied

## Goal

Prepare the default runtime replacement from `/data/catalog.js` to `/data/catalog.generated.js` after the generated public catalog artifact has passed local readiness checks.

This document is a proposal and rollback plan only. It does not change `npm run build`, production deploys, database state, remote branches, or secrets.

## Current Evidence

| Evidence | Current value |
|---|---|
| Readiness command | `npm run readiness:public-artifact` |
| Readiness report | `reports/public-catalog-release-readiness.json` |
| Default runtime script | `/data/catalog.js` |
| Proposed runtime script | `/data/catalog.generated.js` |
| Generated artifact path | `public/data/catalog.generated.js` |
| Artifact version | `public-catalog-artifact.v0.8` |
| Payload hash | `7ffb97dd5794dd7abba055bfe1940c0670e029b7b3453483068019e91ec584d4` |
| Published series | 2 |
| Published episodes | 16 |
| Published images | 17 |
| HTML files compared | 30 |
| Shared non-HTML files compared | 81 |
| Allowed generated-only file | `data/catalog.generated.js` |

## Proposal

After review approval, change the default public build so generated static HTML references `/data/catalog.generated.js` and the generated artifact is emitted as part of the default build output.

The implementation should reuse the existing generated artifact writer and readiness checks instead of introducing a second artifact path or a second runtime global.

## Required Approval Gates

| Gate | Requirement |
|---|---|
| Local readiness | `npm run readiness:public-artifact` passes with only `data/catalog.generated.js` as generated-only |
| Proposal validation | `npm run readiness:public-artifact-proposal` passes |
| Rollback review | Rollback checklist in this document is reviewed before the switch |
| Release approval | Separate approval is given before remote push, PR creation, production deploy, or default runtime replacement |

## Proposed Implementation Sequence

1. Change the default `npm run build` path to emit `/data/catalog.generated.js`.
2. Ensure `public/data/catalog.generated.js` is generated during the default build.
3. Keep `/data/catalog.js` available until a separate cleanup decision removes the compatibility artifact.
4. Run the full validation loop.
5. Compare generated output with the current readiness report.
6. Stop for release approval before push, PR, deploy, or production action.

## Rollback Checklist

| Step | Action | Verification |
|---:|---|---|
| 1 | Restore the default runtime script to `/data/catalog.js` | `public/index.html` references `/data/catalog.js` after `npm run build` |
| 2 | Remove generated artifact emission from the default build path | `public/data/catalog.generated.js` is absent after `npm run build` |
| 3 | Keep guarded generated artifact commands intact | `npm run build:public-artifact` still produces generated runtime output |
| 4 | Re-run reader checks | `npm run verify:public-catalog`, `npm run validate:assets`, and `npm run build` pass |
| 5 | Re-run release-readiness if the generated path remains a candidate | `npm run readiness:public-artifact` passes or records the failing reason |

## Post-Switch Validation Required

The future switch is not complete until these pass in the same change:

```bash
npm run readiness:public-artifact
npm run readiness:public-artifact-proposal
npm run verify:public-artifact
npm run smoke:public-artifact-runtime
npm run smoke:public-artifact-browser
npm run verify:public-catalog
npm run baseline:catalog
npm run import:catalog
npm run snapshot:catalog
npm run artifact:catalog
npm run validate:assets
npm run build
```

## Non-Goals

- No default runtime replacement in v0.14.
- No production deployment.
- No remote push or PR creation.
- No DB migration.
- No secret or environment variable change.
- No removal of `/data/catalog.js`.

## Next Step

The next implementation step is a guarded default-runtime switch patch that changes the default build behavior only after this proposal and rollback plan are reviewed.
