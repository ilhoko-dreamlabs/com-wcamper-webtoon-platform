const crypto = require("node:crypto");
const { query, transaction } = require("./db");
const { requiredString, optionalUrl } = require("./validation");

const SERIES_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const EPISODE_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);

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

function tableMissing(error) {
  return ["42P01", "42703", "DB_NOT_CONFIGURED", "3D000", "ECONNREFUSED", "ENOTFOUND"].includes(error.code);
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

async function ensureCreatorSchema() {
  if (!schemaReady) {
    schemaReady = query(`
      create table if not exists authors (
        id text primary key,
        user_id text not null unique,
        display_name text not null,
        bio text not null default '',
        status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED')),
        approved_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists feedback (
        id text primary key,
        user_id text not null,
        target_type text not null check (target_type in ('AUTHOR', 'SERIES', 'EPISODE')),
        target_id text not null,
        body text not null,
        status text not null default 'VISIBLE' check (status in ('VISIBLE', 'HIDDEN', 'DELETED', 'REPORTED')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists feedback_target_created_idx
        on feedback (target_type, target_id, created_at desc);

      create table if not exists webtoon_series (
        id text primary key,
        author_id text not null references authors(id) on delete cascade,
        title text not null,
        summary text not null,
        genre text not null default '',
        tags jsonb not null default '[]'::jsonb,
        cover_url text,
        status text not null default 'DRAFT' check (status in ('DRAFT', 'REVIEW_REQUESTED', 'REVISION_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
        review_note text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists webtoon_series_author_updated_idx
        on webtoon_series (author_id, updated_at desc);

      create table if not exists webtoon_episodes (
        id text primary key,
        series_id text not null references webtoon_series(id) on delete cascade,
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
        updated_at timestamptz not null default now(),
        unique (series_id, number)
      );

      create index if not exists webtoon_episodes_series_number_idx
        on webtoon_episodes (series_id, number asc);
    `).catch((error) => {
      schemaReady = null;
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

async function ensureAuthorRecord(authorContext, tx = query) {
  if (tx === query) {
    await ensureCreatorSchema();
  }

  const author = authorContext.author;
  const id = author.id || crypto.randomUUID();
  const displayName = author.displayName || authorContext.user?.displayName || authorContext.user?.name || "WCAMPER 작가";

  try {
    const result = await tx(
      `insert into authors (id, user_id, display_name, bio, status, approved_at, updated_at)
       values ($1, $2, $3, '', 'ACTIVE', now(), now())
       on conflict (user_id)
       do update set display_name = coalesce(nullif(excluded.display_name, ''), authors.display_name),
                     status = case when authors.status = 'SUSPENDED' then authors.status else 'ACTIVE' end,
                     updated_at = now()
       returning id, user_id as "userId", display_name as "displayName", status, approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, authorContext.user.id, displayName]
    );

    const row = result.rows[0];
    if (row.status !== "ACTIVE") {
      throw Object.assign(new Error("Author is not active"), {
        statusCode: 403,
        code: "AUTHOR_FORBIDDEN",
        publicMessage: "승인 작가 권한이 없습니다."
      });
    }
    return row;
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

function serializeSeries(row) {
  return {
    id: row.id,
    authorId: row.authorId,
    title: row.title,
    summary: row.summary,
    genre: row.genre,
    tags: row.tags || [],
    coverUrl: row.coverUrl,
    status: row.status,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function serializeEpisode(row) {
  return {
    id: row.id,
    seriesId: row.seriesId,
    number: row.number,
    title: row.title,
    summary: row.summary,
    draftBody: row.draftBody,
    contentUrl: row.contentUrl,
    status: row.status,
    reviewNote: row.reviewNote,
    scheduledAt: row.scheduledAt,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function seriesSelectSql(whereClause) {
  return `select webtoon_series.id, author_id as "authorId", title, summary, genre, tags, cover_url as "coverUrl",
                 status, review_note as "reviewNote", created_at as "createdAt", updated_at as "updatedAt"
          from webtoon_series
          ${whereClause}`;
}

function episodeSelectSql(whereClause) {
  return `select webtoon_episodes.id, series_id as "seriesId", number, title, summary, draft_body as "draftBody",
                 content_url as "contentUrl", webtoon_episodes.status, webtoon_episodes.review_note as "reviewNote",
                 scheduled_at as "scheduledAt", published_at as "publishedAt",
                 webtoon_episodes.created_at as "createdAt", webtoon_episodes.updated_at as "updatedAt"
          from webtoon_episodes
          ${whereClause}`;
}

async function listCreatorSeries(authorId) {
  try {
    const result = await query(`${seriesSelectSql("where author_id = $1")} order by updated_at desc`, [authorId]);
    return result.rows.map(serializeSeries);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function getCreatorSeries(authorId, seriesId) {
  try {
    const result = await query(`${seriesSelectSql("where author_id = $1 and id = $2")} limit 1`, [authorId, seriesId]);
    return result.rows[0] ? serializeSeries(result.rows[0]) : null;
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function createCreatorSeries(authorId, body) {
  const title = requiredString(body.title, "title", 2, 120);
  const summary = requiredString(body.summary, "summary", 10, 1000);
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
    const result = await query(`${episodeSelectSql("where series_id = $1")} order by number asc, created_at asc`, [seriesId]);
    return result.rows.map(serializeEpisode);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function getCreatorEpisode(authorId, episodeId) {
  try {
    const result = await query(
      `${episodeSelectSql("join webtoon_series s on s.id = webtoon_episodes.series_id where s.author_id = $1 and webtoon_episodes.id = $2")} limit 1`,
      [authorId, episodeId]
    );
    return result.rows[0] ? serializeEpisode(result.rows[0]) : null;
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function createCreatorEpisode(authorId, seriesId, body) {
  const series = await getCreatorSeries(authorId, seriesId);
  if (!series) return null;
  const number = Number.parseInt(body.number, 10);
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
    const result = await query(
      `with inserted as (
         insert into webtoon_episodes (id, series_id, number, title, summary, draft_body, content_url, status)
         values ($1, $2, $3, $4, $5, $6, $7, 'DRAFT')
         returning id
       )
       ${episodeSelectSql("join inserted on inserted.id = webtoon_episodes.id")}`,
      [id, seriesId, number, title, summary, draftBody, contentUrl]
    );
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
    const result = await transaction(async (tx) => {
      await tx(
        `update webtoon_series
         set status = case when status = 'DRAFT' then 'REVIEW_REQUESTED' else status end,
             updated_at = now()
         where author_id = $1 and id = $2`,
        [authorId, current.seriesId]
      );
      return tx(
        `with updated as (
           update webtoon_episodes
           set status = 'REVIEW_REQUESTED', review_requested_at = now(), updated_at = now()
           where id = $2 and series_id in (select id from webtoon_series where author_id = $1)
           returning id
         )
         ${episodeSelectSql("join updated on updated.id = webtoon_episodes.id")}`,
        [authorId, episodeId]
      );
    });
    return serializeEpisode(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function creatorSummary(authorId) {
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
         where f.target_type = 'AUTHOR' and f.target_id = $1
            or f.target_type = 'SERIES' and f.target_id in (select id from webtoon_series where author_id = $1)
            or f.target_type = 'EPISODE' and f.target_id in (
              select e.id from webtoon_episodes e join webtoon_series s on s.id = e.series_id where s.author_id = $1
            )`,
        [authorId]
      )
    ]);

    return {
      series: Object.fromEntries(seriesResult.rows.map((row) => [row.status, row.count])),
      episodes: Object.fromEntries(episodeResult.rows.map((row) => [row.status, row.count])),
      feedbackCount: feedbackResult.rows[0]?.count || 0
    };
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

module.exports = {
  ensureAuthorRecord,
  listCreatorSeries,
  getCreatorSeries,
  createCreatorSeries,
  updateCreatorSeries,
  listCreatorEpisodes,
  createCreatorEpisode,
  updateCreatorEpisode,
  requestEpisodeReview,
  creatorSummary,
  normalizeStatus
};
