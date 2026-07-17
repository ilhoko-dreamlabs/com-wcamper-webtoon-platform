const crypto = require("node:crypto");
const { verifyAuthSession } = require("../../_lib/auth");
const { query, transaction } = require("../../_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../_lib/http");
const { ensurePlatformSchema } = require("../../_lib/platform-schema");
const { requiredString } = require("../../_lib/validation");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const [session, body] = await Promise.all([verifyAuthSession(request), readJson(request)]);
    await ensurePlatformSchema();

    const reason = requiredString(body.reason, "reason", 2, 500);
    const feedbackId = request.query?.id;
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
};
