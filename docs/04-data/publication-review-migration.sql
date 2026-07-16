-- Publication review and snapshot additive migration draft.
-- Status: draft only. Do not execute without separate approval.

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

create index if not exists publication_reviews_target_created_idx
  on publication_reviews (target_type, target_id, created_at desc);

create index if not exists publication_reviews_author_requested_idx
  on publication_reviews (requested_by_author_id, requested_at desc);

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

create index if not exists publication_snapshots_type_generated_idx
  on publication_snapshots (snapshot_type, generated_at desc);
