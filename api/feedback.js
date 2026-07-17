const crypto = require("node:crypto");
const { verifyAuthSession } = require("./_lib/auth");
const { query, transaction } = require("./_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { ensurePlatformSchema } = require("./_lib/platform-schema");
const { normalizeTargetType, requiredString } = require("./_lib/validation");

function pathParts(request) {
  const path = request.query?.path;
  if (Array.isArray(path)) return path;
  if (typeof path === "string") return path.split("/").filter(Boolean);
  return [];
}

module.exports = async function handler(request, response) {
  const parts = pathParts(request);

  if (parts.length === 2 && parts[1] === "report") {
    await reportFeedback(request, response, parts[0]);
    return;
  }

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

async function reportFeedback(request, response, feedbackId) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const [session, body] = await Promise.all([verifyAuthSession(request), readJson(request)]);
    await ensurePlatformSchema();

    const reason = requiredString(body.reason, "reason", 2, 500);
    const reportId = crypto.randomUUID();
    const result = await transaction(async (tx) => {
      const feedback = await tx(
        `select id from feedback where id = $1 and status in ('VISIBLE', 'REPORTED') limit 1`,
        [feedbackId]
      );
      if (!feedback.rows[0]) return null;

      const report = await tx(
        `insert into feedback_reports (id, feedback_id, reporter_user_id, reason)
         values ($1, $2, $3, $4)
         returning id, feedback_id as "feedbackId", status, created_at as "createdAt"`,
        [reportId, feedbackId, session.user.id, reason]
      );
      await tx(`update feedback set status = 'REPORTED', updated_at = now() where id = $1`, [feedbackId]);
      return report.rows[0];
    });

    if (!result) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "신고할 피드백을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 201, { feedbackReport: result });
  } catch (error) {
    handleError(response, error);
  }
}
