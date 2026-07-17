const crypto = require("node:crypto");
const {
  buildStaticCatalogImportPlan,
  loadStaticCatalog,
  upsertStaticCatalogSeed
} = require("./catalog-import-service");
const {
  DEFAULT_AUTHOR_ICON,
  groupEpisodesBySeries,
  serializeAuthorProfile,
  serializeEpisode,
  serializeEpisodeImage,
  serializeSeries
} = require("./creator-read-model");
const {
  episodeSelectSql,
  findCreatorProfile,
  findEpisodeByAuthor,
  findSeriesByAuthor,
  listEpisodesBySeries,
  listImagesByEpisode,
  listSeriesByAuthor,
  listWorkspaceEpisodes,
  seriesSelectSql
} = require("./creator-repository");
const { query, transaction } = require("./db");
const { ensurePlatformSchema } = require("./platform-schema");
const { requiredString, optionalUrl } = require("./validation");

const SERIES_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const EPISODE_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const DEFAULT_CATALOG_OWNER_EMAILS = ["ilho.ko@dreamlabs.co.kr"];

let schemaReady;

function normalizeStatus(value, allowed, fallback = "DRAFT") {
  const status = typeof value === "string" ? value.trim().toUpperCase() : fallback;
  if (!allowed.has(status)) {
    throw Object.assign(new Error("Invalid creator content status"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "상태값을 확인해주세요."
    });
  }
  return status;
}

function optionalString(value, maxLength) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length > maxLength) {
    throw Object.assign(new Error("Text is too long"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "입력값 길이를 확인해주세요."
    });
  }
  return normalized;
}

function optionalAssetUrl(value, name) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;
  if (normalized.startsWith("/")) return normalized.slice(0, 500);
  return optionalUrl(normalized, name);
}

function optionalBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return fallback;
}

function authorHandleFrom(value, fallback) {
  const base = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return String(base || "creator")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "creator";
}

