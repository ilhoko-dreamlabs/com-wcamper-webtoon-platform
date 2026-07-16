# Decision Records v0.1

Date: 2026-07-15
Status: Approved

| ID | Decision | Status | Consequence |
|---|---|---|---|
| ADR-001 | The service is a two-sided platform: creator-supplier, reader-demand, operator-core | Approved | Product, data, and API docs must use these boundaries |
| ADR-002 | Webtoon DB/API is the long-term source of truth | Approved | Static catalog cannot remain the authoritative store |
| ADR-003 | Public pages remain static-first through published snapshots | Approved | Reader performance is protected from runtime DB latency |
| ADR-004 | `data/catalog.js` is migration input and generated output | Approved | Existing public data can seed the DB without becoming future authority |
| ADR-005 | Creator direct publish is excluded from early operation | Approved | Operator review remains mandatory |
| ADR-006 | Production state and publication state are separate | Approved | `draft_status` and `publication_status` must not be collapsed in new design |
| ADR-007 | API routes should be thin and delegate to services/repositories | Approved | Shared auth, ownership, asset, publication, and audit behavior can be tested and reused |
| ADR-008 | Binary assets and asset metadata are separate | Approved | DB tracks ownership and public URLs; storage/CDN serves bytes |
| ADR-009 | High-volume reader events prefer aggregation | Approved | Cost and performance stay manageable |
| ADR-010 | Production-impacting actions require explicit approval | Approved | Planning and local docs may proceed; deployment, push, DB migration, and secret changes stop at approval gate |
| ADR-011 | Static catalog import must start with dry-run mode | Approved | Migration rehearsal can be validated without mutating DB state |
| ADR-012 | Initial catalog attachment should move out of login side effects | Approved | Author login should not hide migration behavior |
| ADR-013 | Publication review history needs an explicit entity | Approved | Review requests and operator decisions should be auditable before publication |
| ADR-014 | `npm run import:catalog` defaults to dry-run only | Approved | Local verification can run safely without a DB connection or production write authority |
| ADR-015 | Review migration SQL remains a draft artifact until separately approved | Approved | Schema readiness can be reviewed without executing a migration |
| ADR-016 | Existing initial catalog seed must reuse the catalog import service | Approved | Login-triggered seed behavior no longer carries a separate hardcoded catalog copy; future migration and seed behavior share one mapping boundary |
| ADR-017 | Static catalog seed upserts may include episode images | Approved | Creator workspace can represent migrated public episodes with image rows while remaining idempotent |
| ADR-018 | Public snapshot generation belongs behind a shared service boundary | Approved | Snapshot CLI, static build, and future DB-backed snapshot export can share validation and read-only guardrails |
| ADR-019 | Public catalog artifact replacement requires a dry-run contract first | Approved | The browser runtime keeps `/data/catalog.js` until a generated artifact has a versioned contract, published-only payload checks, and baseline match evidence |
| ADR-020 | Generated public catalog JS writes require an explicit local artifact command | Approved | `public/data/catalog.generated.js` is created only by `npm run artifact:catalog`; default runtime and `snapshot:catalog` remain non-publishing paths |
| ADR-021 | Generated artifact runtime use starts as a local smoke toggle | Approved | `WCAMPER_CATALOG_SCRIPT_PATH` can point static HTML at `/data/catalog.generated.js` only for explicit smoke verification; default build remains `/data/catalog.js` |
| ADR-022 | Generated artifact reader validation needs a browser-like route smoke before build-mode changes | Approved | `npm run smoke:public-artifact-browser` must execute the public app against `/data/catalog.generated.js` for representative reader routes before adding a generated-artifact build contract |
| ADR-023 | Generated artifact build mode must stay explicit and non-default | Approved | `npm run build:public-artifact` can produce generated runtime HTML and `public/data/catalog.generated.js` together, but `npm run build` remains on `/data/catalog.js` until release approval |
| ADR-024 | Generated artifact default replacement requires side-by-side release-readiness evidence | Approved | `npm run readiness:public-artifact` must compare default and generated public outputs, allow only `data/catalog.generated.js` as generated-only, and restore the default build before any runtime replacement proposal |
| ADR-025 | Default runtime replacement requires a reviewed rollback plan before implementation | Approved | `/data/catalog.generated.js` may become the default runtime only after the proposal, rollback checklist, readiness report, and local proposal verification are reviewed; v0.14 does not apply the switch |
| ADR-026 | Generated public catalog artifact is the local default reader runtime | Approved | `npm run build` now emits `/data/catalog.generated.js` and writes `public/data/catalog.generated.js`; `npm run build:legacy-catalog` remains the local rollback build path |
| ADR-027 | Generated default runtime release requires a handoff package before deployment work | Approved | Release approval should start from `docs/06-operations/public-catalog-default-runtime-release-handoff-v0.16.md` and `npm run readiness:public-artifact-handoff`; deployment, push, PR, DB, secret, DNS, CDN, and public URL changes remain separate approvals |
| ADR-028 | GitHub `origin` is the primary repository handoff target | Approved | `gitlab-preview` is treated as a secondary preview remote only; GitHub upload/PR work does not require worker00 GitLab MR handoff |
| ADR-029 | Incorrect GitLab/worker00 handoff artifacts must be removed from the current plan | Approved | Temporary GitLab CI candidate scripts, docs, reports, and package commands are removed; `.gitlab-ci.yml` is restored to its previous deploy-only shape |
| ADR-030 | GitHub push/PR work requires a GitHub handoff package before remote action | Approved | Start from `docs/06-operations/github-project-handoff-v0.17.md` and `npm run readiness:github-handoff`; remote push, PR creation, deploy, DB migration, secret rotation, DNS, CDN, and public URL changes remain separate approvals |
