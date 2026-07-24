# Data Schema Transition v0.2

Date: 2026-07-15
Status: Approved design baseline

## Goal

Prepare the current schema for creator-owned DB source of truth, separated publication state, review history, and static public snapshots.

## Current Tables

| Table | Current role | Keep |
|---|---|---|
| `authors` | Active author profile and owner root | Yes |
| `author_applications` | Author onboarding request | Yes |
| `webtoon_series` | Creator-owned work | Yes |
| `webtoon_episodes` | Creator-owned episode | Yes |
| `episode_images` | Ordered image references | Yes |
| `creator_dashboard_counts` | Cached creator metrics | Yes |
| `feedback` | Reader feedback target rows | Yes |
| `favorites` | Reader favorite relationship | Yes |
| `feedback_reports` | Feedback moderation queue | Yes |
| `site_settings` | Operator-managed site settings | Yes |
| `admin_audit_logs` | Operator action audit | Yes |

## Required Additions

| Addition | Purpose | Initial implementation mode |
|---|---|---|
| `draft_status` on series/episodes | Author production workflow | Add nullable/generated-compatible field first |
| `publication_status` on series/episodes | Public visibility workflow | Add nullable/generated-compatible field first |
| `publication_reviews` | Operator review history and decision notes | New table |
| `publication_snapshots` | Generated public snapshot provenance | New table |
| `asset_objects` | Asset metadata and future object storage references | New table or deferred until upload work |

## Compatibility Migration Draft

Runtime migration is not approved in this step. The future migration should be additive first:

```sql
alter table webtoon_series
  add column if not exists draft_status text,
  add column if not exists publication_status text;

alter table webtoon_episodes
  add column if not exists draft_status text,
  add column if not exists publication_status text;
```

Backfill rule:

| Source `status` | `draft_status` | `publication_status` |
|---|---|---|
| `DRAFT` | `DRAFT` | `UNPUBLISHED` |
| `REVIEW_REQUESTED` | `REVIEW_REQUESTED` | `UNPUBLISHED` |
| `REVISION_REQUESTED` | `REVISION_REQUESTED` | `UNPUBLISHED` |
| `APPROVED` | `APPROVED` | `UNPUBLISHED` |
| `SCHEDULED` | `APPROVED` | `SCHEDULED` |
| `PUBLISHED` | `APPROVED` | `PUBLISHED` |
| `ARCHIVED` | `ARCHIVED` | `WITHDRAWN` |

Only after code reads the new fields should `not null` and check constraints be introduced.

## Planned Review Table

```sql
create table if not exists publication_reviews (
  id text primary key,
  target_type text not null check (target_type in ('SERIES', 'EPISODE')),
  target_id text not null,
  requested_by_author_id text not null references authors(id),
  reviewed_by_admin_user_id text,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED', 'CANCELLED')),
  note text not null default '',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
```

## Planned Snapshot Table

```sql
create table if not exists publication_snapshots (
  id text primary key,
  snapshot_type text not null check (snapshot_type in ('CATALOG', 'AUTHOR_PAGE', 'SERIES_PAGE', 'EPISODE_PAGE')),
  target_id text,
  source_hash text not null,
  output_path text not null,
  generated_by text not null,
  generated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
```

## Static Catalog Baseline

The migration input baseline is `reports/static-catalog-baseline.json`.

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

## Completion Criteria For This Schema Baseline

- Current tables and future additions are listed.
- Additive migration order is defined.
- Current `status` compatibility is explicit.
- No DB migration is executed as part of this document-only step.

## v0.30 Implementation Update

Date: 2026-07-24

`draft_status`와 `publication_status`를 `webtoon_series`, `webtoon_episodes`에 additive 방식으로 추가했다. 기존 `status`는 응답 호환과 관리자 화면 호환을 위해 유지한다.

| Table | Added columns | Runtime behavior |
|---|---|---|
| `webtoon_series` | `draft_status`, `publication_status` | 작가 수정 가능 여부는 `draft_status` 기준, 공개 여부는 `publication_status` 기준 |
| `webtoon_episodes` | `draft_status`, `publication_status` | 검수 요청은 `draft_status=REVIEW_REQUESTED`, 공개는 `publication_status=PUBLISHED` |
| `publication_snapshots` | `snapshot_type`, `target_id`, `source_hash`, `output_path`, `metadata` | public catalog artifact provenance 기록용 |
| `static_artifacts` | 신규 테이블 | snapshot에서 생성한 catalog/html/manifest 파일 기록 |
| `publication_releases` | 신규 테이블 | preview/production release, promote, rollback 이력 기록 |

Backwards compatibility:

- `status`는 기존 UI와 관리자 목록의 표시/필터 호환 필드로 남긴다.
- 신규 API 응답은 `status`, `draftStatus`, `publicationStatus`를 모두 포함한다.
- 현재 단계는 additive schema이므로 기존 데이터 제거 또는 destructive migration은 수행하지 않는다.

## v0.32 Publication Pipeline Update

Date: 2026-07-24

검수 승인과 production 공개를 분리했다.

| State | Meaning |
|---|---|
| `draft_status=APPROVED` | 관리자 검수가 승인됨 |
| `publication_status=SCHEDULED` | snapshot 후보가 됨. production 공개는 아직 아님 |
| `publication_snapshots.status=GENERATED` | DB release candidate에서 catalog payload를 생성함 |
| `publication_releases.environment=PREVIEW` | preview 검증용 release |
| `publication_releases.status=SMOKE_PASSED` | production promote 가능 |
| `publication_releases.environment=PRODUCTION`, `status=PROMOTED` | 현재 production release 기록 |
| `publication_status=PUBLISHED` | production promote 후 공개 상태 |

`data/catalog.js`는 운영 source of truth가 아니다. 기본 경로에서는 로그인 시 자동 import/upsert를 수행하지 않고, 명시적 import script 또는 승인된 migration flow만 legacy catalog를 DB로 반영할 수 있다.
