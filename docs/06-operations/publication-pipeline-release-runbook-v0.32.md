# Publication Pipeline Release Runbook v0.32

Date: 2026-07-24
Status: Local release-ready runbook

## Purpose

Provide the operating sequence for review-approved content release after the creator studio refactor.

## Preflight

| Step | Command or check | Expected |
|---:|---|---|
| 1 | Confirm branch and diff | Only intended creator/publication changes are present |
| 2 | `npm run readiness:creator-studio` | Pass |
| 3 | `npm run readiness:publication-pipeline` | Pass |
| 4 | `npm run build` | Pass |
| 5 | `npm run readiness:public-artifact` | Pass |
| 6 | Secret scan review | No secret values |

Local static serving check:

```bash
npm run build
npm run start
```

Then verify:

| Path | Expected |
|---|---|
| `/` | 200 |
| `/creator-studio/` | 200 |
| `/creator-studio/dashboard/` | 200 |
| `/creator-studio/works/` | 200 |
| `/creator-studio/feedback/` | 200 |
| `/creator-studio/settings/` | 200 |
| `/data/catalog.generated.js` | 200 |

## Migration Rehearsal

Apply only additive SQL from:

```text
docs/04-data/publication-review-migration.sql
```

Required tables/columns:

| Object | Expected |
|---|---|
| `webtoon_series.draft_status` | Present |
| `webtoon_series.publication_status` | Present |
| `webtoon_episodes.draft_status` | Present |
| `webtoon_episodes.publication_status` | Present |
| `publication_reviews` | Present |
| `publication_snapshots` | Present |
| `static_artifacts` | Present |
| `publication_releases` | Present |

## Release Sequence

| Step | Operator action | Expected result |
|---:|---|---|
| 1 | Approve requested content in admin review queue | `draft_status=APPROVED`; no production release created |
| 2 | Set intended rows to `publication_status=PUBLISHED` through approved admin/data workflow | DB marks release-eligible content |
| 3 | Generate snapshot | `publication_snapshots.status=GENERATED`; catalog payload stored |
| 4 | Create preview release | `publication_releases.environment=PREVIEW`, `status=CREATED` |
| 5 | Run preview smoke checks | Public routes render with generated catalog |
| 6 | Mark smoke pass | Preview release becomes `SMOKE_PASSED` |
| 7 | Promote | New production release becomes `PROMOTED` |
| 8 | Monitor | Logs, latency, page rendering, and admin release state are checked |

## Rollback

| Case | Action |
|---|---|
| Previous production release exists | Call rollback on the active production release; system records replacement from previous release |
| No previous release exists | Call rollback; current release is marked `ROLLED_BACK` and no replacement is created |
| Static host artifact mismatch | Restore previous deployed artifact through hosting provider rollback, then align `publication_releases` record |

## Notes

- Review approval and production release are separate controls.
- Local code records artifact metadata but does not upload files to object storage.
- Production deploy, DB migration, CDN invalidation, and remote push remain external actions.
