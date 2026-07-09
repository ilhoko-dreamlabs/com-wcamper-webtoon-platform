const crypto = require("node:crypto");
const { verifyAuthSession } = require("./_lib/auth");
const { query } = require("./_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { normalizeTargetType, requiredString } = require("./_lib/validation");

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    await listFeedback(request, response);
    return;
  }

  if (request.method === "POST") {
    await createFeedback(request, response);
    return;
  }

  methodNotAllowed(response, ["GET", "POST"]);
};

async function listFeedback(request, response) {
  try {
    const url = new URL(request.url, "https://webtoon.wcamper.com");
    const targetType = normalizeTargetType(url.searchParams.get("targetType"));
    const targetId = requiredString(url.searchParams.get("targetId"), "targetId", 1, 160);
    const result = await query(
      `select id, target_type as "targetType", target_id as "targetId", body, created_at as "createdAt"
       from feedback
       where target_type = $1 and target_id = $2 and status = 'VISIBLE'
       order by created_at desc
       limit 50`,
      [targetType, targetId]
    );

    sendJson(response, 200, { feedback: result.rows });
  } catch (error) {
    handleError(response, error);
  }
}

async function createFeedback(request, response) {
  try {
    const [session, body] = await Promise.all([verifyAuthSession(request), readJson(request)]);
    const targetType = normalizeTargetType(body.targetType);
    const targetId = requiredString(body.targetId, "targetId", 1, 160);
    const feedbackBody = requiredString(body.body, "body", 10, 2000);
    const id = crypto.randomUUID();

    const result = await query(
      `insert into feedback (id, user_id, target_type, target_id, body, status)
       values ($1, $2, $3, $4, $5, 'VISIBLE')
       returning id, target_type as "targetType", target_id as "targetId", body, status, created_at as "createdAt"`,
      [id, session.user.id, targetType, targetId, feedbackBody]
    );

    sendJson(response, 201, { feedback: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
}
