# Platform Transition Goals v0.1

Date: 2026-07-15
Status: Approved
Scope: `webtoon.wcamper.com`, creator workspace, reader public site, admin operations, API, DB, assets, documentation

## Goal Statement

Convert the current static webtoon MVP into an operable two-sided platform:

```text
Creator / Supplier
  creates series, episodes, assets, review requests, and responses

Reader / Demand
  consumes published webtoons, subscribes, gives authenticated feedback, and generates reading signals

Operator / Platform Core
  approves creators, reviews content, controls publication, manages policy, and generates public snapshots
```

The platform must keep public reader pages fast while moving operational source of truth to Webtoon DB/API.

## Approved Goals

| ID | Goal | Approval | Completion criteria |
|---|---|---|---|
| G1 | Redefine the service as a creator-supplier and reader-demand platform | Approved | Docs consistently use supplier, demand, and operator boundaries |
| G2 | Move long-term source of truth to Webtoon DB/API | Approved | `data/catalog.js` is no longer treated as authoritative after migration |
| G3 | Keep public pages static-first for performance | Approved | Public pages use generated published snapshot and static/CDN assets |
| G4 | Separate write model from read models | Approved | Creator/admin use DB/API, public readers use published snapshot |
| G5 | Migrate current public webtoon data into creator-owned storage | Approved | Repeatable import script and integrity report exist |
| G6 | Split API responsibilities | Approved | Auth, creator, admin, asset, publication, event, and audit responsibilities are separated |
| G7 | Separate production state from publication state | Approved | `draft_status` and `publication_status` are documented and implemented or migration-ready |
| G8 | Record decisions, work, and verification | Approved | Worklog and validation documents are updated per phase |

## Non-Goals For v0.1

| Item | Reason |
|---|---|
| Production DB migration | Requires separate operational approval |
| Production deploy | Requires separate release approval |
| Remote push or PR creation | Requires separate approval |
| Payment and settlement | Not needed for platform transition foundation |
| External creator direct publish | Operator review remains mandatory in early operation |
| AI image generation production worker | Worker productionization is outside this transition foundation |

## Success Definition

The transition foundation is complete when a new session can implement from these docs without re-deciding the platform identity, source of truth, public performance model, migration direction, API boundaries, and verification policy.

## Current Execution Goal

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| E1 | Establish the static catalog migration baseline | Complete | `reports/static-catalog-baseline.json` exists and records series, episode, panel, and local image counts |
| E2 | Add repeatable asset integrity verification | Complete | `npm run validate:assets` checks catalog image references and fails on missing files |
| E3 | Keep baseline generation repeatable | Complete | `npm run baseline:catalog` regenerates the report from `data/catalog.js` without manual editing |
| E4 | Define creator write model transition baseline | Complete | Creator domain, API boundary, schema transition, static catalog import design, and implementation backlog v0.2 exist |

## Current Execution Goal v0.2

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.2-G1 | Inspect current creator/admin/API/schema implementation | Complete | Current facts are captured from `api/creator.js`, `api/_lib/creator-content.js`, admin approval API, and `db/schema.sql` |
| V0.2-G2 | Document creator domain write model | Complete | `docs/02-domains/creator-domain-v0.2.md` defines entities, roles, state mapping, and author write rules |
| V0.2-G3 | Document creator API refactor boundary | Complete | `docs/03-apis/creator-api-v0.2.md` lists routes, boundary problems, target modules, and first refactor sequence |
| V0.2-G4 | Document schema transition | Complete | `docs/04-data/schema-v0.2.md` defines additive state split, review table, snapshot table, and compatibility mapping |
| V0.2-G5 | Document static catalog import design | Complete | `docs/04-data/static-catalog-import-v0.2.md` defines mapping, idempotency, dry-run, and verification rules |
| V0.2-G6 | Confirm next implementation backlog | Complete | `docs/01-platform/implementation-backlog-v0.2.md` lists completed design tasks and next coding tasks |

