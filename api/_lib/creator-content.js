const crypto = require("node:crypto");
const { query, transaction } = require("./db");
const { requiredString, optionalUrl } = require("./validation");

const SERIES_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const EPISODE_STATUSES = new Set(["DRAFT", "REVIEW_REQUESTED", "REVISION_REQUESTED", "APPROVED", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const DEFAULT_CATALOG_OWNER_EMAILS = ["ilho.ko@dreamlabs.co.kr"];
const DEFAULT_AUTHOR_ICON = "/assets/img/authors/bongdal-universe-comics-logo.png";

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

function serializeAuthorProfile(row) {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    bio: row.bio || "",
    handle: row.handle || row.id,
    iconUrl: row.iconUrl || DEFAULT_AUTHOR_ICON,
    publicPageEnabled: row.publicPageEnabled !== false,
    status: row.status,
    approvedAt: row.approvedAt,
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

function serializeEpisodeImage(row) {
  return {
    id: row.id,
    episodeId: row.episodeId,
    sortOrder: row.sortOrder,
    imageUrl: row.imageUrl,
    altText: row.altText || "",
    gapAfter: row.gapAfter || 0,
    backgroundColor: row.backgroundColor || "#ffffff",
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

async function getCreatorProfile(authorId) {
  try {
    const result = await query(
      `select id, user_id as "userId", display_name as "displayName", bio, handle, icon_url as "iconUrl",
              public_page_enabled as "publicPageEnabled", status, approved_at as "approvedAt",
              updated_at as "updatedAt"
       from authors
       where id = $1
       limit 1`,
      [authorId]
    );
    return result.rows[0] ? serializeAuthorProfile(result.rows[0]) : null;
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
    await refreshCreatorDashboardCounts(authorId);
    return serializeEpisode(result.rows[0]);
  } catch (error) {
    if (tableMissing(error)) throw creatorStoreNotReady(error);
    throw error;
  }
}

async function listEpisodeImages(authorId, episodeId) {
  const episode = await getCreatorEpisode(authorId, episodeId);
  if (!episode) return null;

  try {
    const result = await query(
      `select id, episode_id as "episodeId", sort_order as "sortOrder", image_url as "imageUrl",
              alt_text as "altText", gap_after as "gapAfter", background_color as "backgroundColor",
              created_at as "createdAt", updated_at as "updatedAt"
       from episode_images
       where episode_id = $1
       order by sort_order asc, created_at asc`,
      [episodeId]
    );
    return result.rows.map(serializeEpisodeImage);
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

module.exports = {
  creatorStoreDiagnostics,
  ensureAuthorRecord,
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
  requestEpisodeReview,
  refreshCreatorDashboardCounts,
  creatorSummary,
  normalizeStatus
};
