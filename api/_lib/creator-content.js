const crypto = require("node:crypto");
const { query, transaction } = require("./db");
const { requiredString, optionalUrl } = require("./validation");

const SERIES_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const EPISODE_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const DEFAULT_CATALOG_OWNER_EMAILS = ["ilho.ko@dreamlabs.co.kr"];

const initialPublishedCatalog = {
  series: [
    {
      id: "bd-crew-chat-season-1",
      title: "BD-Crew 단톡방",
      summary: "BD-Crew의 캠핑, 차량, 웹툰 제작, 일상 대화가 단톡방처럼 이어지는 봉달캠퍼 유니버스 시즌 1.",
      genre: "캠핑 일상 코미디",
      tags: ["캠핑", "BD-Crew", "단톡방", "일상 코미디"],
      coverUrl: "/assets/img/covers/bd-crew-chat-season-1-main.png"
    },
    {
      id: "bravo-camp-chat-season-2",
      title: "부라보캠프 단톡방",
      summary: "부라보캠프 멤버들이 캠핑장에서 주고받는 밝은 리액션과 소동을 짧은 컷으로 묶은 시즌 2.",
      genre: "캠핑 단톡방 코미디",
      tags: ["부라보캠프", "캠핑", "단톡방", "시즌 2"],
      coverUrl: "/assets/img/drive/season-2/BRAVOCAMP-WEBTOON-작품페이지.png"
    },
    {
      id: "bongbong-family-camping",
      title: "봉봉패미리 캠핑",
      summary: "가족 캠핑의 작은 준비와 현장 리듬을 봉봉패미리 중심으로 풀어낼 예정작.",
      genre: "가족 캠핑",
      tags: ["봉봉패미리", "가족 캠핑", "기획중"],
      coverUrl: "/assets/img/hero-panel-3.svg",
      status: "DRAFT"
    }
  ],
  episodes: [
    ["2026-07-09-season-1-01", "bd-crew-chat-season-1", 1, "새로운 차량 검사와 즐거운 만남", "새로운 차량 검사와 즐거운 만남으로 BD-Crew 단톡방 시즌이 열린다.", "/episodes/2026-07-09-season-1-01"],
    ["2026-07-09-season-1-02", "bd-crew-chat-season-1", 2, "아침 회의", "웹툰 팀의 행복한 아침 회의가 캠핑 일정과 맞물린다.", "/episodes/2026-07-09-season-1-02"],
    ["2026-07-09-season-1-03", "bd-crew-chat-season-1", 3, "제작 모임", "웹툰 제작 모임과 함께한 하루가 크루의 기록으로 남는다.", "/episodes/2026-07-09-season-1-03"],
    ["2026-07-09-season-1-04", "bd-crew-chat-season-1", 4, "합동 캠핑", "첫 합동 캠핑 대모험에서 각자의 장비와 농담이 한 자리에 모인다.", "/episodes/2026-07-09-season-1-04"],
    ["2026-07-09-season-1-05", "bd-crew-chat-season-1", 5, "먹거리", "캠핑 이야기, 모임, 음식들이 단톡방의 속도를 올린다.", "/episodes/2026-07-09-season-1-05"],
    ["2026-07-09-season-1-06", "bd-crew-chat-season-1", 6, "아침 인사", "따뜻한 아침 인사가 밤새 이어진 대화를 정리한다.", "/episodes/2026-07-09-season-1-06"],
    ["2026-07-09-season-1-07", "bd-crew-chat-season-1", 7, "꿈꾸는 크루", "함께 꿈꾸는 캠핑 프로그래머들이 다음 장면을 상상한다.", "/episodes/2026-07-09-season-1-07"],
    ["2026-07-09-season-1-08", "bd-crew-chat-season-1", 8, "우정", "축구와 우정, 일상 웹툰의 가벼운 리듬이 들어온다.", "/episodes/2026-07-09-season-1-08"],
    ["2026-07-09-season-1-09", "bd-crew-chat-season-1", 9, "금요일", "금요일의 웹툰 이야기가 다음 업로드 기대감을 만든다.", "/episodes/2026-07-09-season-1-09"],
    ["2026-07-09-season-1-10", "bd-crew-chat-season-1", 10, "따뜻한 하루", "캠핑에서의 따뜻한 하루가 시즌의 정서를 잡는다.", "/episodes/2026-07-09-season-1-10"],
    ["2026-07-09-season-1-11", "bd-crew-chat-season-1", 11, "인터뷰", "BD-Crew Weekly 독도인별 인터뷰가 캐릭터의 목소리를 더한다.", "/episodes/2026-07-09-season-1-11"],
    ["2026-07-09-season-1-12", "bd-crew-chat-season-1", 12, "일상", "캠핑과 함께한 BD-Crew 일상이 시즌의 중심으로 이어진다.", "/episodes/2026-07-09-season-1-12"],
    ["2026-07-09-season-1-13", "bd-crew-chat-season-1", 13, "주의 환기", "공무원 사칭 사기 경고가 단톡방의 현실감을 남기며 회차를 닫는다.", "/episodes/2026-07-09-season-1-13"],
    ["2026-07-09-season-2-01", "bravo-camp-chat-season-2", 1, "부라보캠프 첫 소개", "부라보캠프 시즌 2의 전체 캐릭터 로스터와 자기소개를 이어서 보여주는 첫 회차.", "/episodes/2026-07-09-season-2-01"],
    ["2026-07-09-season-2-02", "bravo-camp-chat-season-2", 2, "워킹데드", "캠핑장의 농담이 좀비극 상상으로 번지며 부라보캠프식 코미디 장면을 만든다.", "/episodes/2026-07-09-season-2-02"],
    ["2026-07-09-season-2-03", "bravo-camp-chat-season-2", 3, "데쓰노트", "수다방 평화 유지를 위해 데쓰노트를 꺼내는 장난스러운 캠핑 단톡방 회차.", "/episodes/2026-07-09-season-2-03"],
    ["2026-07-23-bongbong-family-planning", "bongbong-family-camping", 1, "기획중 - 봉봉패미리 캠핑", "봉봉패미리 캠핑은 캐릭터와 첫 에피소드 구조를 기획중입니다.", null, "DRAFT"]
  ]
};

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
  return ["42P01", "42703", "42P10", "DB_NOT_CONFIGURED", "3D000", "ECONNREFUSED", "ENOTFOUND"].includes(error.code);
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

