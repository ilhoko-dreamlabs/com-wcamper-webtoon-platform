const { optionalAuthSession } = require("./_lib/auth");
const { query } = require("./_lib/db");
const { handleError, methodNotAllowed, sendJson } = require("./_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    const session = await optionalAuthSession(request);

    if (!session) {
      sendJson(response, 200, { authenticated: false });
      return;
    }

    const [authorResult, applicationResult] = await Promise.all([
      query(
        `select id, display_name as "displayName", status, approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt"
         from authors
         where user_id = $1
         order by created_at desc
         limit 1`,
        [session.user.id]
      ),
      query(
        `select id, status, portfolio_url as "portfolioUrl", reviewed_at as "reviewedAt", created_at as "createdAt", updated_at as "updatedAt"
         from author_applications
         where user_id = $1
         order by created_at desc
         limit 1`,
        [session.user.id]
      )
    ]);

    sendJson(response, 200, {
      authenticated: true,
      user: session.user,
      profileComplete: Boolean(session.profileComplete),
      author: authorResult.rows[0] || null,
      authorApplication: applicationResult.rows[0] || null
    });
  } catch (error) {
    handleError(response, error);
  }
};
