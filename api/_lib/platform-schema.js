const { query } = require("./db");

let schemaReady;

function missingStore(error) {
  return ["42P01", "42703", "42P10", "3D000", "ECONNREFUSED", "ENOTFOUND", "DB_NOT_CONFIGURED"].includes(error.code);
}

async function ensurePlatformSchema() {
  if (!schemaReady) {
    schemaReady = runPlatformSchemaStatements().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  try {
    await schemaReady;
  } catch (error) {
    if (missingStore(error)) {
      throw Object.assign(new Error("platform store is not available"), {
        statusCode: 503,
        code: error.code === "DB_NOT_CONFIGURED" ? "DB_NOT_CONFIGURED" : "PLATFORM_STORE_NOT_READY",
        publicMessage: error.code === "DB_NOT_CONFIGURED"
          ? "웹툰 DB 환경변수가 설정되지 않았습니다."
          : "플랫폼 운영 저장소가 아직 준비되지 않았습니다."
      });
    }
    throw error;
  }
}

async function runPlatformSchemaStatements() {
  const statements = [
    `create table if not exists authors (
      id text primary key,
      user_id text not null unique,
      display_name text not null,
      bio text not null default '',
      handle text,
      icon_url text,
      public_page_enabled boolean not null default true,
      status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED')),
      approved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create table if not exists author_applications (
      id text primary key,
      user_id text not null,
      author_id text,
      display_name text not null,
      status text not null default 'SUBMITTED' check (status in ('DRAFT', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'REJECTED')),
      portfolio_url text,
      introduction text not null,
      sample_plan text not null,
      reviewed_by text,
      reviewed_at timestamptz,
      rejection_reason text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create index if not exists author_applications_user_created_idx on author_applications (user_id, created_at desc)`,
    `create table if not exists feedback (
      id text primary key,
      user_id text not null,
      target_type text not null check (target_type in ('AUTHOR', 'SERIES', 'EPISODE')),
      target_id text not null,
      body text not null,
      status text not null default 'VISIBLE' check (status in ('VISIBLE', 'HIDDEN', 'DELETED', 'REPORTED')),
      moderated_by text,
      moderated_at timestamptz,
      moderation_note text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create index if not exists feedback_target_created_idx on feedback (target_type, target_id, created_at desc)`,
    `create table if not exists webtoon_series (
      id text primary key,
      author_id text not null,
      title text not null,
      summary text not null,
      genre text not null default '',
      tags jsonb not null default '[]'::jsonb,
      cover_url text,
      status text not null default 'DRAFT' check (status in ('DRAFT', 'REVIEW_REQUESTED', 'REVISION_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
      review_note text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create table if not exists webtoon_episodes (
      id text primary key,
      series_id text not null,
      number integer not null check (number > 0),
      title text not null,
      summary text not null default '',
      draft_body text not null default '',
      content_url text,
      status text not null default 'DRAFT' check (status in ('DRAFT', 'REVIEW_REQUESTED', 'REVISION_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
      review_note text,
      review_requested_at timestamptz,
      scheduled_at timestamptz,
      published_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create table if not exists feedback_reports (
      id text primary key,
      feedback_id text not null,
      reporter_user_id text not null,
      reason text not null,
      status text not null default 'OPEN' check (status in ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED')),
      created_at timestamptz not null default now()
    )`,
    `alter table feedback add column if not exists moderated_by text`,
    `alter table feedback add column if not exists moderated_at timestamptz`,
    `alter table feedback add column if not exists moderation_note text`,
    `create index if not exists feedback_reports_feedback_idx on feedback_reports (feedback_id, created_at desc)`,
    `create table if not exists favorites (
      id text primary key,
      user_id text not null,
      target_type text not null check (target_type in ('AUTHOR', 'SERIES')),
      target_id text not null,
      created_at timestamptz not null default now(),
      unique (user_id, target_type, target_id)
    )`,
    `create table if not exists reader_events (
      id text primary key,
      user_id text,
      anonymous_id text,
      event_type text not null check (event_type in ('VIEW', 'READ_START', 'READ_COMPLETE', 'RETURN_VISIT')),
      target_type text not null check (target_type in ('AUTHOR', 'SERIES', 'EPISODE')),
      target_id text not null,
      metadata jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )`,
    `create index if not exists reader_events_target_created_idx on reader_events (target_type, target_id, created_at desc)`,
    `create table if not exists reader_activity_daily (
      activity_date date not null,
      target_type text not null,
      target_id text not null,
      views integer not null default 0,
      read_starts integer not null default 0,
      read_completes integer not null default 0,
      return_visits integer not null default 0,
      updated_at timestamptz not null default now(),
      primary key (activity_date, target_type, target_id)
    )`,
    `create table if not exists asset_objects (
      id text primary key,
      author_id text not null,
      object_key text not null,
      public_url text,
      original_filename text,
      mime_type text,
      byte_size integer,
      status text not null default 'REGISTERED' check (status in ('REGISTERED', 'READY', 'FAILED', 'DELETED')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create index if not exists asset_objects_author_created_idx on asset_objects (author_id, created_at desc)`,
    `create table if not exists publication_reviews (
      id text primary key,
      target_type text not null check (target_type in ('SERIES', 'EPISODE')),
      target_id text not null,
      author_id text not null,
      status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REVISION_REQUESTED', 'PUBLISHED', 'REJECTED')),
      requested_by text,
      reviewed_by text,
      review_note text,
      requested_at timestamptz not null default now(),
      reviewed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create index if not exists publication_reviews_status_created_idx on publication_reviews (status, created_at desc)`,
    `create table if not exists publication_snapshots (
      id text primary key,
      source text not null default 'database',
      status text not null default 'GENERATED' check (status in ('GENERATED', 'PUBLISHED', 'ROLLED_BACK')),
      catalog_json jsonb not null,
      generated_by text,
      generated_at timestamptz not null default now(),
      published_at timestamptz
    )`,
    `create table if not exists content_goals (
      id text primary key,
      target_type text not null check (target_type in ('AUTHOR', 'SERIES', 'EPISODE')),
      target_id text not null,
      metric text not null check (metric in ('VIEWS', 'READ_COMPLETES', 'FAVORITES', 'FEEDBACK')),
      goal_value integer not null check (goal_value >= 0),
      starts_at timestamptz,
      ends_at timestamptz,
      created_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `create table if not exists content_scores (
      target_type text not null,
      target_id text not null,
      score integer not null default 0,
      metrics jsonb not null default '{}'::jsonb,
      refreshed_at timestamptz not null default now(),
      primary key (target_type, target_id)
    )`
  ];

  for (const statement of statements) {
    await query(statement);
  }
}

module.exports = {
  ensurePlatformSchema,
  missingStore
};
