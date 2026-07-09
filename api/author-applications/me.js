const { verifyAuthSession } = require("../_lib/auth");
const { query } = require("../_lib/db");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    const session = await verifyAuthSession(request);
    const result = await query(
      `select id, display_name as "displayName", portfolio_url as "portfolioUrl", status,
              reviewed_at as "reviewedAt", rejection_reason as "rejectionReason",
              created_at as "createdAt", updated_at as "updatedAt"
       from author_applications
       where user_id = $1
       order by created_at desc
       limit 1`,
      [session.user.id]
    );

    sendJson(response, 200, { authorApplication: result.rows[0] || null });
  } catch (error) {
    handleError(response, error);
  }
};
