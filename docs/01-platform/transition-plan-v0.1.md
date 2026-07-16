# Platform Transition Plan v0.1

Date: 2026-07-15
Status: Approved

## Executive Summary

The current confusion comes from extending a static MVP into an operating platform without first changing the source of truth. The approved direction is to make Webtoon DB/API the operational source, keep public reader pages generated and static-first, and migrate the current public catalog into creator-owned storage through repeatable scripts.

## Approved Plan Table

| Phase | Objective | Approval | Decision | Recommendation | Deliverables | Verification |
|---:|---|---|---|---|---|---|
| 0 | Freeze baseline | Approved | Treat current public catalog as migration input, not future authority | Generate catalog and asset baseline before code refactor | `reports/static-catalog-baseline.json`, asset integrity script | Count series, episodes, panels, images; verify file paths |
| 1 | Stabilize documentation context | Approved | Add indexed hierarchy before moving documents | Keep old docs in place and classify them | `docs/00-index.md`, `docs/01-platform/*` | Docs exist and link to current authority |
| 2 | Finalize domain/data model | Approved | Separate creator production state and publication state | Add `draft_status`, `publication_status`, assets, snapshots, reviews | `docs/04-data/schema.md`, migration SQL draft | Schema review and backwards compatibility check |
| 3 | Design static catalog import | Approved | Import `data/catalog.js` into creator-owned DB rows | Make import idempotent and repeatable | `scripts/import-static-catalog-to-db.js`, import doc | Re-run import without duplicates; compare counts |
| 4 | Split API responsibilities | Approved | Stop concentrating auth, ownership, content, and seed logic in one module | Extract service/repository boundaries before route churn | auth adapter, creator repository, asset service, publication service | Build passes; API smoke tests pass |
| 5 | Generate published snapshot | Approved | Public catalog is generated from DB `PUBLISHED` rows | Keep static public performance and SEO | `scripts/generate-public-catalog.js`, snapshot doc | Generated catalog matches approved public data |
| 6 | Convert screens to correct read models | Approved | Public reads snapshot; creator/admin read DB/API | Avoid one API serving every workflow | Frontend domain docs and implementation changes | Public, creator, admin, mypage smoke tests |
| 7 | Operational readiness | Approved | No production mutation without explicit approval | Gate deploy, DB migration, and external changes | readiness, rollback, validation reports | Build, integrity, auth, admin, creator checks complete |

## Decision Table

| Topic | Approved decision | Rationale |
|---|---|---|
| Platform identity | Two-sided content platform with operator core | Explains creator supply, reader demand, and operational mediation |
| Source of truth | Webtoon DB/API | Enables ownership, review, publication, and audit |
| Public reader model | Published snapshot + static/CDN assets | Preserves speed, SEO, and DB-failure isolation |
| Existing `data/catalog.js` | Migration input and generated output | Prevents static MVP data from competing with DB |
| Creator role | Supplier with workspace, no direct publish at first | Keeps quality, rights, and policy control |
| Operator role | Approval, review, publication, rollback, audit | Required for operable platform |
| Reader role | Demand side with reading and feedback signals | Enables subscription, preference, and scoring features |
| API structure | Thin routes, separated services/repositories | Reduces mixed responsibilities and improves testability |
| Assets | Metadata in DB, binary in static/object storage | Keeps operational traceability and public performance |
| Events | Aggregate high-volume reader events | Controls storage and query cost |

## Execution Loop

Every implementation phase follows this loop:

1. Confirm current authority from `docs/00-index.md`.
2. Implement the smallest phase deliverable.
3. Record changed files and decisions.
4. Run local verification that is available in the repository.
5. Update `docs/06-operations/worklog-v0.1.md` and `docs/06-operations/validation-v0.1.md`.
6. Stop before production deploy, remote push, DB migration, secret rotation, or external state changes unless explicitly approved.

## First Implementation Backlog

