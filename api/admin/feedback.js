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
    const where = status ? "where f.status = $1" : "";
    if (status) params.push(status);

    const result = await query(
      `select f.id, f.user_id as "userId", f.target_type as "targetType", f.target_id as "targetId",
              f.body, f.status, f.moderated_by as "moderatedBy", f.moderated_at as "moderatedAt",
              f.moderation_note as "moderationNote", f.created_at as "createdAt", f.updated_at as "updatedAt",
              coalesce(count(r.id), 0)::int as "reportCount"
       from feedback f
       left join feedback_reports r on r.feedback_id = f.id and r.status = 'OPEN'
       ${where}
       group by f.id
       order by f.created_at desc
       limit 100`,
      params
    );

    sendJson(response, 200, { feedback: result.rows });
  } catch (error) {
    handleError(response, error);
  }
};
