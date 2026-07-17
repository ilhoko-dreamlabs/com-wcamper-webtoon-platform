const crypto = require("node:crypto");
const { verifyAuthSession } = require("./_lib/auth");
const { query } = require("./_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { ensurePlatformSchema } = require("./_lib/platform-schema");

const TARGET_TYPES = new Set(["AUTHOR", "SERIES"]);

function targetType(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!TARGET_TYPES.has(normalized)) {
    throw Object.assign(new Error("Invalid favorite target type"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "관심작 대상을 확인해주세요."
    });
  }
  return normalized;
}

function targetId(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized.length > 160) {
    throw Object.assign(new Error("Invalid favorite target id"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "관심작 대상을 확인해주세요."
    });
  }
  return normalized;
}

async function listFavorites(request, response) {
  const session = await verifyAuthSession(request);
  await ensurePlatformSchema();

  const result = await query(
    `select id, target_type as "targetType", target_id as "targetId", created_at as "createdAt"
     from favorites
     where user_id = $1
     order by created_at desc
     limit 100`,
    [session.user.id]
  );

  sendJson(response, 200, { favorites: result.rows });
}

async function upsertFavorite(request, response) {
  const [session, body] = await Promise.all([verifyAuthSession(request), readJson(request)]);
  await ensurePlatformSchema();

  const type = targetType(body.targetType);
  const id = targetId(body.targetId);
  const result = await query(
    `insert into favorites (id, user_id, target_type, target_id)
     values ($1, $2, $3, $4)
     on conflict (user_id, target_type, target_id)
     do update set target_id = excluded.target_id
     returning id, target_type as "targetType", target_id as "targetId", created_at as "createdAt"`,
    [crypto.randomUUID(), session.user.id, type, id]
  );

  sendJson(response, 200, { favorite: result.rows[0] });
}

async function deleteFavorite(request, response) {
  const [session, body] = await Promise.all([verifyAuthSession(request), readJson(request)]);
  await ensurePlatformSchema();

  const type = targetType(body.targetType);
  const id = targetId(body.targetId);
  await query(
    `delete from favorites where user_id = $1 and target_type = $2 and target_id = $3`,
    [session.user.id, type, id]
  );

  sendJson(response, 200, { deleted: true });
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") return listFavorites(request, response);
    if (request.method === "POST") return upsertFavorite(request, response);
    if (request.method === "DELETE") return deleteFavorite(request, response);
    methodNotAllowed(response, ["GET", "POST", "DELETE"]);
  } catch (error) {
    handleError(response, error);
  }
};
