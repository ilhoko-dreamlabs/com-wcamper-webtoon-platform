# Webtoon Platform Docs Index

Date: 2026-07-15
Status: Approved planning index v0.1

## Purpose

This index separates current operating decisions from historical MVP notes. New sessions should start here to avoid mixing the old static MVP source of truth with the approved platform transition target.

## Current Authority

| Document | Role | Use |
|---|---|---|
| `docs/01-platform/goals-v0.1.md` | Approved goals | Start here for target state and completion criteria |
| `docs/01-platform/transition-plan-v0.1.md` | Approved transition plan | Use as execution roadmap and decision table |
| `docs/01-platform/architecture.md` | Approved system design | Use for source of truth, read model, API, data, and performance boundaries |
| `docs/01-platform/decision-records.md` | Approved decisions | Use to prevent repeated debate in future sessions |
| `docs/01-platform/implementation-backlog-v0.2.md` | Approved implementation backlog | Use for the next coding sequence after v0.2 design |
| `docs/02-domains/creator-domain-v0.2.md` | Approved creator domain baseline | Use for author/supplier write model rules |
| `docs/03-apis/creator-api-v0.2.md` | Approved creator API boundary | Use before refactoring creator routes and services |
| `docs/04-data/schema-v0.2.md` | Approved schema transition baseline | Use before drafting DB migration SQL |
| `docs/04-data/static-catalog-import-v0.2.md` | Approved static catalog import design | Use before implementing import dry-run |
| `docs/04-data/public-catalog-snapshot-v0.7.md` | Approved public snapshot boundary baseline | Use before changing public reader catalog generation |
| `docs/04-data/public-catalog-artifact-v0.8.md` | Approved public artifact dry-run contract | Use before replacing browser runtime catalog loading |
| `docs/04-data/public-catalog-artifact-writer-v0.9.md` | Approved local artifact writer contract | Use before serving generated public catalog artifacts |
| `docs/04-data/public-catalog-runtime-smoke-v0.10.md` | Approved generated artifact runtime smoke path | Use before changing the default reader catalog script |
| `docs/04-data/public-catalog-browser-smoke-v0.11.md` | Approved generated artifact browser smoke path | Use before adding a generated-artifact build mode |
| `docs/04-data/public-catalog-generated-build-v0.12.md` | Approved generated artifact build mode contract | Use before default runtime replacement or release-readiness checks |
| `docs/04-data/public-catalog-release-readiness-v0.13.md` | Approved generated artifact release-readiness comparison | Use before proposing default runtime replacement |
| `docs/04-data/public-catalog-default-runtime-proposal-v0.14.md` | Proposed default runtime replacement and rollback plan | Use before changing the default build from `/data/catalog.js` to `/data/catalog.generated.js` |
| `docs/04-data/public-catalog-default-runtime-switch-v0.15.md` | Applied local default runtime switch | Use for current generated artifact default build and rollback verification |
| `docs/04-data/publication-review-migration.sql` | Draft migration SQL | Review only; do not execute without separate approval |
| `docs/06-operations/public-catalog-default-runtime-release-handoff-v0.16.md` | Release handoff package for generated default runtime | Use before requesting release approval or deployment work |
| `docs/06-operations/github-project-handoff-v0.17.md` | Corrected GitHub project identity and handoff boundary | Use before preparing GitHub push/PR work; worker00 GitLab MR work is not required |
| `docs/06-operations/worklog-v0.1.md` | Work record | Use for what was changed in this planning session |
| `docs/06-operations/validation-v0.1.md` | Verification record | Use for local validation status and remaining checks |

## Supporting Existing Documents

| Document | Current role | Notes |
|---|---|---|
| `README.md` | Project status and local commands | Keep aligned with the approved platform transition as implementation advances |
| `docs/DESIGN.md` | Product vision and early domain design | Treat as product input, not as API or data source of truth |
| `docs/AUTH_FEEDBACK_AUTHOR_PLAN.md` | Auth, feedback, author application design | Still valid as a domain detail document |
| `docs/CREATOR_STUDIO_DETAIL_DESIGN.md` | Creator studio detailed design | Still valid for supplier workspace behavior |
| `docs/CREATOR_STUDIO_PERFORMANCE_PLAN.md` | Creator API performance analysis | Still valid for workspace API consolidation |
| `docs/SITE_ADMIN_SETTINGS_DESIGN.md` | Admin console and site settings | Still valid for operator workflow |
| `docs/NAVIGATION_PAGE_DESIGN.md` | Public IA and navigation | Supporting frontend detail |
| `docs/MYPAGE_AUTH_STATUS_DESIGN.md` | My page auth states | Supporting reader account detail |
| `docs/CREATOR_TRAINING_PAGE_DESIGN.md` | Creator onboarding content | Supporting supplier onboarding detail |
| `docs/OG_PREVIEW_DESIGN.md` | Static OG and SEO output | Supporting public snapshot detail |

## Draft Inputs Kept For Traceability

| Document | Role |
|---|---|
| `docs/OPERABLE_PLATFORM_REDESIGN_PLAN.md` | Earlier operable redesign draft |
| `docs/PLATFORM_TRANSITION_PLAN_V0_1.md` | Earlier transition draft that led to the approved v0.1 structure |

## Document Structure Target

```text
docs/
  00-index.md
  01-platform/
    goals-v0.1.md
    transition-plan-v0.1.md
    architecture.md
    decision-records.md
  02-domains/
    creator-domain-v0.2.md
  03-apis/
    creator-api-v0.2.md
  04-data/
    schema-v0.2.md
    static-catalog-import-v0.2.md
    public-catalog-snapshot-v0.7.md
    public-catalog-artifact-v0.8.md
    public-catalog-artifact-writer-v0.9.md
    public-catalog-runtime-smoke-v0.10.md
    public-catalog-browser-smoke-v0.11.md
    public-catalog-generated-build-v0.12.md
    public-catalog-release-readiness-v0.13.md
    public-catalog-default-runtime-proposal-v0.14.md
    public-catalog-default-runtime-switch-v0.15.md
    publication-review-migration.sql
  05-frontend/
  06-operations/
    public-catalog-default-runtime-release-handoff-v0.16.md
    github-project-handoff-v0.17.md
    worklog-v0.1.md
    validation-v0.1.md
  07-archive/
```

Do not move existing documents in bulk during the same change that rewrites their contents. First add indexes and cross references, then migrate documents in small reviewed steps.
