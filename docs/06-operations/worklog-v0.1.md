# Worklog v0.1

Date: 2026-07-24

## Iteration 18

Date: 2026-07-24

Task: Refactor creator studio navigation/API boundaries and document publication release architecture.

### Goal

Reduce creator page initial load cost by removing the creator UI dependency on the consolidated workspace API, align table layout with draft/publication state separation, and document the review-to-release flow.

### Completed

| Work item | Status |
|---|---|
| DreamLabs registry usage review | Complete |
| Creator route split design document | Complete |
| `/creator-studio/dashboard`, `/works`, `/feedback`, `/settings` route support | Complete |
| Creator UI workspace API dependency removal | Complete |
| `/api/creator/dashboard` and `/api/creator/feedback` endpoints | Complete |
| `draft_status` / `publication_status` additive schema update | Complete |
| Snapshot artifact and release table design in SQL | Complete |
| Static nested creator page generation | Complete |
| Local verification and smoke checks | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `assets/js/app.js` | Adds creator nested routing and screen-specific loaders |
| `assets/css/style.css` | Adds creator section navigation styling |
| `api/creator.js` | Adds dashboard and feedback creator endpoints |
| `api/_lib/creator-content.js` | Adds dashboard/feedback read models and draft-status locking |
| `api/_lib/creator-repository.js` | Selects draft/publication status fields |
| `api/_lib/creator-read-model.js` | Serializes `draftStatus` and `publicationStatus` |
| `api/admin-operations.js` | Updates review moderation to maintain separated content states |
| `api/_lib/platform-schema.js`, `db/schema.sql` | Adds additive state, snapshot, artifact, and release schema |
| `scripts/generate-static-pages.js` | Generates creator subroute static pages |
| `vercel.json` | Rewrites creator nested routes to the SPA entry |
| `docs/05-implementation/creator-studio-refactor-plan-v0.30.md` | Records the implementation plan, rollback note, and acceptance criteria |

### External State

No remote push, pull request, production deployment, production database migration, secret rotation, DNS/CDN change, or public URL promotion was performed.

## Iteration 19

Date: 2026-07-24

Task: Prepare creator studio release readiness, migration runbook, and repeatable regression verification.

### Goal

Turn the local creator studio refactor into a staging-ready release package with explicit migration, rollback, validation, and handoff boundaries.

### Completed

| Work item | Status |
|---|---|
| DreamLabs registry usage review | Complete |
| Creator studio release handoff document | Complete |
| Creator studio DB migration runbook | Complete |
| Publication review migration SQL aligned with current schema | Complete |
| Repeatable creator studio readiness script | Complete |
| Package script registration | Complete |
| Local validation rerun | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `scripts/verify-creator-studio-readiness.js` | Verifies creator route/API/schema/static routing boundaries and writes a readiness report |
| `package.json` | Adds `readiness:creator-studio` |
| `docs/06-operations/creator-studio-db-migration-runbook-v0.31.md` | Documents staging rehearsal, production sequence, SQL checks, and rollback |
| `docs/06-operations/creator-studio-release-handoff-v0.31.md` | Documents release scope, validation commands, staging acceptance, and remaining work |
| `docs/04-data/publication-review-migration.sql` | Updates migration draft to match current review/snapshot/artifact/release schema |
| `docs/00-index.md` | Adds v0.31 operational documents |
| `docs/06-operations/validation-v0.1.md` | Records v0.31 validation results |

### External State

No remote push, pull request, staging deployment, production deployment, production database migration, secret rotation, DNS/CDN change, public URL change, or production promote was performed.

## Iteration 20

Date: 2026-07-24

Task: Complete local publication pipeline, legacy catalog source boundary, and skill candidate reporting.

### Goal

Finish the local implementation for review approval -> snapshot -> preview -> smoke -> production promote -> rollback while keeping external systems unchanged.

### Completed

