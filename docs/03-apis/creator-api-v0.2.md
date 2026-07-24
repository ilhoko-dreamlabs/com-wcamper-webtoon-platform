# Creator API Boundary v0.2

Date: 2026-07-15
Status: Approved design baseline

## Goal

Define the creator API boundary before refactoring `api/creator.js` and `api/_lib/creator-content.js`. This keeps route behavior stable while preparing service and repository extraction.

## Current Route Surface

| Method | Route | Purpose | Current owner check |
|---|---|---|---|
| `GET` | `/api/creator/me` | Authenticated author context | `assertAuthor` |
| `GET` | `/api/creator/diagnostics` | Creator store readiness | `assertAuthor` |
| `GET` | `/api/creator/summary` | Dashboard counts | Author record |
| `GET` | `/api/creator/workspace` | Consolidated workspace read model | Author record |
| `GET`, `PATCH` | `/api/creator/profile` | Author profile read/update | Author record |
| `GET`, `POST` | `/api/creator/series` | Series collection | Author record |
| `GET`, `PATCH` | `/api/creator/series/:id` | Series detail/update | Author ownership |
| `GET`, `POST` | `/api/creator/series/:id/episodes` | Episode collection | Series ownership |
| `GET`, `PATCH` | `/api/creator/episodes/:id` | Episode detail/update | Series ownership |
| `GET`, `POST` | `/api/creator/episodes/:id/images` | Episode image collection | Episode ownership |
| `POST` | `/api/creator/episodes/:id/request-review` | Submit episode for review | Episode ownership |
| `PATCH` | `/api/creator/images/:id` | Image metadata update | Episode ownership |

## Boundary Problems To Fix

| Problem | Current location | Impact |
|---|---|---|
| Route handling and domain orchestration are close together | `api/creator.js` | Route file will grow with every workflow |
| Repository SQL, schema bootstrap, seed import, validation, serialization, and dashboard logic are mixed | `api/_lib/creator-content.js` | Hard to test or change safely |
| Initial static catalog attachment is embedded in author record creation | `ensureAuthorRecord` | Migration behavior is hidden behind login side effect |
| Review request mutates status without explicit review entity | `requestEpisodeReview` | Operator audit and review history are incomplete |
| Single `status` field drives both editing lock and publication visibility | SQL schema and serializers | Public visibility rules can become ambiguous |

## Target Module Boundary

| Module | Responsibility |
|---|---|
| `api/creator.js` | Parse route, enforce method, call service, return response |
| `api/_lib/creator-auth-service.js` | Convert auth context into active author context |
| `api/_lib/creator-repository.js` | SQL reads/writes for authors, series, episodes, images |
| `api/_lib/creator-service.js` | Author workflow rules and transaction orchestration |
| `api/_lib/creator-read-model.js` | Workspace and dashboard projections |
| `api/_lib/catalog-import-service.js` | Idempotent static catalog import and dry-run comparison |
| `api/_lib/publication-service.js` | Review request, operator decision, publication state transitions |
| `api/_lib/asset-service.js` | Asset URL validation and later object metadata integration |

## API Rules

- Routes must not directly decide publication visibility.
- Author-facing mutation endpoints must check ownership through repository/service calls.
- Review requests should become append-only review records before public visibility changes.
- Static catalog import must be an explicit script/service, not a login side effect.
- Public reader pages must consume generated snapshots, not creator workspace API responses.

## First Refactor Sequence

| Order | Change | Reason | Verification |
|---:|---|---|---|
| 1 | Extract read-only route inventory and tests/smoke notes | Preserve current behavior | Build remains unchanged |
| 2 | Move serialization helpers into a repository/read-model module | Low-risk mechanical separation | Build and creator API import check |
| 3 | Move static catalog seed into `catalog-import-service` | Removes hidden login side effect | Dry-run compares baseline counts |
| 4 | Add publication review table design before behavior change | Avoid status-only review history | Schema compatibility review |
| 5 | Add dry-run import script | Enables migration rehearsal without DB mutation | Dry-run report matches baseline |

## Completion Criteria For This API Baseline

- Current route surface is documented.
- Refactor boundaries are explicit.
- The first implementation sequence avoids external state changes.
- Verification remains local: build, asset validation, baseline generation, and dry-run reports.

## v0.30 Implementation Update

Date: 2026-07-24

작가페이지 성능 개선을 위해 신규 UI 기본 경로는 `/api/creator/workspace`가 아니라 화면 단위 endpoint를 사용한다. `/api/creator/workspace`는 기존 링크와 운영 호환을 위해 남긴다.

| Method | Route | Response boundary | UI route |
|---|---|---|---|
| `GET` | `/api/creator/dashboard` | `{ author, profile, summary, recentFeedback }` | `/creator-studio/dashboard` |
| `GET` | `/api/creator/series` | `{ author, series }` | `/creator-studio/works` |
| `GET` | `/api/creator/series/:id` | `{ series }` | `/creator-studio/works/:seriesId` |
| `GET` | `/api/creator/series/:id/episodes` | `{ episodes }` | `/creator-studio/works/:seriesId` |
| `GET` | `/api/creator/episodes/:id` | `{ episode }` | `/creator-studio/episodes/:episodeId` |
| `GET` | `/api/creator/episodes/:id/images` | `{ images }` | `/creator-studio/episodes/:episodeId` |
| `GET` | `/api/creator/feedback` | `{ author, feedback }` | `/creator-studio/feedback` |
| `GET`, `PATCH` | `/api/creator/profile` | `{ author, profile }` / `{ profile }` | `/creator-studio/settings` |

`series`와 `episode` 객체는 호환 필드 `status`와 함께 `draftStatus`, `publicationStatus`를 반환한다. 신규 lock 판단은 `draftStatus`를 우선 사용한다.

## v0.32 Admin Publication Pipeline API Update

Review approval and production publication are separate API surfaces.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/admin/publication-snapshots` | List recent DB-backed publication snapshots |
| `POST` | `/api/admin/publication-snapshots` | Generate a catalog snapshot and static artifact metadata from release-candidate DB rows |
| `POST` | `/api/admin/publication-snapshots/:id/preview` | Create a preview release record |
| `GET` | `/api/admin/publication-releases` | List release records |
| `POST` | `/api/admin/publication-releases/:id/smoke-pass` | Mark preview smoke checks as passed |
| `POST` | `/api/admin/publication-releases/:id/promote` | Promote a smoke-passed preview release to production |
| `POST` | `/api/admin/publication-releases/:id/rollback` | Roll back an active production release record |

The admin review action set is now `approve`, `request-revision`, and `reject`. Direct review `publish` is not exposed in the admin UI or accepted by the review moderation API.