## Current Execution Goal v0.3

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.3-G1 | Add static catalog import dry-run service | Complete | `api/_lib/catalog-import-service.js` maps catalog authors, series, episodes, images, and split statuses without DB mutation |
| V0.3-G2 | Add repeatable import dry-run command | Complete | `npm run import:catalog` writes `reports/static-catalog-import-dry-run.json` and states apply mode was not executed |
| V0.3-G3 | Add publication review migration draft | Complete | `docs/04-data/publication-review-migration.sql` exists as review-only SQL and was not executed |
| V0.3-G4 | Verify baseline/import/build loop | Complete | `baseline:catalog`, `import:catalog`, `validate:assets`, and `build` pass locally |

## Current Execution Goal v0.4

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.4-G1 | Remove duplicated hardcoded static catalog seed from creator login flow | Complete | `api/_lib/creator-content.js` no longer owns an `initialPublishedCatalog` data copy |
| V0.4-G2 | Reuse the static catalog import service for initial creator seed attachment | Complete | `attachInitialPublishedCatalog` builds a plan from `data/catalog.js` through `catalog-import-service` |
| V0.4-G3 | Keep import and seed behavior local/idempotent | Complete | Seed upsert uses `on conflict` and does not run outside existing login-triggered DB code paths |
| V0.4-G4 | Verify module load, catalog dry-run, assets, and build | Complete | Service import smoke, creator-content import smoke, `baseline:catalog`, `import:catalog`, `validate:assets`, and `build` pass locally |

## Current Execution Goal v0.5

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.5-G1 | Extract creator read-model serializers | Complete | `api/_lib/creator-read-model.js` owns creator profile, series, episode, image, and workspace grouping serializers |
| V0.5-G2 | Extract creator repository read queries | Complete | `api/_lib/creator-repository.js` owns profile, series, episode, image, and workspace SELECT helpers |
| V0.5-G3 | Preserve creator API public function names and behavior | Complete | `api/_lib/creator-content.js` continues exporting the existing route-facing API while delegating read paths |
| V0.5-G4 | Verify module load, catalog dry-run, assets, and build | Complete | Read-model/repository/content smoke, `baseline:catalog`, `import:catalog`, `validate:assets`, and `build` pass locally |

## Current Execution Goal v0.6

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.6-G1 | Add public catalog snapshot dry-run generator | Complete | `scripts/generate-public-catalog.js` builds a published-only catalog candidate without DB mutation or file publish |
| V0.6-G2 | Add repeatable snapshot verification command | Complete | `npm run snapshot:catalog` writes `reports/public-catalog-snapshot-dry-run.json` in dry-run mode |
| V0.6-G3 | Compare generated snapshot against approved published baseline | Complete | Snapshot report matches baseline published series, episodes, and image row counts |
| V0.6-G4 | Verify full local loop | Complete | `baseline:catalog`, `import:catalog`, `snapshot:catalog`, `validate:assets`, and `build` pass locally |

## Current Execution Goal v0.7

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.7-G1 | Extract public catalog snapshot boundary | Complete | `api/_lib/public-catalog-snapshot.js` owns snapshot report, baseline comparison, and build loader functions |
| V0.7-G2 | Reuse boundary from snapshot CLI | Complete | `scripts/generate-public-catalog.js` delegates snapshot report generation to the shared module |
| V0.7-G3 | Connect static page generation to public catalog boundary | Complete | `scripts/generate-static-pages.js` loads catalog through `loadPublicCatalogForBuild` |
| V0.7-G4 | Add repeatable boundary verification | Complete | `npm run verify:public-catalog` confirms published counts, baseline match, and no mutation |
| V0.7-G5 | Verify full local loop | Complete | `verify:public-catalog`, `baseline:catalog`, `import:catalog`, `snapshot:catalog`, `validate:assets`, and `build` pass locally |