| Work item | Status |
|---|---|
| DreamLabs registry usage review | Complete |
| Publication pipeline design document | Complete |
| DB-backed snapshot service | Complete |
| Admin snapshot/release API endpoints | Complete |
| Admin release operation UI controls | Complete |
| Review direct publish action removal | Complete |
| Production promote state transition | Complete |
| Rollback release record flow | Complete |
| Legacy catalog auto seed opt-in boundary | Complete |
| Publication pipeline readiness script | Complete |
| Skill candidate record | Complete |
| Local validation rerun | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `api/_lib/publication-pipeline.js` | Adds DB-backed snapshot, artifact metadata, preview, smoke, promote, rollback service functions |
| `api/admin-operations.js` | Adds publication pipeline endpoints and removes direct review publish action |
| `assets/js/app.js` | Adds admin publication pipeline controls |
| `api/_lib/creator-content.js` | Makes login-time legacy catalog attach explicitly opt-in |
| `api/_lib/catalog-import-service.js` | Keeps split status fields during explicit catalog import/upsert |
| `scripts/verify-publication-pipeline-readiness.js` | Adds static and pure-function readiness checks for v0.32 |
| `docs/05-implementation/publication-pipeline-plan-v0.32.md` | Records design and API contract |
| `docs/06-operations/publication-pipeline-release-runbook-v0.32.md` | Records release and rollback runbook |
| `docs/06-operations/skill-candidates-v0.32.md` | Records skillization candidates |

### Skillization Candidates

Recorded in:

```text
docs/06-operations/skill-candidates-v0.32.md
```

| Candidate | Status |
|---|---|
| `publication-pipeline-readiness` | Recorded |
| `legacy-source-deprecation-check` | Recorded |
| `webtoon-release-runbook-writer` | Recorded |
| `admin-release-api-boundary-review` | Recorded |

### External State

No remote push, pull request, staging deployment, production deployment, production database migration, secret rotation, DNS/CDN change, public URL change, object storage write, CDN invalidation, or production promote was performed.

## Iteration 21

Date: 2026-07-24

Task: Finalize local completion package and verify local generated-runtime serving.

### Goal

Close remaining local release-readiness gaps, align outdated documents with the current screen-scoped creator API design, and verify the app through local static HTTP serving.

### Completed

| Work item | Status |
|---|---|
| DreamLabs registry workflow review | Complete |
| Creator performance plan updated from workspace consolidation to screen-scoped API design | Complete |
| Architecture and detail design references corrected | Complete |
| README local execution order corrected | Complete |
| `npm run start` corrected to serve generated `public/` output | Complete |
| Final completion report added | Complete |
| Publication runbook local route check added | Complete |
| Full local validation rerun | Complete |
| Secret scan review rerun | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `package.json` | Changes `start` to serve `public/`, matching generated catalog runtime |
| `README.md` | Documents `npm run build` before `npm run start` and clarifies legacy catalog opt-in |
| `docs/CREATOR_STUDIO_PERFORMANCE_PLAN.md` | Rewrites performance plan for screen-scoped creator APIs |
| `docs/01-platform/architecture.md` | Updates creator performance boundary |
| `docs/CREATOR_STUDIO_DETAIL_DESIGN.md` | Updates performance implementation note |
| `docs/06-operations/creator-publication-completion-report-v0.33.md` | Records final local completion and external boundary |
| `docs/06-operations/publication-pipeline-release-runbook-v0.32.md` | Adds local static serving route checks |
| `docs/06-operations/validation-v0.1.md` | Records final verification evidence |
| `docs/00-index.md` | Adds the v0.33 completion report |

### Verification

| Check | Status |
|---|---|
| JavaScript syntax sweep | Passed |
| `npm run readiness:publication-pipeline` | Passed |
| `npm run readiness:creator-studio` | Passed |
| `npm run build` | Passed |
| `npm run verify:public-catalog` | Passed |
| `npm run verify:public-artifact` | Passed |
| `npm run validate:assets` | Passed |
| `npm run smoke:public-artifact-runtime` | Passed |
| `npm run smoke:public-artifact-browser` | Passed |
| `npm run readiness:public-artifact` | Passed |
| Local HTTP route checks against `npm run start` | Passed |
| Secret scan review | Passed |

### External State

No remote push, pull request, staging deployment, production deployment, staging or production database migration, secret rotation, DNS/CDN change, public URL change, object storage write, CDN invalidation, or production promote was performed.

## Iteration 22

Date: 2026-07-24

Task: Execute approved external release work and complete production smoke.

### Goal

Push the completed creator publication pipeline to the primary remote, verify the production Vercel deployment, repair any release-blocking route issues found during smoke, and record remaining environment-only blockers.

### Completed

