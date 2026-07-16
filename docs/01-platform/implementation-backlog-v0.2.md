# Implementation Backlog v0.2

Date: 2026-07-15
Status: Approved

## Goal

Move from baseline verification to creator write model implementation readiness without mutating production, running DB migrations, or changing remote state.

## Completed In This Iteration

| Order | Task | Status | Output | Verification |
|---:|---|---|---|---|
| 1 | Inspect current creator/admin/API/schema structure | Complete | Current implementation facts in v0.2 docs | File inspection |
| 2 | Draft creator domain model | Complete | `docs/02-domains/creator-domain-v0.2.md` | Cross-check against schema/API |
| 3 | Draft creator API boundary | Complete | `docs/03-apis/creator-api-v0.2.md` | Cross-check against `api/creator.js` |
| 4 | Draft schema transition baseline | Complete | `docs/04-data/schema-v0.2.md` | Compatibility mapping documented |
| 5 | Draft static catalog import design | Complete | `docs/04-data/static-catalog-import-v0.2.md` | Baseline report referenced |

## Next Implementation Tasks

| Order | Task | Status | Output | Verification |
|---:|---|---|---|---|
| 1 | Add catalog import dry-run script | Complete | `scripts/import-static-catalog-to-db.js`, `api/_lib/catalog-import-service.js` | Dry-run reports no DB mutation |
| 2 | Add `import:catalog` npm script | Complete | `package.json` | Command runs in dry-run mode |
| 3 | Extract catalog import seed data from login side effect | Complete | `api/_lib/catalog-import-service.js`, `api/_lib/creator-content.js`, `scripts/_catalog-loader.js` | Module import smoke checks and build pass |
| 4 | Add publication review schema migration draft only | Complete | `docs/04-data/publication-review-migration.sql` | SQL review, not executed |
| 5 | Extract creator repository/read-model modules | Complete | `api/_lib/creator-repository.js`, `api/_lib/creator-read-model.js` | Build and API smoke import check |
| 6 | Add public snapshot generator dry-run | Complete | `scripts/generate-public-catalog.js`, `reports/public-catalog-snapshot-dry-run.json` | Generated candidate matches published baseline |
| 7 | Extract public snapshot service boundary | Complete | `api/_lib/public-catalog-snapshot.js`, `scripts/verify-public-catalog-boundary.js` | Boundary verification and build pass |
| 8 | Add generated public catalog artifact contract | Complete | `docs/04-data/public-catalog-artifact-v0.8.md`, `reports/public-catalog-artifact-dry-run.json` | Artifact payload is published-only, catalog-compatible, and baseline-matched |
| 9 | Add guarded generated artifact writer | Complete | `scripts/generate-public-catalog.js`, `scripts/verify-public-catalog-artifact.js`, `public/data/catalog.generated.js` | Explicit dry-run/write guard, artifact hash verification, and build ordering documented |
| 10 | Switch one non-production reader smoke path to generated artifact | Complete | `scripts/generate-static-pages.js`, `scripts/verify-public-catalog-runtime-smoke.js` | `npm run smoke:public-artifact-runtime` verifies generated artifact HTML and payload hash before replacing `/data/catalog.js` |
| 11 | Add browser-level public reader route smoke for generated artifact | Complete | `scripts/verify-public-catalog-browser-smoke.js`, `npm run smoke:public-artifact-browser` | Verify `assets/js/app.js` renders home, series, and episode routes against `/data/catalog.generated.js` in a browser-like runtime |
| 12 | Add guarded generated-artifact build mode contract | Complete | `scripts/build-public-catalog-generated.js`, `npm run build:public-artifact` | Verify generated artifact and route HTML are produced together without replacing default `npm run build` |
| 13 | Add generated-artifact release-readiness comparison | Complete | `scripts/verify-public-catalog-release-readiness.js`, `reports/public-catalog-release-readiness.json` | Compare default `/data/catalog.js` output and generated `/data/catalog.generated.js` output before any default runtime replacement |
| 14 | Add default-runtime replacement proposal and rollback plan | Complete | `docs/04-data/public-catalog-default-runtime-proposal-v0.14.md`, `npm run readiness:public-artifact-proposal` | Proposal readiness verifies the v0.13 report and rollback path while default build remains unchanged |
| 15 | Implement guarded default-runtime switch | Complete | `npm run build` emits `/data/catalog.generated.js` and writes `public/data/catalog.generated.js` behind artifact checks | `readiness:public-artifact-switch`, release readiness, browser smoke, artifact verification, asset validation, and rollback verification passed locally |
| 16 | Prepare release handoff for generated catalog default runtime | Complete | `docs/06-operations/public-catalog-default-runtime-release-handoff-v0.16.md`, `npm run readiness:public-artifact-handoff` | Handoff records commands, report inputs, rollback command, approval boundary, and local verification |
| 17 | Correct GitHub project identity and cleanup wrong handoff | Complete | `docs/06-operations/github-project-handoff-v0.17.md`, `npm run readiness:github-handoff` | GitHub `origin` documented as primary, `gitlab-preview` documented as secondary preview remote, and GitLab/worker00 artifacts removed |
| 18 | Prepare GitHub push/PR package for generated catalog default runtime | Pending | GitHub branch/PR request package | Prepare branch name, PR title/body, changed-file summary, validation results, and rollback note; do not push or create PR without separate approval |

## Guardrails

- Do not commit, push, create PRs, deploy, rotate secrets, or run production migrations without separate explicit approval.
- Keep public reader pages static-first.
- Keep `data/catalog.js` as migration input/generated output, not operational source of truth.
- Preserve current creator API behavior until a verification path exists.
