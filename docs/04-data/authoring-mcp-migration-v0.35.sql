-- Authoring MCP additive migration v0.35
-- Purpose: store external worker draft import envelopes, audit events, and
-- idempotency responses without granting production publication capability.

create table if not exists authoring_imports (
  id text primary key,
  external_job_id text not null,
  worker_id text not null,
  author_id text not null references authors(id) on delete cascade,
  status text not null default 'OPEN' check (status in ('OPEN', 'DRAFT_READY', 'SUBMITTED_FOR_REVIEW', 'REVIEW_APPROVED', 'RELEASED', 'FAILED', 'CANCELLED')),
  series_id text references webtoon_series(id) on delete set null,
  episode_id text references webtoon_episodes(id) on delete set null,
  review_id text references publication_reviews(id) on delete set null,
  source jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (worker_id, external_job_id)
);

create index if not exists authoring_imports_author_created_idx
  on authoring_imports (author_id, created_at desc);

create table if not exists authoring_import_events (
  id text primary key,
  import_id text not null references authoring_imports(id) on delete cascade,
  worker_id text not null,
  tool_name text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists authoring_import_events_import_created_idx
  on authoring_import_events (import_id, created_at desc);

create table if not exists authoring_idempotency_keys (
  id text primary key,
  worker_id text not null,
  import_id text references authoring_imports(id) on delete cascade,
  tool_name text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (worker_id, tool_name, idempotency_key)
);
