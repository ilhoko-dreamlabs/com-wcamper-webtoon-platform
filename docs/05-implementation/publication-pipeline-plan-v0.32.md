# Publication Pipeline Plan v0.32

Date: 2026-07-24
Status: Applied local implementation

## Goal

Separate editorial review approval from public production release.

The release path is:

```text
creator review request
-> admin review approval
-> DB publication snapshot
-> static artifact metadata
-> preview release
-> smoke pass
-> production promote
-> rollback-capable release record
```

## Registry References

```text
/workspace/dreamlabs-skill-registry/README.md
/workspace/dreamlabs-skill-registry/REGISTRY.md
/workspace/dreamlabs-skill-registry/docs/WORKER_USAGE_GUIDE.md
/workspace/dreamlabs-skill-registry/docs/EVIDENCE_POLICY.md
/workspace/dreamlabs-skill-registry/docs/SKILL_LIFECYCLE.md
/workspace/dreamlabs-skill-registry/skills/general/atomic/repo-inspection/SKILL.md
/workspace/dreamlabs-skill-registry/skills/general/atomic/test-command-discovery/SKILL.md
/workspace/dreamlabs-skill-registry/skills/general/atomic/secret-scan-review/SKILL.md
/workspace/dreamlabs-skill-registry/skills/dreamlabs-specific/workflows/dreamlabs-deployment-readiness/workflow.md
/workspace/dreamlabs-skill-registry/skills/dreamlabs-specific/workflows/dreamlabs-release-handoff/workflow.md
/workspace/dreamlabs-skill-registry/skills/dreamlabs-specific/workflows/dreamlabs-skill-lifecycle/workflow.md
```

## Design Decisions

| Decision | Applied behavior |
|---|---|
| Review approval is not publication | Admin review actions no longer expose direct `publish`; approval updates draft review state only |
| Public source is DB snapshot | `publication-pipeline.js` reads rows with `publication_status='PUBLISHED'` and builds a catalog-compatible payload |
| Artifact metadata is recorded in DB | Snapshot creation writes `publication_snapshots` and `static_artifacts` rows |
| Preview precedes production | Production promote requires a preview release with `SMOKE_PASSED` |
| Rollback is recorded | Rollback marks the active production release rolled back and records the replacement release when one exists |
| Legacy catalog seed is explicit | Login-time catalog attachment is disabled unless `WEBTOON_ENABLE_INITIAL_CATALOG_ATTACH=true` |

## API Contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/publication-snapshots` | List recent snapshots |
| `POST` | `/api/admin/publication-snapshots` | Generate DB-backed catalog snapshot and artifact metadata |
| `POST` | `/api/admin/publication-snapshots/:id/preview` | Create preview release from snapshot |
| `GET` | `/api/admin/publication-releases` | List preview and production release records |
| `POST` | `/api/admin/publication-releases/:id/smoke-pass` | Mark preview release smoke as passed |
| `POST` | `/api/admin/publication-releases/:id/promote` | Create promoted production release |
| `POST` | `/api/admin/publication-releases/:id/rollback` | Roll back active production release |

## Data Contract

| Table | Role |
|---|---|
| `publication_reviews` | Editorial decision history |
| `webtoon_series.publication_status` | Public eligibility state for series |
| `webtoon_episodes.publication_status` | Public eligibility state for episodes |
| `publication_snapshots` | Immutable generated catalog payload provenance |
| `static_artifacts` | Checksums and output paths derived from snapshot |
| `publication_releases` | Preview, production, promote, and rollback records |

## Acceptance Criteria

| Check | Expected |
|---|---|
| Review UI | No direct `publish` action |
| Admin API | Snapshot/release endpoints available |
| Snapshot generation | Reads DB publication state and writes snapshot/artifact metadata |
| Promote | Requires preview smoke pass |
| Rollback | Leaves audit and release records |
| Legacy seed | Hidden login upsert disabled by default |
| Verification | `npm run readiness:publication-pipeline` passes |

## External Boundary

No remote push, staging deploy, production deploy, production DB migration, object storage write, CDN purge, or production URL promotion is performed by this local implementation.
