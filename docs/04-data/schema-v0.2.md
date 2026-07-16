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