| Work item | Status |
|---|---|
| DreamLabs registry deployment/release workflow reread | Complete |
| Full local verification suite rerun before push | Complete |
| Secret scan review rerun with redacted output | Complete |
| Local release commit created | Complete |
| GitHub `origin/main` push completed | Complete |
| Vercel production deployment confirmed `READY` | Complete |
| Production public route smoke completed | Complete |
| Missing Vercel rewrite for publication admin APIs identified | Complete |
| Publication snapshot/release rewrites added | Complete |
| Publication readiness verifier updated to check Vercel rewrites | Complete |
| Production admin API auth-boundary smoke completed | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `vercel.json` | Adds admin publication snapshot/release rewrites to `api/admin-operations` |
| `scripts/verify-publication-pipeline-readiness.js` | Adds readiness guard for publication admin rewrites |
| `docs/06-operations/validation-v0.1.md` | Records external release verification |
| `docs/06-operations/worklog-v0.1.md` | Records external release worklog |
| `docs/06-operations/creator-publication-completion-report-v0.33.md` | Updates completion status after production deployment |

### External Blockers

| Item | State |
|---|---|
| DB migration | Not executed because no staging/production DB connection string is available in the worker environment |
| Authenticated production QA | Not executed because browser auth/admin session is not available in the worker environment |

## Iteration 25

Date: 2026-08-21

Task: Define Authoring MCP integration contract and synchronize durable Wiki knowledge.

### Goal

Record the MCP boundary for external authoring workers so they can submit
reviewable webtoon drafts without bypassing creator/admin review or production
publication controls.

## Iteration 26

Date: 2026-08-21

Task: Implement the minimal Authoring MCP import/status API surface.

### Goal

Add the first executable Authoring MCP boundary without allowing direct review
approval, snapshot generation, production promote, or rollback.

### Completed

| Work item | Status |
|---|---|
| DreamLabs registry usage review | Complete |
| Runtime Knowledge Wiki policy/index review | Complete |
| Authoring import/idempotency/audit schema added | Complete |
| Minimal Authoring MCP HTTP tool adapter added | Complete |
| `create_authoring_import` implemented | Complete |
| `get_authoring_import_status` implemented | Complete |
| Deferred draft mutation tools return guarded `501` | Complete |
| Vercel rewrite for `/api/authoring-mcp/:path*` added | Complete |
| Authoring MCP migration draft added | Complete |
| Readiness guard updated for implementation files and production-bypass checks | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `api/authoring-mcp.js` | Routes Authoring MCP HTTP tool calls |
| `api/_lib/authoring-mcp-service.js` | Implements worker auth, import creation, status lookup, audit event, and idempotency |
| `api/_lib/platform-schema.js` | Adds runtime-safe additive authoring tables |
| `db/schema.sql` | Adds managed schema authoring tables |
| `docs/04-data/authoring-mcp-migration-v0.35.sql` | Adds migration draft for authoring tables |
| `docs/03-apis/authoring-mcp-contract-v0.34.md` | Records current minimal adapter |
| `docs/05-implementation/authoring-mcp-integration-plan-v0.34.md` | Updates implementation status |
| `scripts/verify-authoring-mcp-readiness.js` | Verifies implementation, route, schema, and boundary checks |
| `vercel.json` | Adds Authoring MCP route rewrite |

### External State

No remote push, production deployment, staging or production DB migration,
worker token issuance, object storage write, production promote, or rollback
was performed in this local implementation step.

### Completed

| Work item | Status |
|---|---|
| Runtime Knowledge Wiki policy review | Complete |
| DreamLabs registry usage review | Complete |
| Authoring MCP contract document | Complete |
| Authoring MCP integration plan | Complete |
| Authoring MCP readiness verifier | Complete |
| Package script registration | Complete |
| Project docs index update | Complete |
| Skillization candidate update | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `docs/03-apis/authoring-mcp-contract-v0.34.md` | Defines worker-facing MCP tools, idempotency, auth boundary, and review-only submission flow |
| `docs/05-implementation/authoring-mcp-integration-plan-v0.34.md` | Defines component responsibilities, data-model additions, implementation sequence, and external boundary |
| `scripts/verify-authoring-mcp-readiness.js` | Verifies required contract terms and production-bypass prohibitions |
| `package.json` | Adds `readiness:authoring-mcp` |
| `docs/00-index.md` | Adds v0.34 MCP documents |
| `docs/06-operations/skill-candidates-v0.32.md` | Adds `authoring-mcp-contract-readiness` candidate |

### External State

No MCP server deployment, worker token issuance, object storage write, staging
or production database migration, production release promote, remote push, or
production deployment was performed.

## Iteration 26

Date: 2026-08-21

Task: Commit and push the Authoring MCP contract package, then run production
domain smoke checks.

### Goal

Persist the Authoring MCP integration contract to the primary GitHub remote and
verify that the existing production reader/admin API boundary remains healthy.

### Completed

