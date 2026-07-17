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

    const result = await query(
      `select pr.id, pr.target_type as "targetType", pr.target_id as "targetId", pr.author_id as "authorId",
              pr.status, pr.review_note as "reviewNote", pr.requested_at as "requestedAt", pr.reviewed_at as "reviewedAt",
              coalesce(e.title, s.title) as "targetTitle",
              a.display_name as "authorName"
       from publication_reviews pr
       left join webtoon_episodes e on pr.target_type = 'EPISODE' and e.id = pr.target_id
       left join webtoon_series s on pr.target_type = 'SERIES' and s.id = pr.target_id
       left join authors a on a.id = pr.author_id
       order by pr.created_at desc
       limit 100`
    );

    sendJson(response, 200, { publicationReviews: result.rows });
  } catch (error) {
    handleError(response, error);
  }
};
