const crypto = require("node:crypto");
const { query, transaction } = require("./db");
const { ensurePlatformSchema } = require("./platform-schema");
const { requiredString } = require("./validation");

const IMPORT_STATUSES = new Set([
  "OPEN",
  "DRAFT_READY",
  "SUBMITTED_FOR_REVIEW",
  "REVIEW_APPROVED",
  "RELEASED",
  "FAILED",
  "CANCELLED"
]);

function requireWorkerAuth(request) {
  const expectedToken = process.env.WEBTOON_AUTHORING_MCP_TOKEN;
  if (!expectedToken) {
    throw Object.assign(new Error("Authoring MCP is not configured"), {
      statusCode: 503,
      code: "AUTHORING_MCP_NOT_CONFIGURED",
      publicMessage: "Authoring MCP 인증 설정이 아직 준비되지 않았습니다."
    });
  }

  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!token || token !== expectedToken) {
    throw Object.assign(new Error("Authoring MCP authentication required"), {
      statusCode: 401,
      code: "AUTHORING_MCP_AUTH_REQUIRED",
      publicMessage: "Authoring MCP 인증이 필요합니다."
    });
  }

  return {
    workerId: requiredString(
      request.headers["x-authoring-worker-id"] || process.env.WEBTOON_AUTHORING_MCP_WORKER_ID || "authoring-worker",
      "workerId",
      2,
      120
    )
  };
}

function cleanJsonObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .slice(0, 50)
  );
}

function normalizeAuthorRef(value) {
  const authorRef = cleanJsonObject(value);
  return {
    authorId: typeof authorRef.authorId === "string" ? authorRef.authorId.trim() : "",
    handle: typeof authorRef.handle === "string" ? authorRef.handle.trim() : ""
  };
}

async function findActiveAuthor(authorRef, tx = query) {
  if (authorRef.authorId) {
    const result = await tx(
      `select id, handle, display_name as "displayName", status
       from authors
       where id = $1 and status = 'ACTIVE'
       limit 1`,
      [authorRef.authorId]
    );
    return result.rows[0] || null;
  }

  if (authorRef.handle) {
    const result = await tx(
      `select id, handle, display_name as "displayName", status
       from authors
       where handle = $1 and status = 'ACTIVE'
       limit 1`,
      [authorRef.handle]
    );
    return result.rows[0] || null;
  }

  throw Object.assign(new Error("authorRef is required"), {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    publicMessage: "Authoring MCP 대상 작가를 지정해주세요."
  });
}

async function readIdempotentResult(workerId, toolName, idempotencyKey) {
  const result = await query(
    `select response_json as "responseJson"
     from authoring_idempotency_keys
     where worker_id = $1 and tool_name = $2 and idempotency_key = $3
     limit 1`,
    [workerId, toolName, idempotencyKey]
  );
  return result.rows[0]?.responseJson || null;
}