## Current Execution Goal v0.8

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.8-G1 | Add generated public catalog artifact contract | Complete | `docs/04-data/public-catalog-artifact-v0.8.md` defines version, runtime global, candidate path, payload rules, and non-goals |
| V0.8-G2 | Generate artifact dry-run report | Complete | `npm run snapshot:catalog` writes `reports/public-catalog-artifact-dry-run.json` without publishing a runtime file |
| V0.8-G3 | Keep artifact catalog-compatible and published-only | Complete | Artifact payload has 1 author, 2 published series, 16 published episodes, and resolvable series episode refs |
| V0.8-G4 | Verify full local loop | Complete | `verify:public-catalog`, `baseline:catalog`, `import:catalog`, `snapshot:catalog`, `validate:assets`, and `build` pass locally |

## Current Execution Goal v0.9

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.9-G1 | Add guarded local public catalog artifact writer | Complete | `npm run artifact:catalog` requires dry-run mode and writes `public/data/catalog.generated.js` only after baseline and invariant checks pass |
| V0.9-G2 | Add generated artifact verification command | Complete | `npm run verify:public-artifact` loads the generated JS artifact and compares its payload hash to the expected artifact payload |
| V0.9-G3 | Document artifact writer contract and build interaction | Complete | `docs/04-data/public-catalog-artifact-writer-v0.9.md` records explicit write guard, build ordering, verification, and non-goals |
| V0.9-G4 | Verify full local loop | Complete | Boundary, baseline, import, snapshot, build, artifact generation, artifact verification, and asset checks pass locally |

## Current Execution Goal v0.10

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.10-G1 | Add non-production generated artifact runtime script toggle | Complete | `scripts/generate-static-pages.js` supports `WCAMPER_CATALOG_SCRIPT_PATH` while defaulting to `/data/catalog.js` |
| V0.10-G2 | Add repeatable generated artifact runtime smoke command | Complete | `npm run smoke:public-artifact-runtime` builds smoke HTML referencing `/data/catalog.generated.js` and verifies the artifact payload hash |
| V0.10-G3 | Document generated runtime smoke contract | Complete | `docs/04-data/public-catalog-runtime-smoke-v0.10.md` records the toggle, sequence, non-goals, and next step |
| V0.10-G4 | Verify full local loop and restore default build output | Complete | Smoke, artifact, boundary, baseline, import, snapshot, assets, and default build pass locally |

## Current Execution Goal v0.11

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.11-G1 | Add browser-like public reader route smoke for generated artifact | Complete | `npm run smoke:public-artifact-browser` executes `assets/js/app.js` against `public/data/catalog.generated.js` in a DOM shim |
| V0.11-G2 | Verify representative public reader routes | Complete | Home, series, and episode routes render expected title/body content against the generated artifact |
| V0.11-G3 | Verify generated static route HTML points at the generated artifact in smoke mode | Complete | Smoke route HTML includes `/data/catalog.generated.js` while default build remains separately restored |
| V0.11-G4 | Document browser smoke contract and next step | Complete | `docs/04-data/public-catalog-browser-smoke-v0.11.md` records command, scope, non-goals, and next step |

## Current Execution Goal v0.12

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.12-G1 | Add guarded generated-artifact build mode contract | Complete | `npm run build:public-artifact` produces generated runtime HTML and `public/data/catalog.generated.js` together behind an explicit non-default command |
| V0.12-G2 | Write generated build verification report | Complete | `reports/public-catalog-generated-build.json` records runtime script, artifact path, payload hash, baseline comparison, and checked routes |
| V0.12-G3 | Keep default build runtime unchanged | Complete | Final `npm run build` emits `/data/catalog.js` and removes the generated candidate artifact from default `public/` output |
| V0.12-G4 | Document generated build contract and next step | Complete | `docs/04-data/public-catalog-generated-build-v0.12.md` records command, guardrails, verification, and next release-readiness step |