| Work item | Status |
|---|---|
| Authoring MCP contract commit | Complete |
| GitHub `origin/main` push | Complete |
| Production public route smoke | Complete |
| Production creator API auth-boundary smoke | Complete |
| Production admin publication API auth-boundary smoke | Complete |

### Result

| Item | Value |
|---|---|
| Commit | `530ff71 Document authoring MCP integration contract` |
| Primary remote | GitHub `origin/main` |
| Public site | `https://webtoon.wcamper.com` |
| Public route smoke | `/`, `/creator-studio/dashboard`, `/creator-studio/works`, `/creator-studio/feedback`, `/creator-studio/settings`, and `/data/catalog.generated.js` returned expected responses |
| API auth boundary | `/api/creator/dashboard` and `/api/admin/publication-snapshots` returned unauthenticated `401` |

### External State

No MCP server deployment, worker token issuance, object storage write, staging
or production database migration, or production release promote was performed.
The Vercel CLI/token was not available in this worker, so deployment identity
inspection was not performed; production domain smoke completed against the
live site after the GitHub push.

## Iteration 23

Date: 2026-08-11

Task: Remove obsolete non-GitHub release path references.

### Goal

Remove obsolete release-path references that could confuse the project handoff. The project release path is GitHub `origin` and Vercel production.

### Completed

| Work item | Status |
|---|---|
| Removed obsolete CI file | Complete |
| Removed obsolete handoff verifier and report | Complete |
| Removed obsolete handoff document from the docs index | Complete |
| Removed obsolete release blocker references from validation, worklog, and completion report | Complete |
| Removed obsolete local secondary remote | Complete |
| Re-ran build and readiness checks | Complete |

### Changed Files

| File | Purpose |
|---|---|
| `README.md` | Keeps only GitHub `origin` as the repository remote reference |
| `package.json` | Removes the obsolete handoff readiness command |
| `docs/00-index.md` | Removes obsolete handoff document from current authority |
| `docs/01-platform/*` | Replaces obsolete handoff wording with GitHub/Vercel release-path wording |
| `docs/06-operations/validation-v0.1.md` | Records current verification without obsolete release blocker references |
| `docs/06-operations/worklog-v0.1.md` | Records this cleanup |
| `docs/06-operations/creator-publication-completion-report-v0.33.md` | Keeps remaining external boundaries to DB migration and authenticated QA |

### Removed Files

```text
scripts/verify-github-handoff.js
docs/06-operations/github-project-handoff-v0.17.md
reports/github-project-handoff.json
```

### Verification

| Check | Status |
|---|---|
| Obsolete release-path text scan | Passed |
| `package.json` parse | Passed |
| JavaScript syntax sweep | Passed |
| `npm run readiness:publication-pipeline` | Passed |
| `npm run readiness:creator-studio` | Passed |
| `npm run build` | Passed |
| `npm run verify:public-catalog` | Passed |
| `npm run verify:public-artifact` | Passed |
| `npm run validate:assets` | Passed |
| `npm run smoke:public-artifact-runtime` | Passed |
| `npm run smoke:public-artifact-browser` | Passed |
| `npm run readiness:public-artifact` | Passed |
| `git diff --check` | Passed |

## Iteration 24

Date: 2026-08-11

Task: Complete GitHub/Vercel release for obsolete release-path cleanup.

### Goal

Commit and push the obsolete release-path cleanup, confirm Vercel production deployment, run production smoke checks, and record remaining environment-only boundaries.

### Completed

| Work item | Status |
|---|---|
| Local cleanup commit created | Complete |
| GitHub `origin/main` push completed | Complete |
| Vercel production deployment confirmed `READY` | Complete |
| Production public route smoke completed | Complete |
| Production creator nested route smoke completed | Complete |
| Production catalog artifact smoke completed | Complete |
| Production creator/admin API unauthenticated boundary smoke completed | Complete |
| Vercel runtime error and 5xx log checks completed | Complete |

### Release Details

| Item | Value |
|---|---|
| Commit | `6cf8c1ccbb6c9c689509ac711bfa37a86a5d4a1e` |
| Message | Obsolete release-path cleanup |
| Deployment | `dpl_4j7Etbt3EWH8q4j5rK7N714nCEUQ` |
| Production URL | `https://webtoon.wcamper.com` |

### Remaining External Boundaries

| Item | State |
|---|---|
| DB migration | Not executed because no staging/production DB connection string is available in the worker environment |
| Authenticated production QA | Not executed because browser auth/admin session is not available in the worker environment |
