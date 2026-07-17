const { assertAdmin } = require("../../_lib/admin-auth");
const { query } = require("../../_lib/db");
const { handleError, methodNotAllowed, sendJson } = require("../../_lib/http");
const { ensurePlatformSchema } = require("../../_lib/platform-schema");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    await assertAdmin(request);
    await ensurePlatformSchema();

    const result = await query(
      `select id, user_id as "userId", author_id as "authorId", display_name as "displayName",
              status, portfolio_url as "portfolioUrl", introduction, sample_plan as "samplePlan",
              reviewed_by as "reviewedBy", reviewed_at as "reviewedAt", rejection_reason as "rejectionReason",
              created_at as "createdAt", updated_at as "updatedAt"
       from author_applications
       where id = $1
       limit 1`,
      [request.query?.id]
    );

    if (!result.rows[0]) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작가신청을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { authorApplication: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
};
