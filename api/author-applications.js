const crypto = require("node:crypto");
const { verifyAuthSession } = require("./_lib/auth");
const { query } = require("./_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { optionalUrl, requiredString } = require("./_lib/validation");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const [session, body] = await Promise.all([verifyAuthSession(request), readJson(request)]);
    const displayName = requiredString(body.displayName, "displayName", 2, 80);
    const portfolioUrl = optionalUrl(body.portfolioUrl, "portfolioUrl");
    const introduction = requiredString(body.introduction, "introduction", 20, 2000);
    const samplePlan = requiredString(body.samplePlan, "samplePlan", 20, 3000);
    const id = crypto.randomUUID();

    const result = await query(
      `insert into author_applications (id, user_id, display_name, portfolio_url, introduction, sample_plan, status)
       values ($1, $2, $3, $4, $5, $6, 'SUBMITTED')
       returning id, display_name as "displayName", portfolio_url as "portfolioUrl", status, created_at as "createdAt", updated_at as "updatedAt"`,
      [id, session.user.id, displayName, portfolioUrl, introduction, samplePlan]
    );

    sendJson(response, 201, { authorApplication: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
};