| Order | Task | Status | Output | Blocked by |
|---:|---|---|---|---|
| 1 | Create static catalog baseline report | Complete | `reports/static-catalog-baseline.json` | None |
| 2 | Add static asset integrity validator | Complete | `scripts/validate-static-assets.js` | None |
| 3 | Draft data schema transition doc | Pending | `docs/04-data/schema.md` | None |
| 4 | Draft static catalog import doc | Pending | `docs/04-data/static-catalog-import.md` | Baseline report |
| 5 | Implement idempotent import script dry-run mode | Pending | `scripts/import-static-catalog-to-db.js` | Schema decisions |
| 6 | Extract API service boundaries | Pending | `api/_lib/*` | Current API inspection |
| 7 | Add public snapshot generator dry-run | Pending | `scripts/generate-public-catalog.js` | Import mapping |

## v0.2 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 3 | Draft data schema transition doc | Complete | `docs/04-data/schema-v0.2.md` | Runtime DB migration not executed |
| 4 | Draft static catalog import doc | Complete | `docs/04-data/static-catalog-import-v0.2.md` | Uses baseline report from phase 0 |
| 6 | Extract API service boundaries | Design complete | `docs/03-apis/creator-api-v0.2.md` | Code extraction remains pending |

## v0.3 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 5 | Implement idempotent static catalog import dry-run mode | Complete | `api/_lib/catalog-import-service.js`, `scripts/import-static-catalog-to-db.js`, `reports/static-catalog-import-dry-run.json` | No DB connection or mutation performed |
| 2 | Add `import:catalog` npm script | Complete | `package.json` | Runs dry-run mode by default |
| 4 | Add publication review schema migration draft only | Complete | `docs/04-data/publication-review-migration.sql` | Review-only SQL, not executed |

## v0.4 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 3 | Extract catalog import seed data from login side effect | Complete | `api/_lib/creator-content.js`, `api/_lib/catalog-import-service.js` | The seed still runs only through the existing approved login path, but duplicated seed data moved to the shared catalog import boundary |
| 3.1 | Reuse static catalog loader across scripts and API import service | Complete | `scripts/_catalog-loader.js`, `api/_lib/catalog-import-service.js` | `data/catalog.js` remains the migration input for this phase |
| 3.2 | Add idempotent seed upsert helper | Complete | `upsertStaticCatalogSeed` | Local code path only; no production DB call was executed |

Next coding task: extract creator repository/read-model modules from `api/_lib/creator-content.js` while preserving current creator API behavior.

## v0.5 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 6.1 | Extract creator read-model serializers | Complete | `api/_lib/creator-read-model.js` | Response shapes and workspace grouping moved out of `creator-content` |
| 6.2 | Extract creator repository read queries | Complete | `api/_lib/creator-repository.js` | SELECT SQL helpers moved behind repository functions |
| 6.3 | Preserve route-facing creator content API | Complete | `api/_lib/creator-content.js` | Existing exported functions remain available to `api/creator.js` |

Next coding task: add public snapshot generator dry-run in `scripts/generate-public-catalog.js` and compare it with the published static baseline.

## v0.6 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 7 | Add public snapshot generator dry-run | Complete | `scripts/generate-public-catalog.js` | Refuses to run without `--dry-run` and does not write public catalog files |
| 7.1 | Add repeatable snapshot command | Complete | `npm run snapshot:catalog` | Generates `reports/public-catalog-snapshot-dry-run.json` |
| 7.2 | Compare against published baseline | Complete | Snapshot dry-run report | Published series, episode, and image counts match the approved static baseline |

Next coding task: introduce the first public snapshot service boundary or convert one public reader path to consume the generated snapshot candidate instead of direct `data/catalog.js`.

## v0.7 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 8 | Introduce public snapshot service boundary | Complete | `api/_lib/public-catalog-snapshot.js` | Snapshot report and baseline comparison logic moved out of the CLI |
| 8.1 | Connect public build loader to boundary | Complete | `scripts/generate-static-pages.js` | Static page generation now uses `loadPublicCatalogForBuild` instead of direct VM catalog loading |
| 8.2 | Add boundary verification command | Complete | `scripts/verify-public-catalog-boundary.js`, `npm run verify:public-catalog` | Confirms published counts match baseline and no mutation is reported |

Next coding task: add a generated public catalog artifact contract, still dry-run/local only, so the browser runtime can move from `/data/catalog.js` toward a generated public snapshot file.

