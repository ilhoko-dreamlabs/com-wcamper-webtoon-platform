const crypto = require("node:crypto");
const { query, transaction } = require("../../../_lib/db");
const { handleError, methodNotAllowed, sendJson } = require("../../../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    assertAdminToken(request);

    const applicationId = request.query?.id;
    const applicationResult = await query(
      `select id, user_id, display_name, introduction
       from author_applications
       where id = $1 and status in ('SUBMITTED', 'REVIEWING')`,
      [applicationId]
    );
    const application = applicationResult.rows[0];

    if (!application) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "승인 가능한 작가신청을 찾지 못했습니다." });
      return;
    }

    const authorId = crypto.randomUUID();

    const author = await transaction(async (tx) => {
      const authorResult = await tx(
        `insert into authors (id, user_id, display_name, bio, status, approved_at)
         values ($1, $2, $3, $4, 'ACTIVE', now())
         on conflict (user_id)
         do update set display_name = excluded.display_name, bio = excluded.bio, status = 'ACTIVE', approved_at = now(), updated_at = now()
         returning id, user_id as "userId", display_name as "displayName", status, approved_at as "approvedAt"`,
        [authorId, application.user_id, application.display_name, application.introduction]
      );

      await tx(
        `update author_applications
         set author_id = $1, status = 'APPROVED', reviewed_at = now(), updated_at = now()
         where id = $2`,
        [authorResult.rows[0].id, application.id]
      );

      return authorResult.rows[0];
    });

    sendJson(response, 200, { author });
  } catch (error) {
    handleError(response, error);
  }
};

function assertAdminToken(request) {
  const expected = process.env.WEBTOON_ADMIN_API_TOKEN;
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";

  if (!expected || token !== expected) {
    throw Object.assign(new Error("Admin token required"), {
      statusCode: 401,
      code: "ADMIN_AUTH_REQUIRED",
      publicMessage: "운영자 인증이 필요합니다."
    });
  }
}
