const { assertAdmin } = require("../_lib/admin-auth");
const { query } = require("../_lib/db");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");
const { ensurePlatformSchema } = require("../_lib/platform-schema");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    await assertAdmin(request);
    await ensurePlatformSchema();

    const url = new URL(request.url || "/", "https://webtoon.wcamper.com");
    const status = String(url.searchParams.get("status") || "").trim().toUpperCase();
    const params = [];
    const where = status ? "where status = $1" : "";
    if (status) params.push(status);

    const result = await query(
      `select id, user_id as "userId", author_id as "authorId", display_name as "displayName",
              status, portfolio_url as "portfolioUrl", introduction, sample_plan as "samplePlan",
              reviewed_by as "reviewedBy", reviewed_at as "reviewedAt", rejection_reason as "rejectionReason",
              created_at as "createdAt", updated_at as "updatedAt"
       from author_applications
       ${where}
       order by created_at desc
       limit 100`,
      params
    );

    sendJson(response, 200, { authorApplications: result.rows });
  } catch (error) {
    handleError(response, error);
  }
};
