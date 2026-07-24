-- Creator studio publication state additive migration draft.
-- Status: staging rehearsal ready. Do not execute against production without a change request.
-- v0.32 state boundary:
--   draft_status='APPROVED' means editorial approval.
--   publication_status='SCHEDULED' means release candidate.
--   publication_status='PUBLISHED' is set by production promote.

alter table webtoon_series
  add column if not exists draft_status text,
  add column if not exists publication_status text;

alter table webtoon_episodes
  add column if not exists draft_status text,
  add column if not exists publication_status text;

update webtoon_series
set draft_status = case status
    when 'DRAFT' then 'DRAFT'
    when 'REVIEW_REQUESTED' then 'REVIEW_REQUESTED'
    when 'REVISION_REQUESTED' then 'REVISION_REQUESTED'
    when 'APPROVED' then 'APPROVED'
    when 'SCHEDULED' then 'APPROVED'
    when 'PUBLISHED' then 'APPROVED'
    when 'ARCHIVED' then 'ARCHIVED'
    else 'DRAFT'
  end,
  publication_status = case status
    when 'SCHEDULED' then 'SCHEDULED'
    when 'PUBLISHED' then 'PUBLISHED'
    when 'ARCHIVED' then 'WITHDRAWN'
    else 'UNPUBLISHED'
  end
where draft_status is null
   or publication_status is null;

update webtoon_episodes
set draft_status = case status
    when 'DRAFT' then 'DRAFT'
    when 'REVIEW_REQUESTED' then 'REVIEW_REQUESTED'
    when 'REVISION_REQUESTED' then 'REVISION_REQUESTED'
    when 'APPROVED' then 'APPROVED'
    when 'SCHEDULED' then 'APPROVED'
    when 'PUBLISHED' then 'APPROVED'
    when 'ARCHIVED' then 'ARCHIVED'
    else 'DRAFT'
  end,
  publication_status = case status
    when 'SCHEDULED' then 'SCHEDULED'
    when 'PUBLISHED' then 'PUBLISHED'
    when 'ARCHIVED' then 'WITHDRAWN'
    else 'UNPUBLISHED'
  end
where draft_status is null
   or publication_status is null;

alter table webtoon_series
  alter column draft_status set default 'DRAFT',
  alter column publication_status set default 'UNPUBLISHED',
  alter column draft_status set not null,
  alter column publication_status set not null;

alter table webtoon_episodes
  alter column draft_status set default 'DRAFT',
  alter column publication_status set default 'UNPUBLISHED',
  alter column draft_status set not null,
  alter column publication_status set not null;

create table if not exists publication_reviews (
  id text primary key,
  target_type text not null check (target_type in ('SERIES', 'EPISODE')),
  target_id text not null,
  author_id text not null references authors(id) on delete cascade,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REVISION_REQUESTED', 'PUBLISHED', 'REJECTED')),
  requested_by text,
  reviewed_by text,
  review_note text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publication_reviews_status_created_idx
  on publication_reviews (status, created_at desc);

create table if not exists publication_snapshots (
  id text primary key,
  source text not null default 'database',
  status text not null default 'GENERATED' check (status in ('GENERATED', 'PUBLISHED', 'ROLLED_BACK')),
  snapshot_type text not null default 'CATALOG' check (snapshot_type in ('CATALOG', 'AUTHOR_PAGE', 'SERIES_PAGE', 'EPISODE_PAGE')),
  target_id text,
  source_hash text,
  output_path text,
  metadata jsonb not null default '{}'::jsonb,
  catalog_json jsonb not null,
  generated_by text,
  generated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists static_artifacts (
  id text primary key,
  snapshot_id text not null references publication_snapshots(id) on delete cascade,
  artifact_type text not null check (artifact_type in ('CATALOG_JSON', 'STATIC_HTML', 'IMAGE_MANIFEST')),
  output_path text not null,
  checksum text not null,
  byte_size integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists static_artifacts_snapshot_idx
  on static_artifacts (snapshot_id, created_at desc);

create table if not exists publication_releases (
  id text primary key,
  snapshot_id text not null references publication_snapshots(id),
  environment text not null check (environment in ('PREVIEW', 'PRODUCTION')),
  status text not null default 'CREATED' check (status in ('CREATED', 'SMOKE_PASSED', 'PROMOTED', 'ROLLED_BACK', 'FAILED')),
  release_url text,
  promoted_by text,
  promoted_at timestamptz,
  rollback_of_release_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists publication_releases_env_created_idx
  on publication_releases (environment, created_at desc);

-- Post-migration readiness checks:
-- select count(*) from webtoon_series where draft_status is null or publication_status is null;
-- select count(*) from webtoon_episodes where draft_status is null or publication_status is null;
-- select to_regclass('public.publication_snapshots') is not null as publication_snapshots_ready;
-- select to_regclass('public.static_artifacts') is not null as static_artifacts_ready;
-- select to_regclass('public.publication_releases') is not null as publication_releases_ready;
