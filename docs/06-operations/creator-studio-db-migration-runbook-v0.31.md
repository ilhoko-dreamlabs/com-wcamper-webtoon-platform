# Creator Studio DB Migration Runbook v0.31

Date: 2026-07-24
Status: Ready for staging rehearsal

## Goal

작가페이지 route/API 분리와 검수 후 공개 흐름을 운영 DB에 안전하게 적용한다. 이 문서는 production 직접 실행 문서가 아니라 staging rehearsal과 production change request의 기준이다.

## Registry References

| Registry document | Applied rule |
|---|---|
| DreamLabs `docs/WORKER_USAGE_GUIDE.md` | Runtime authority and production authority are separate |
| DreamLabs `dreamlabs-deployment-readiness` workflow | Build, verification, secret scan, rollback, handoff 순서 적용 |
| DreamLabs `dreamlabs-release-handoff` workflow | release package와 rollback note를 문서화 |

## Migration Scope

| Object | Change | Mode |
|---|---|---|
| `webtoon_series` | add `draft_status`, `publication_status` | additive |
| `webtoon_episodes` | add `draft_status`, `publication_status` | additive |
| `publication_reviews` | normalize review history table | create if missing |
| `publication_snapshots` | add snapshot provenance fields | create if missing |
| `static_artifacts` | track generated artifact files | create if missing |
| `publication_releases` | track preview/production release state | create if missing |

No existing column or table is dropped in this migration.

## Preflight Checklist

| Check | Command or action | Expected |
|---|---|---|
| Local syntax | `node --check api/creator.js` and related modules | pass |
| Creator readiness | `npm run readiness:creator-studio` | pass |
| Static build | `npm run build` | pass |
| Public artifact checks | `npm run verify:public-artifact` and `npm run readiness:public-artifact` | pass |
| Asset validation | `npm run validate:assets` | pass |
| Secret review | file-name-only/common indicator scan | no likely secret |
| Backup | DB owner confirms current backup or restore point | confirmed outside code |

## Staging Rehearsal

1. Apply `docs/04-data/publication-review-migration.sql` to staging DB.
2. Start the staging app with the same environment class as production.
3. Log in as an approved author.
4. Open `/creator-studio/dashboard`, `/creator-studio/works`, `/creator-studio/feedback`, and `/creator-studio/settings`.
5. Open at least one work detail and one episode detail by direct URL.
6. Request review for a draft episode and verify a `publication_reviews` row is appended.
7. Approve or request revision from the admin review queue.
8. Confirm `draft_status` and `publication_status` update independently.
9. Run public catalog smoke checks against staging artifact output.

## Production Change Sequence

| Order | Action | Owner | Stop condition |
|---:|---|---|---|
| 1 | Confirm staging rehearsal result | operator | any failed staging check |
| 2 | Confirm backup/restore point | DB owner | backup unavailable |
| 3 | Apply additive migration | DB owner | SQL error or lock timeout |
| 4 | Deploy application build | release owner | deploy failure |
| 5 | Run post-deploy smoke | release owner | author route/API failure |
| 6 | Monitor logs and latency | operator | elevated 4xx/5xx or DB errors |

## Post-Migration SQL Checks

```sql
select count(*) from webtoon_series where draft_status is null or publication_status is null;
select count(*) from webtoon_episodes where draft_status is null or publication_status is null;
select to_regclass('publication_reviews') as publication_reviews;
select to_regclass('publication_snapshots') as publication_snapshots;
select to_regclass('static_artifacts') as static_artifacts;
select to_regclass('publication_releases') as publication_releases;
```

Expected result: null-state counts are `0`, and all table names resolve.

## Rollback

Application rollback is the primary rollback path because the schema change is additive.

| Failure | Rollback action |
|---|---|
| App deploy failure | redeploy previous application version |
| Creator UI regression | redeploy previous application version; keep additive DB columns |
| Migration partially applied | rerun idempotent migration after DB owner inspection |
| Bad review/release data | correct data with explicit operator-approved SQL; do not delete audit rows casually |

Dropping the new columns or tables is not part of the default rollback. It requires a separate destructive migration review.