async function recordEvent(tx, importId, workerId, toolName, eventType, metadata = {}) {
  await tx(
    `insert into authoring_import_events (id, import_id, worker_id, tool_name, event_type, metadata)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [crypto.randomUUID(), importId, workerId, toolName, eventType, JSON.stringify(cleanJsonObject(metadata))]
  );
}

async function createAuthoringImport(worker, body) {
  await ensurePlatformSchema();

  const toolName = "create_authoring_import";
  const idempotencyKey = requiredString(body.idempotencyKey, "idempotencyKey", 4, 160);
  const cached = await readIdempotentResult(worker.workerId, toolName, idempotencyKey);
  if (cached) return { ...cached, idempotentReplay: true };

  const externalJobId = requiredString(body.externalJobId || idempotencyKey, "externalJobId", 2, 200);
  const source = cleanJsonObject(body.source);
  const metadata = cleanJsonObject(body.metadata);
  const authorRef = normalizeAuthorRef(body.authorRef);

  return transaction(async (tx) => {
    const author = await findActiveAuthor(authorRef, tx);
    if (!author) {
      throw Object.assign(new Error("Active author was not found"), {
        statusCode: 404,
        code: "AUTHOR_NOT_FOUND",
        publicMessage: "Authoring MCP 대상 작가를 찾지 못했습니다."
      });
    }

    const importId = crypto.randomUUID();
    const inserted = await tx(
      `insert into authoring_imports (
         id, external_job_id, worker_id, author_id, status, source, metadata, updated_at
       )
       values ($1, $2, $3, $4, 'OPEN', $5::jsonb, $6::jsonb, now())
       on conflict (worker_id, external_job_id) do update
       set updated_at = now()
       returning id, external_job_id as "externalJobId", worker_id as "workerId", author_id as "authorId",
                 status, series_id as "seriesId", episode_id as "episodeId", review_id as "reviewId",
                 source, metadata, created_at as "createdAt", updated_at as "updatedAt"`,
      [importId, externalJobId, worker.workerId, author.id, JSON.stringify(source), JSON.stringify(metadata)]
    );

    const row = inserted.rows[0];
    const response = {
      importId: row.id,
      status: row.status,
      authorId: row.authorId,
      externalJobId: row.externalJobId
    };

    await recordEvent(tx, row.id, worker.workerId, toolName, "IMPORT_OPENED", {
      externalJobId: row.externalJobId,
      authorId: row.authorId
    });
    await tx(
      `insert into authoring_idempotency_keys (
         id, worker_id, import_id, tool_name, idempotency_key, request_hash, response_json
       )
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)
       on conflict (worker_id, tool_name, idempotency_key) do nothing`,
      [
        crypto.randomUUID(),
        worker.workerId,
        row.id,
        toolName,
        idempotencyKey,
        crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex"),
        JSON.stringify(response)
      ]
    );

    return response;
  });
}

async function getAuthoringImportStatus(worker, body) {
  await ensurePlatformSchema();

  const importId = requiredString(body.importId, "importId", 4, 160);
  const result = await query(
    `select i.id, i.external_job_id as "externalJobId", i.worker_id as "workerId",
            i.author_id as "authorId", i.status, i.series_id as "seriesId",
            i.episode_id as "episodeId", i.review_id as "reviewId",
            i.metadata, i.created_at as "createdAt", i.updated_at as "updatedAt",
            e.publication_status as "publicationStatus",
            r.id as "latestReleaseId"
     from authoring_imports i
     left join webtoon_episodes e on e.id = i.episode_id
     left join publication_releases r on r.snapshot_id in (
       select ps.id
       from publication_snapshots ps
       where ps.target_id = i.episode_id or ps.snapshot_type = 'CATALOG'
     )
     where i.id = $1 and i.worker_id = $2
     order by r.created_at desc nulls last
     limit 1`,
    [importId, worker.workerId]
  );

  const row = result.rows[0];
  if (!row) {
    throw Object.assign(new Error("Authoring import was not found"), {
      statusCode: 404,
      code: "AUTHORING_IMPORT_NOT_FOUND",
      publicMessage: "Authoring MCP import를 찾지 못했습니다."
    });
  }

  return {
    importId: row.id,
    externalJobId: row.externalJobId,
    status: row.status,
    authorId: row.authorId,
    seriesId: row.seriesId,
    episodeId: row.episodeId,
    reviewId: row.reviewId,
    release: {
      publicationStatus: row.publicationStatus || "UNPUBLISHED",
      latestReleaseId: row.latestReleaseId || null
    },
    updatedAt: row.updatedAt
  };
}

async function invokeAuthoringTool(request, toolName, body) {
  const worker = requireWorkerAuth(request);

  if (toolName === "create_authoring_import") {
    return createAuthoringImport(worker, body);
  }

  if (toolName === "get_authoring_import_status") {
    return getAuthoringImportStatus(worker, body);
  }

  if ([
    "register_authoring_asset",
    "upsert_series_draft",
    "upsert_episode_draft",
    "set_episode_panels",
    "submit_episode_for_review"
  ].includes(toolName)) {
    throw Object.assign(new Error("Authoring MCP tool is not implemented yet"), {
      statusCode: 501,
      code: "AUTHORING_MCP_TOOL_NOT_IMPLEMENTED",
      publicMessage: "해당 Authoring MCP tool은 아직 구현되지 않았습니다."
    });
  }

  throw Object.assign(new Error("Unknown Authoring MCP tool"), {
    statusCode: 404,
    code: "AUTHORING_MCP_TOOL_NOT_FOUND",
    publicMessage: "Authoring MCP tool을 찾지 못했습니다."
  });
}

module.exports = {
  IMPORT_STATUSES,
  invokeAuthoringTool,
  requireWorkerAuth
};