## v0.8 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 9 | Add generated public catalog artifact contract | Complete | `docs/04-data/public-catalog-artifact-v0.8.md` | Defines artifact version, runtime global, candidate path, payload rules, and non-goals |
| 9.1 | Generate artifact dry-run report | Complete | `reports/public-catalog-artifact-dry-run.json` | Written by `npm run snapshot:catalog`; no public runtime file is published |
| 9.2 | Verify published-only catalog-compatible payload | Complete | `api/_lib/public-catalog-snapshot.js` | Artifact payload keeps current browser catalog shape while filtering unpublished series and episodes |

Next coding task: add a local-only generated JS artifact writer behind an explicit dry-run/apply guard, then switch one non-production build path to load the generated artifact candidate for smoke verification.

## v0.9 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 9.3 | Add guarded local JS artifact writer | Complete | `npm run artifact:catalog`, `public/data/catalog.generated.js` | Requires `--dry-run --write-artifact`; writes only after baseline and invariant checks pass |
| 9.4 | Add generated artifact verifier | Complete | `scripts/verify-public-catalog-artifact.js`, `npm run verify:public-artifact` | Loads the generated JS artifact and compares its payload hash with the expected artifact payload |
| 9.5 | Document writer/build ordering | Complete | `docs/04-data/public-catalog-artifact-writer-v0.9.md` | `npm run build` recreates `public/`, so artifact verification regenerates the candidate after build |

Next coding task: add a non-production public reader smoke path or build toggle that loads `/data/catalog.generated.js` for verification, while keeping the default browser runtime on `/data/catalog.js`.

## v0.10 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 10 | Add generated artifact runtime smoke toggle | Complete | `WCAMPER_CATALOG_SCRIPT_PATH` in `scripts/generate-static-pages.js` | Default build still emits `/data/catalog.js` |
| 10.1 | Add repeatable runtime smoke command | Complete | `scripts/verify-public-catalog-runtime-smoke.js`, `npm run smoke:public-artifact-runtime` | Builds smoke HTML against `/data/catalog.generated.js`, regenerates the artifact after `public/` rebuild, and verifies payload hash |
| 10.2 | Document smoke path | Complete | `docs/04-data/public-catalog-runtime-smoke-v0.10.md` | Records non-production scope and non-goals |

Next coding task: add a browser-level public reader route smoke test for generated artifact runtime using representative home, series, and episode routes.

## v0.11 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 11 | Add browser-like generated artifact route smoke | Complete | `scripts/verify-public-catalog-browser-smoke.js`, `npm run smoke:public-artifact-browser` | Executes `assets/js/app.js` with `public/data/catalog.generated.js` in a Node `vm` DOM shim |
| 11.1 | Verify representative public reader routes | Complete | Home, series, and episode smoke assertions | Verifies route title/body content and generated script references |
| 11.2 | Document browser smoke path | Complete | `docs/04-data/public-catalog-browser-smoke-v0.11.md` | Records smoke scope, non-goals, and next build-contract step |

Next coding task: add a guarded generated-artifact build mode contract so generated artifact output and generated runtime script selection can be produced together behind an explicit non-default command.

## v0.12 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 12 | Add guarded generated-artifact build mode contract | Complete | `scripts/build-public-catalog-generated.js`, `npm run build:public-artifact` | Produces generated runtime HTML and `public/data/catalog.generated.js` together behind an explicit non-default command |
| 12.1 | Write generated build report | Complete | `reports/public-catalog-generated-build.json` | Records runtime script, generated artifact path, payload hash, baseline comparison, and checked routes |
| 12.2 | Document generated build contract | Complete | `docs/04-data/public-catalog-generated-build-v0.12.md` | Records command, guard flag, build sequence, guardrails, verification, and next step |

Next coding task: add generated-artifact release-readiness comparison that builds default and generated outputs side by side and reports differences before any default runtime replacement is approved.

## v0.13 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 13 | Add generated-artifact release-readiness comparison | Complete | `scripts/verify-public-catalog-release-readiness.js`, `npm run readiness:public-artifact` | Builds default and generated public outputs side by side in temporary directories |
| 13.1 | Write release-readiness report | Complete | `reports/public-catalog-release-readiness.json` | Records file diffs, HTML normalization comparison, shared file comparison, artifact hash, and baseline comparison |
| 13.2 | Document release-readiness contract | Complete | `docs/04-data/public-catalog-release-readiness-v0.13.md` | Records command, guard flag, comparison rules, restore behavior, and next step |