async function ensureCreatorSchemaStatements() {
  const statements = [
    `create table if not exists authors (
      id text primary key,
      user_id text not null unique,
      display_name text not null,
      bio text not null default '',
      status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED')),
      approved_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`,
    `alter table authors add column if not exists id text`,
    `alter table authors add column if not exists user_id text`,
    `alter table authors add column if not exists display_name text not null default 'WCAMPER 작가'`,
    `alter table authors add column if not exists bio text not null default ''`,
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
    `create index if not exists webtoon_episodes_series_number_idx on webtoon_episodes (series_id, number asc)`
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
         returning id, user_id as "userId", display_name as "displayName", status, approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt"`,
        [authorContext.user.id, id, displayName]
      )
      : await tx(
        `insert into authors (id, user_id, display_name, bio, status, approved_at, updated_at)
         values ($1, $2, $3, '', 'ACTIVE', now(), now())
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
    await transaction(async (tx) => {
      for (const series of initialPublishedCatalog.series) {
        const existing = await tx("select id from webtoon_series where id = $1 limit 1", [series.id]);
        const params = [
          series.id,
          authorId,
          series.title,
          series.summary,
          series.genre,
          JSON.stringify(series.tags),
          series.coverUrl,
          series.status || "PUBLISHED"
        ];

        if (existing.rows[0]) {
          await tx(
            `update webtoon_series
             set author_id = $2,
                 title = $3,
                 summary = $4,
                 genre = $5,
                 tags = $6::jsonb,
                 cover_url = $7,
                 status = $8,
                 updated_at = now()
             where id = $1`,
            params
          );
        } else {
          await tx(
            `insert into webtoon_series (id, author_id, title, summary, genre, tags, cover_url, status, updated_at)
             values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, now())`,
            params
          );
        }
      }

      for (const [id, seriesId, number, title, summary, contentUrl, status = "PUBLISHED"] of initialPublishedCatalog.episodes) {
        const existing = await tx("select id from webtoon_episodes where id = $1 limit 1", [id]);
        const params = [id, seriesId, number, title, summary, contentUrl, status];

        if (existing.rows[0]) {
          await tx(
            `update webtoon_episodes
             set series_id = $2,
                 number = $3,
                 title = $4,
                 summary = $5,
                 content_url = $6,
                 status = $7,
                 published_at = case when $7 = 'PUBLISHED' then '2026-07-09'::timestamptz else null end,
                 updated_at = now()
             where id = $1`,
            params
          );
        } else {
          await tx(
            `insert into webtoon_episodes (id, series_id, number, title, summary, content_url, status, published_at, updated_at)
             values ($1, $2, $3, $4, $5, $6, $7, case when $7 = 'PUBLISHED' then '2026-07-09'::timestamptz else null end, now())`,
            params
          );
        }
      }
    });
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