function normalizeTags(value) {
  const tags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return tags
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function initialCatalogOwnerEmails() {
  return new Set([
    ...DEFAULT_CATALOG_OWNER_EMAILS,
    ...(process.env.WEBTOON_INITIAL_CATALOG_OWNER_EMAILS || "").split(/[,\s]+/)
  ].map(normalizeEmail).filter(Boolean));
}

function emailFromAuthorContext(authorContext) {
  return normalizeEmail(
    authorContext?.user?.email ||
    authorContext?.user?.claims?.email ||
    authorContext?.claims?.email
  );
}

function shouldAttachInitialCatalog(authorContext) {
  return initialCatalogOwnerEmails().has(emailFromAuthorContext(authorContext));
}

function tableMissing(error) {
  return ["42P01", "42703", "42P10", "3D000", "ECONNREFUSED", "ENOTFOUND"].includes(error.code);
}

function creatorStoreNotReady(error) {
  return Object.assign(new Error("creator content store is not available"), {
    statusCode: 503,
    code: "CREATOR_STORE_NOT_READY",
    publicMessage: tableMissing(error)
      ? "작가 콘텐츠 저장소가 아직 준비되지 않았습니다."
      : "작가 콘텐츠 저장소를 사용할 수 없습니다."
  });
}

function safeDbError(error) {
  return {
    code: error.code || "UNKNOWN",
    table: error.table || null,
    column: error.column || null,
    constraint: error.constraint || null,
    routine: error.routine || null
  };
}

async function ensureCreatorSchema() {
  if (!schemaReady) {
    schemaReady = ensureCreatorSchemaStatements().catch((error) => {
      schemaReady = null;
      console.error("creator schema bootstrap failed", {
        code: error.code,
        routine: error.routine,
        constraint: error.constraint,
        table: error.table,
        column: error.column
      });
      throw error;
    });
  }

  try {
    await schemaReady;
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function creatorStoreDiagnostics() {
  try {
    await ensureCreatorSchema();
    const result = await query(
      `select
         to_regclass('public.authors') is not null as authors_ready,
         to_regclass('public.feedback') is not null as feedback_ready,
         to_regclass('public.webtoon_series') is not null as series_ready,
         to_regclass('public.webtoon_episodes') is not null as episodes_ready,
         to_regclass('public.episode_images') is not null as episode_images_ready,
         to_regclass('public.creator_dashboard_counts') is not null as dashboard_counts_ready`
    );

    return {
      ready: true,
      tables: {
        authors: Boolean(result.rows[0]?.authors_ready),
        feedback: Boolean(result.rows[0]?.feedback_ready),
        webtoonSeries: Boolean(result.rows[0]?.series_ready),
        webtoonEpisodes: Boolean(result.rows[0]?.episodes_ready),
        episodeImages: Boolean(result.rows[0]?.episode_images_ready),
        creatorDashboardCounts: Boolean(result.rows[0]?.dashboard_counts_ready)
      }
    };
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      return {
        ready: false,
        error: {
          code: "DB_NOT_CONFIGURED",
          message: "웹툰 DB 환경변수가 운영 배포에 설정되지 않았습니다."
        }
      };
    }

    return {
      ready: false,
      error: safeDbError(error)
    };
  }
}

async function ensureCreatorSchemaStatements() {
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
    `alter table authors add column if not exists id text`,
    `alter table authors add column if not exists user_id text`,
    `alter table authors add column if not exists display_name text not null default 'WCAMPER 작가'`,
    `alter table authors add column if not exists bio text not null default ''`,
    `alter table authors add column if not exists handle text`,
    `alter table authors add column if not exists icon_url text`,
    `alter table authors add column if not exists public_page_enabled boolean not null default true`,
    `alter table authors add column if not exists status text not null default 'PENDING'`,
    `alter table authors add column if not exists approved_at timestamptz`,
    `alter table authors add column if not exists created_at timestamptz not null default now()`,
    `alter table authors add column if not exists updated_at timestamptz not null default now()`,

    `create table if not exists feedback (
      id text primary key,
      user_id text not null,
      target_type text not null check (target_type in ('AUTHOR', 'SERIES', 'EPISODE')),
      target_id text not null,
      body text not null,
      status text not null default 'VISIBLE' check (status in ('VISIBLE', 'HIDDEN', 'DELETED', 'REPORTED')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `alter table feedback add column if not exists id text`,
    `alter table feedback add column if not exists user_id text`,
    `alter table feedback add column if not exists target_type text`,
    `alter table feedback add column if not exists target_id text`,
    `alter table feedback add column if not exists body text`,
    `alter table feedback add column if not exists status text not null default 'VISIBLE'`,
    `alter table feedback add column if not exists created_at timestamptz not null default now()`,
    `alter table feedback add column if not exists updated_at timestamptz not null default now()`,
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
    `alter table webtoon_series add column if not exists id text`,
    `alter table webtoon_series add column if not exists author_id text`,
    `alter table webtoon_series add column if not exists title text not null default ''`,
    `alter table webtoon_series add column if not exists summary text not null default ''`,
    `alter table webtoon_series add column if not exists genre text not null default ''`,
    `alter table webtoon_series add column if not exists tags jsonb not null default '[]'::jsonb`,
    `alter table webtoon_series add column if not exists cover_url text`,
    `alter table webtoon_series add column if not exists status text not null default 'DRAFT'`,
    `alter table webtoon_series add column if not exists review_note text`,
    `alter table webtoon_series add column if not exists created_at timestamptz not null default now()`,
    `alter table webtoon_series add column if not exists updated_at timestamptz not null default now()`,
    `create index if not exists webtoon_series_author_updated_idx on webtoon_series (author_id, updated_at desc)`,

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
    `alter table webtoon_episodes add column if not exists id text`,
    `alter table webtoon_episodes add column if not exists series_id text`,
    `alter table webtoon_episodes add column if not exists number integer not null default 1`,
    `alter table webtoon_episodes add column if not exists title text not null default ''`,
    `alter table webtoon_episodes add column if not exists summary text not null default ''`,
    `alter table webtoon_episodes add column if not exists draft_body text not null default ''`,
    `alter table webtoon_episodes add column if not exists content_url text`,
    `alter table webtoon_episodes add column if not exists status text not null default 'DRAFT'`,
    `alter table webtoon_episodes add column if not exists review_note text`,
    `alter table webtoon_episodes add column if not exists review_requested_at timestamptz`,
    `alter table webtoon_episodes add column if not exists scheduled_at timestamptz`,
    `alter table webtoon_episodes add column if not exists published_at timestamptz`,
    `alter table webtoon_episodes add column if not exists created_at timestamptz not null default now()`,
    `alter table webtoon_episodes add column if not exists updated_at timestamptz not null default now()`,
    `create index if not exists webtoon_episodes_series_number_idx on webtoon_episodes (series_id, number asc)`,

    `create table if not exists episode_images (
      id text primary key,
      episode_id text not null references webtoon_episodes(id) on delete cascade,
      sort_order integer not null default 1,
      image_url text not null,
      alt_text text not null default '',
      gap_after integer not null default 0,
      background_color text not null default '#ffffff',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `alter table episode_images add column if not exists id text`,
    `alter table episode_images add column if not exists episode_id text`,
    `alter table episode_images add column if not exists sort_order integer not null default 1`,
    `alter table episode_images add column if not exists image_url text not null default ''`,
    `alter table episode_images add column if not exists alt_text text not null default ''`,
    `alter table episode_images add column if not exists gap_after integer not null default 0`,
    `alter table episode_images add column if not exists background_color text not null default '#ffffff'`,
    `alter table episode_images add column if not exists created_at timestamptz not null default now()`,
    `alter table episode_images add column if not exists updated_at timestamptz not null default now()`,
    `create index if not exists episode_images_episode_order_idx on episode_images (episode_id, sort_order asc)`,

    `create table if not exists creator_dashboard_counts (
      author_id text primary key,
      series_counts jsonb not null default '{}'::jsonb,
      episode_counts jsonb not null default '{}'::jsonb,
      feedback_count integer not null default 0,
      refreshed_at timestamptz not null default now()
    )`
  ];

  for (const statement of statements) {
    await query(statement);
  }
}

async function ensureAuthorRecord(authorContext, tx = query) {
  if (tx === query) {
    await ensureCreatorSchema();
  }

  const author = authorContext.author;
  const id = author.id || crypto.randomUUID();
  const displayName = author.displayName || authorContext.user?.displayName || authorContext.user?.name || "WCAMPER 작가";

  try {
    const existing = await tx(
      `select id
       from authors
       where user_id = $1
       order by created_at desc nulls last
       limit 1`,
      [authorContext.user.id]
    );

    const result = existing.rows[0]
      ? await tx(
        `update authors
         set id = coalesce(id, $2),
             display_name = coalesce(nullif($3, ''), display_name),
             status = case when status = 'SUSPENDED' then status else 'ACTIVE' end,
             updated_at = now()
         where user_id = $1
         returning id, user_id as "userId", display_name as "displayName", bio, handle, icon_url as "iconUrl",
                   public_page_enabled as "publicPageEnabled", status, approved_at as "approvedAt",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [authorContext.user.id, id, displayName]
      )
      : await tx(
        `insert into authors (id, user_id, display_name, bio, handle, icon_url, public_page_enabled, status, approved_at, updated_at)
         values ($1, $2, $3, '', $4, $5, true, 'ACTIVE', now(), now())
         returning id, user_id as "userId", display_name as "displayName", bio, handle, icon_url as "iconUrl",
                   public_page_enabled as "publicPageEnabled", status, approved_at as "approvedAt",
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [id, authorContext.user.id, displayName, authorHandleFrom(authorContext.user?.email || displayName, id), DEFAULT_AUTHOR_ICON]
      );

    const row = result.rows[0];
    if (row.status !== "ACTIVE") {
      throw Object.assign(new Error("Author is not active"), {
        statusCode: 403,
        code: "AUTHOR_FORBIDDEN",
        publicMessage: "승인 작가 권한이 없습니다."
      });
    }
    if (tx === query && shouldAttachInitialCatalog(authorContext)) {
      await attachInitialPublishedCatalog(row.id);
    }
    return row;
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function attachInitialPublishedCatalog(authorId) {
  try {
    const catalog = loadStaticCatalog();
    const plan = buildStaticCatalogImportPlan(catalog);

    await transaction(async (tx) => {
      await upsertStaticCatalogSeed(tx, plan, { authorId });
    });
    await refreshCreatorDashboardCounts(authorId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function getCreatorProfile(authorId) {
  try {
    return findCreatorProfile(authorId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function updateCreatorProfile(authorId, body) {
  const current = await getCreatorProfile(authorId);
  if (!current) return null;

  const displayName = requiredString(body.displayName ?? current.displayName, "displayName", 2, 80);
  const bio = optionalString(body.bio ?? current.bio, 1000);
  const handle = authorHandleFrom(body.handle ?? current.handle, authorId);
  const iconUrl = optionalAssetUrl(body.iconUrl ?? current.iconUrl, "iconUrl") || DEFAULT_AUTHOR_ICON;
  const publicPageEnabled = optionalBoolean(body.publicPageEnabled, current.publicPageEnabled);

  try {
    const result = await query(
      `update authors
       set display_name = $2,
           bio = $3,
           handle = $4,
           icon_url = $5,
           public_page_enabled = $6,
           updated_at = now()
       where id = $1
       returning id, user_id as "userId", display_name as "displayName", bio, handle, icon_url as "iconUrl",
                 public_page_enabled as "publicPageEnabled", status, approved_at as "approvedAt",
                 updated_at as "updatedAt"`,
      [authorId, displayName, bio, handle, iconUrl, publicPageEnabled]
    );
    return serializeAuthorProfile(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function listCreatorSeries(authorId) {
  try {
    return listSeriesByAuthor(authorId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function getCreatorSeries(authorId, seriesId) {
  try {
    return findSeriesByAuthor(authorId, seriesId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function createCreatorSeries(authorId, body) {
  const title = requiredString(body.title, "title", 2, 120);
  const summary = optionalString(body.summary, 1000) || `${title} 작품 소개를 입력해주세요.`;
  const genre = optionalString(body.genre, 80);
  const tags = normalizeTags(body.tags);
  const coverUrl = optionalUrl(body.coverUrl, "coverUrl");
  const id = crypto.randomUUID();

  try {
    const result = await query(
      `with inserted as (
         insert into webtoon_series (id, author_id, title, summary, genre, tags, cover_url, status)
         values ($1, $2, $3, $4, $5, $6::jsonb, $7, 'DRAFT')
         returning id
       )
       ${seriesSelectSql("join inserted on inserted.id = webtoon_series.id")}`,
      [id, authorId, title, summary, genre, JSON.stringify(tags), coverUrl]
    );
    await refreshCreatorDashboardCounts(authorId);
    return serializeSeries(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function updateCreatorSeries(authorId, seriesId, body) {
  const current = await getCreatorSeries(authorId, seriesId);
  if (!current) return null;
  if (!["DRAFT", "REVISION_REQUESTED"].includes(current.status)) {
    throw Object.assign(new Error("Series is locked"), {
      statusCode: 409,
      code: "SERIES_LOCKED",
      publicMessage: "검수 중이거나 공개 단계인 작품은 작가가 직접 수정할 수 없습니다."
    });
  }

  const title = requiredString(body.title ?? current.title, "title", 2, 120);
  const summary = requiredString(body.summary ?? current.summary, "summary", 10, 1000);
  const genre = optionalString(body.genre ?? current.genre, 80);
  const tags = body.tags === undefined ? current.tags : normalizeTags(body.tags);
  const coverUrl = optionalUrl(body.coverUrl ?? current.coverUrl, "coverUrl");

  try {
    const result = await query(
      `with updated as (
         update webtoon_series
         set title = $3, summary = $4, genre = $5, tags = $6::jsonb, cover_url = $7, updated_at = now()
         where author_id = $1 and id = $2
         returning id
       )
       ${seriesSelectSql("join updated on updated.id = webtoon_series.id")}`,
      [authorId, seriesId, title, summary, genre, JSON.stringify(tags), coverUrl]
    );
    await refreshCreatorDashboardCounts(authorId);
    return serializeSeries(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function listCreatorEpisodes(authorId, seriesId) {
  const series = await getCreatorSeries(authorId, seriesId);
  if (!series) return null;

  try {
    return listEpisodesBySeries(seriesId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function getCreatorEpisode(authorId, episodeId) {
  try {
    return findEpisodeByAuthor(authorId, episodeId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function createCreatorEpisode(authorId, seriesId, body) {
  const series = await getCreatorSeries(authorId, seriesId);
  if (!series) return null;
  let number = Number.parseInt(body.number, 10);
  if (!body.number) {
    const nextNumber = await query(
      `select coalesce(max(number), 0) + 1 as number
       from webtoon_episodes
       where series_id = $1`,
      [seriesId]
    );
    number = Number.parseInt(nextNumber.rows[0]?.number, 10);
  }
  if (!Number.isInteger(number) || number < 1 || number > 9999) {
    throw Object.assign(new Error("Invalid episode number"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "회차 번호를 확인해주세요."
    });
  }
  const title = requiredString(body.title, "title", 2, 120);
  const summary = optionalString(body.summary, 1000);
  const draftBody = optionalString(body.draftBody, 12000);
  const contentUrl = optionalUrl(body.contentUrl, "contentUrl");
  const id = crypto.randomUUID();

  try {
    const duplicate = await query(
      `select id
       from webtoon_episodes
       where series_id = $1 and number = $2
       limit 1`,
      [seriesId, number]
    );
    if (duplicate.rows[0]) {
      throw Object.assign(new Error("Episode number already exists"), {
        statusCode: 409,
        code: "EPISODE_NUMBER_EXISTS",
        publicMessage: "이미 등록된 회차 번호입니다."
      });
    }

    const result = await query(
      `with inserted as (
         insert into webtoon_episodes (id, series_id, number, title, summary, draft_body, content_url, status)
         values ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
         returning id
       )
       ${episodeSelectSql("join inserted on inserted.id = webtoon_episodes.id")}`,
      [id, seriesId, number, title, summary, draftBody, contentUrl]
    );
    await refreshCreatorDashboardCounts(authorId);
    return serializeEpisode(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Episode number already exists"), {
        statusCode: 409,
        code: "EPISODE_NUMBER_EXISTS",
        publicMessage: "이미 등록된 회차 번호입니다."
      });
    }
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function updateCreatorEpisode(authorId, episodeId, body) {
  const current = await getCreatorEpisode(authorId, episodeId);
  if (!current) return null;
  if (!["DRAFT", "REVISION_REQUESTED"].includes(current.status)) {
    throw Object.assign(new Error("Episode is locked"), {
      statusCode: 409,
      code: "EPISODE_LOCKED",
      publicMessage: "검수 중이거나 공개 단계인 회차는 작가가 직접 수정할 수 없습니다."
    });
  }

  const number = body.number === undefined ? current.number : Number.parseInt(body.number, 10);
  if (!Number.isInteger(number) || number < 1 || number > 9999) {
    throw Object.assign(new Error("Invalid episode number"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "회차 번호를 확인해주세요."
    });
  }
  const title = requiredString(body.title ?? current.title, "title", 2, 120);
  const summary = optionalString(body.summary ?? current.summary, 1000);
  const draftBody = optionalString(body.draftBody ?? current.draftBody, 12000);
  const contentUrl = optionalUrl(body.contentUrl ?? current.contentUrl, "contentUrl");

  try {
    const result = await query(
      `with updated as (
         update webtoon_episodes
         set number = $3, title = $4, summary = $5, draft_body = $6, content_url = $7, updated_at = now()
         where id = $2 and series_id in (select id from webtoon_series where author_id = $1)
         returning id
       )
       ${episodeSelectSql("join updated on updated.id = webtoon_episodes.id")}`,
      [authorId, episodeId, number, title, summary, draftBody, contentUrl]
    );
    await refreshCreatorDashboardCounts(authorId);
    return serializeEpisode(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      throw Object.assign(new Error("Episode number already exists"), {
        statusCode: 409,
        code: "EPISODE_NUMBER_EXISTS",
        publicMessage: "이미 등록된 회차 번호입니다."
      });
    }
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function requestEpisodeReview(authorId, episodeId) {
  const current = await getCreatorEpisode(authorId, episodeId);
  if (!current) return null;
  if (!["DRAFT", "REVISION_REQUESTED"].includes(current.status)) {
    throw Object.assign(new Error("Episode cannot request review"), {
      statusCode: 409,
      code: "EPISODE_REVIEW_NOT_ALLOWED",
      publicMessage: "현재 상태에서는 검수 요청을 할 수 없습니다."
    });
  }

  try {
    await ensurePlatformSchema();
    const result = await transaction(async (tx) => {
      await tx(
        `update webtoon_series
         set status = case when status = 'DRAFT' then 'REVIEW_REQUESTED' else status end,
             updated_at = now()
         where author_id = $1 and id = $2`,
        [authorId, current.seriesId]
      );
      const updated = await tx(
        `with updated as (
           update webtoon_episodes
           set status = 'REVIEW_REQUESTED', review_requested_at = now(), updated_at = now()
           where id = $2 and series_id in (select id from webtoon_series where author_id = $1)
           returning id
         )
         ${episodeSelectSql("join updated on updated.id = webtoon_episodes.id")}`,
        [authorId, episodeId]
      );
      await tx(
        `insert into publication_reviews (id, target_type, target_id, author_id, status, requested_by, requested_at, updated_at)
         values ($1, 'EPISODE', $2, $3, 'REQUESTED', $4, now(), now())`,
        [crypto.randomUUID(), episodeId, authorId, authorId]
      );
      return updated;
    });
    await refreshCreatorDashboardCounts(authorId);
    return serializeEpisode(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function listCreatorAssets(authorId) {
  try {
    await ensurePlatformSchema();
    const result = await query(
      `select id, author_id as "authorId", object_key as "objectKey", public_url as "publicUrl",
              original_filename as "originalFilename", mime_type as "mimeType", byte_size as "byteSize",
              status, created_at as "createdAt", updated_at as "updatedAt"
       from asset_objects
       where author_id = $1 and status <> 'DELETED'
       order by created_at desc
       limit 100`,
      [authorId]
    );
    return result.rows;
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function createCreatorAsset(authorId, body) {
  const publicUrl = optionalAssetUrl(body.publicUrl || body.url, "publicUrl");
  if (!publicUrl) {
    throw Object.assign(new Error("publicUrl is required"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "자산 URL을 입력해주세요."
    });
  }

  const originalFilename = optionalString(body.originalFilename || body.filename || "", 240) || null;
  const mimeType = optionalString(body.mimeType || "", 120) || null;
  const byteSize = body.byteSize === undefined ? null : Math.max(0, Number.parseInt(body.byteSize, 10) || 0);
  const objectKey = optionalString(body.objectKey || publicUrl, 500) || publicUrl;
  const id = crypto.randomUUID();

  try {
    await ensurePlatformSchema();
    const result = await query(
      `insert into asset_objects (id, author_id, object_key, public_url, original_filename, mime_type, byte_size, status, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'READY', now())
       returning id, author_id as "authorId", object_key as "objectKey", public_url as "publicUrl",
                 original_filename as "originalFilename", mime_type as "mimeType", byte_size as "byteSize",
                 status, created_at as "createdAt", updated_at as "updatedAt"`,
      [id, authorId, objectKey, publicUrl, originalFilename, mimeType, byteSize]
    );
    return result.rows[0];
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function listEpisodeImages(authorId, episodeId) {
  const episode = await getCreatorEpisode(authorId, episodeId);
  if (!episode) return null;

  try {
    return listImagesByEpisode(episodeId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function createEpisodeImage(authorId, episodeId, body) {
  const episode = await getCreatorEpisode(authorId, episodeId);
  if (!episode) return null;

  const imageUrl = optionalUrl(body.imageUrl, "imageUrl");
  if (!imageUrl) {
    throw Object.assign(new Error("imageUrl is required"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "이미지 URL을 입력해주세요."
    });
  }
  const altText = optionalString(body.altText, 300);
  const gapAfter = Math.max(0, Math.min(240, Number.parseInt(body.gapAfter || "0", 10) || 0));
  const backgroundColor = optionalString(body.backgroundColor || "#ffffff", 24) || "#ffffff";
  const id = crypto.randomUUID();

  try {
    const nextOrder = await query(
      `select coalesce(max(sort_order), 0) + 1 as sort_order
       from episode_images
       where episode_id = $1`,
      [episodeId]
    );
    const result = await query(
      `insert into episode_images (id, episode_id, sort_order, image_url, alt_text, gap_after, background_color, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       returning id, episode_id as "episodeId", sort_order as "sortOrder", image_url as "imageUrl",
                 alt_text as "altText", gap_after as "gapAfter", background_color as "backgroundColor",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [id, episodeId, nextOrder.rows[0]?.sort_order || 1, imageUrl, altText, gapAfter, backgroundColor]
    );
    return serializeEpisodeImage(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function updateEpisodeImage(authorId, imageId, body) {
  try {
    const current = await query(
      `select i.id, i.episode_id as "episodeId", i.sort_order as "sortOrder", i.image_url as "imageUrl",
              i.alt_text as "altText", i.gap_after as "gapAfter", i.background_color as "backgroundColor"
       from episode_images i
       join webtoon_episodes e on e.id = i.episode_id
       join webtoon_series s on s.id = e.series_id
       where s.author_id = $1 and i.id = $2
       limit 1`,
      [authorId, imageId]
    );
    if (!current.rows[0]) return null;

    const row = current.rows[0];
    const sortOrder = body.sortOrder === undefined ? row.sortOrder : Math.max(1, Math.min(9999, Number.parseInt(body.sortOrder, 10) || row.sortOrder));
    const imageUrl = optionalUrl(body.imageUrl ?? row.imageUrl, "imageUrl");
    const altText = optionalString(body.altText ?? row.altText, 300);
    const gapAfter = body.gapAfter === undefined ? row.gapAfter : Math.max(0, Math.min(240, Number.parseInt(body.gapAfter, 10) || 0));
    const backgroundColor = optionalString(body.backgroundColor ?? row.backgroundColor, 24) || "#ffffff";

    const result = await query(
      `update episode_images
       set sort_order = $3,
           image_url = $4,
           alt_text = $5,
           gap_after = $6,
           background_color = $7,
           updated_at = now()
       where id = $2
       returning id, episode_id as "episodeId", sort_order as "sortOrder", image_url as "imageUrl",
                 alt_text as "altText", gap_after as "gapAfter", background_color as "backgroundColor",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [authorId, imageId, sortOrder, imageUrl, altText, gapAfter, backgroundColor]
    );
    return serializeEpisodeImage(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function refreshCreatorDashboardCounts(authorId) {
  try {
    const [seriesResult, episodeResult, feedbackResult] = await Promise.all([
      query(
        `select status, count(*)::int as count
         from webtoon_series
         where author_id = $1
         group by status`,
        [authorId]
      ),
      query(
        `select e.status, count(*)::int as count
         from webtoon_episodes e
         join webtoon_series s on s.id = e.series_id
         where s.author_id = $1
         group by e.status`,
        [authorId]
      ),
      query(
        `select count(*)::int as count
         from feedback f
         where (f.target_type = 'AUTHOR' and f.target_id = $1)
            or (f.target_type = 'SERIES' and f.target_id in (select id from webtoon_series where author_id = $1))
            or (f.target_type = 'EPISODE' and f.target_id in (
              select e.id from webtoon_episodes e join webtoon_series s on s.id = e.series_id where s.author_id = $1
            ))`,
        [authorId]
      )
    ]);

    const seriesCounts = Object.fromEntries(seriesResult.rows.map((row) => [row.status, row.count]));
    const episodeCounts = Object.fromEntries(episodeResult.rows.map((row) => [row.status, row.count]));
    const feedbackCount = feedbackResult.rows[0]?.count || 0;

    await query(
      `insert into creator_dashboard_counts (author_id, series_counts, episode_counts, feedback_count, refreshed_at)
       values ($1, $2::jsonb, $3::jsonb, $4, now())
       on conflict (author_id) do update
       set series_counts = excluded.series_counts,
           episode_counts = excluded.episode_counts,
           feedback_count = excluded.feedback_count,
           refreshed_at = now()`,
      [authorId, JSON.stringify(seriesCounts), JSON.stringify(episodeCounts), feedbackCount]
    );

    return {
      series: seriesCounts,
      episodes: episodeCounts,
      feedbackCount,
      refreshedAt: new Date().toISOString()
    };
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function creatorSummary(authorId) {
  try {
    const cached = await query(
      `select series_counts as "seriesCounts", episode_counts as "episodeCounts",
              feedback_count as "feedbackCount", refreshed_at as "refreshedAt"
       from creator_dashboard_counts
       where author_id = $1
       limit 1`,
      [authorId]
    );

    if (cached.rows[0]) {
      return {
        series: cached.rows[0].seriesCounts || {},
        episodes: cached.rows[0].episodeCounts || {},
        feedbackCount: cached.rows[0].feedbackCount || 0,
        refreshedAt: cached.rows[0].refreshedAt
      };
    }

    return refreshCreatorDashboardCounts(authorId);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function creatorWorkspace(authorId, options = {}) {
  const [profile, summary, series, episodes] = await Promise.all([
    getCreatorProfile(authorId),
    creatorSummary(authorId),
    listCreatorSeries(authorId),
    listWorkspaceEpisodes(authorId, options).catch((error) => {
      if (tableMissing(error)) throw creatorStoreNotReady(error);
      throw error;
    })
  ]);

  const episodeImagesByEpisode = {};
  if (options.episodeId && episodes.some((episode) => episode.id === options.episodeId)) {
    episodeImagesByEpisode[options.episodeId] = await listEpisodeImages(authorId, options.episodeId);
  }

  return {
    profile,
    summary,
    series,
    episodesBySeries: groupEpisodesBySeries(episodes),
    episodeImagesByEpisode
  };
}

module.exports = {
  creatorStoreDiagnostics,
  ensureAuthorRecord,
  creatorWorkspace,
  getCreatorProfile,
  updateCreatorProfile,
  listCreatorSeries,
  getCreatorSeries,
  createCreatorSeries,
  updateCreatorSeries,
  listCreatorEpisodes,
  getCreatorEpisode,
  createCreatorEpisode,
  updateCreatorEpisode,
  listEpisodeImages,
  createEpisodeImage,
  updateEpisodeImage,
  listCreatorAssets,
  createCreatorAsset,
  requestEpisodeReview,
  refreshCreatorDashboardCounts,
  creatorSummary,
  normalizeStatus
};