Next coding task: add a default-runtime replacement proposal and rollback plan for `/data/catalog.generated.js`; do not switch the default runtime until the proposal, readiness report, and rollback plan are reviewed.

## v0.14 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 14 | Add default-runtime replacement proposal and rollback plan | Complete | `docs/04-data/public-catalog-default-runtime-proposal-v0.14.md` | Proposes `/data/catalog.generated.js` as the future default runtime script but does not apply the switch |
| 14.1 | Add proposal readiness verification | Complete | `scripts/verify-public-catalog-default-runtime-proposal.js`, `npm run readiness:public-artifact-proposal` | Validates proposal content, v0.13 readiness report values, and current default build behavior |
| 14.2 | Preserve default runtime | Complete | Final default build output | `npm run build` remains on `/data/catalog.js` and does not emit `public/data/catalog.generated.js` |

Next coding task: implement the guarded default-runtime switch only after the proposal and rollback plan are reviewed.

## v0.15 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 15 | Implement guarded default-runtime switch | Complete | `scripts/generate-static-pages.js`, `npm run build` | Default static HTML now references `/data/catalog.generated.js` and writes `public/data/catalog.generated.js` after artifact baseline and invariant checks |
| 15.1 | Add legacy rollback build path | Complete | `npm run build:legacy-catalog` | Rehearses rollback to `/data/catalog.js` locally without leaving the generated artifact in `public/` |
| 15.2 | Add switch readiness verification | Complete | `scripts/verify-public-catalog-default-runtime-switch.js`, `reports/public-catalog-default-runtime-switch.json` | Verifies default generated build, legacy rollback build, and restored generated default build |

Next coding task: prepare a release handoff package for the generated catalog default runtime, including changed commands, reports, rollback command, and approval boundaries. Do not deploy or push without separate release approval.

## v0.16 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 16 | Prepare release handoff package | Complete | `docs/06-operations/public-catalog-default-runtime-release-handoff-v0.16.md` | Records changed commands, report inputs, rollback command, approval boundary, release-owner checklist, residual risks, and next step |
| 16.1 | Add release handoff readiness verification | Complete | `scripts/verify-public-catalog-release-handoff.js`, `npm run readiness:public-artifact-handoff` | Validates the handoff doc, readiness reports, current generated default build output, and writes `reports/public-catalog-release-handoff.json` |
| 16.2 | Preserve external state boundary | Complete | Local docs, scripts, reports only | No deploy, push, PR, DB migration, secret rotation, DNS, CDN, or public URL change |

Next coding task: prepare a GitHub push/PR package for the generated catalog default runtime. Do not push, create a PR, deploy, run DB migrations, rotate secrets, or change DNS/CDN/public URLs without separate approval.

## v0.17 Progress Update

| Order | Task | Status | Output | Notes |
|---:|---|---|---|---|
| 17 | Correct GitHub project identity and handoff boundary | Complete | `docs/06-operations/github-project-handoff-v0.17.md` | Documents GitHub `origin` as primary and `gitlab-preview` as a secondary preview remote |
| 17.1 | Remove incorrect GitLab/worker00 handoff artifacts | Complete | Removed GitLab/worker00 scripts, docs, reports, and package commands | worker00 is not required for GitHub upload/PR work |
| 17.2 | Restore temporary CI candidate change | Complete | `.gitlab-ci.yml` | Removes the temporary `catalog_readiness` candidate job and restores the previous deploy-only shape |
| 17.3 | Add GitHub handoff verifier | Complete | `scripts/verify-github-handoff.js`, `reports/github-project-handoff.json` | Verifies remote identity, cleanup state, README wording, and no external state mutation |

Next task: prepare a GitHub push/PR request package with branch name, PR title/body, changed-file summary, validation results, and rollback note. Remote push and PR creation remain separate approvals.

## Baseline Result

| Metric | Value |
|---|---:|
| Authors | 1 |
| Series | 3 |
| Published series | 2 |
| Episodes | 17 |
| Published episodes | 16 |
| Panels | 17 |
| Local image references | 38 unique / 40 checked usages |
| Missing local image references | 0 |