## Current Execution Goal v0.13

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.13-G1 | Add generated-artifact release-readiness comparison | Complete | `npm run readiness:public-artifact` builds default and generated public outputs side by side and writes `reports/public-catalog-release-readiness.json` |
| V0.13-G2 | Require output parity before default runtime replacement | Complete | Readiness report allows only `data/catalog.generated.js` as generated-only and verifies every HTML file matches after runtime script normalization |
| V0.13-G3 | Verify shared assets and generated artifact integrity | Complete | Readiness report verifies shared non-HTML file hashes, generated artifact payload hash, and published baseline match |
| V0.13-G4 | Keep default build runtime unchanged | Complete | Final readiness restore and final `npm run build` leave `public/` on `/data/catalog.js` with no `public/data/catalog.generated.js` |
| V0.13-G5 | Document release-readiness contract and next step | Complete | `docs/04-data/public-catalog-release-readiness-v0.13.md` records command, guardrails, verification, and next default-runtime proposal step |

## Current Execution Goal v0.14

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.14-G1 | Add default-runtime replacement proposal | Complete | `docs/04-data/public-catalog-default-runtime-proposal-v0.14.md` records the proposed `/data/catalog.generated.js` default runtime switch without applying it |
| V0.14-G2 | Add rollback checklist before runtime replacement | Complete | Proposal doc includes rollback steps for restoring `/data/catalog.js` and removing default generated artifact emission |
| V0.14-G3 | Add proposal readiness verification | Complete | `npm run readiness:public-artifact-proposal` validates the proposal against the v0.13 readiness report and confirms default build remains unchanged |
| V0.14-G4 | Keep default build runtime unchanged | Complete | Final validation leaves `public/index.html` referencing `/data/catalog.js` and no `public/data/catalog.generated.js` after `npm run build` |

## Current Execution Goal v0.15

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.15-G1 | Implement guarded default-runtime switch | Complete | `npm run build` emits `/data/catalog.generated.js` and writes `public/data/catalog.generated.js` only after artifact baseline and invariant checks pass |
| V0.15-G2 | Add local rollback build path | Complete | `npm run build:legacy-catalog` emits `/data/catalog.js` and does not leave `public/data/catalog.generated.js` in `public/` |
| V0.15-G3 | Add default switch readiness verification | Complete | `npm run readiness:public-artifact-switch` verifies default generated build, legacy rollback build, and restored default generated build |
| V0.15-G4 | Keep external state unchanged | Complete | No deploy, push, PR, DB migration, or secret change was performed |

## Current Execution Goal v0.16

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.16-G1 | Prepare generated default runtime release handoff package | Complete | `docs/06-operations/public-catalog-default-runtime-release-handoff-v0.16.md` records changed commands, report inputs, rollback method, approval boundary, residual risks, and next step |
| V0.16-G2 | Add handoff readiness verification | Complete | `npm run readiness:public-artifact-handoff` validates the handoff doc, readiness reports, current generated default build output, and writes `reports/public-catalog-release-handoff.json` |
| V0.16-G3 | Review likely committed secret indicators for handoff scope | Complete | Local text scan completed without exposing values; no likely new secret was identified in the v0.16 handoff files |
| V0.16-G4 | Keep external state unchanged | Complete | No deploy, push, PR, DB migration, secret rotation, DNS, CDN, or public URL change was performed |

## Current Execution Goal v0.17

| ID | Goal | Status | Completion criteria |
|---|---|---|---|
| V0.17-G1 | Correct repository identity to GitHub-first handoff | Complete | README and operations docs state that `origin` is GitHub and `gitlab-preview` is only a secondary preview remote |
| V0.17-G2 | Remove incorrect GitLab/worker00 handoff artifacts | Complete | GitLab/worker00 verifier scripts, request docs, reports, and package scripts are absent |
| V0.17-G3 | Restore `.gitlab-ci.yml` to previous local shape | Complete | The temporary `catalog_readiness` candidate job is removed and the previous deploy-only Pages configuration is restored |
| V0.17-G4 | Add GitHub handoff readiness verification | Complete | `npm run readiness:github-handoff` validates remote identity, cleanup state, README wording, and writes `reports/github-project-handoff.json` |
| V0.17-G5 | Keep external state unchanged | Complete | No push, PR creation, deploy, DB migration, secret rotation, DNS, CDN, or public URL change was performed |
