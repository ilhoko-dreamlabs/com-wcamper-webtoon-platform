const crypto = require("node:crypto");
const { assertAdmin } = require("../../../_lib/admin-auth");
const { writeAdminAuditLog } = require("../../../_lib/admin-audit");
const { query, transaction } = require("../../../_lib/db");
const { handleError, methodNotAllowed, sendJson } = require("../../../_lib/http");
const { ensurePlatformSchema } = require("../../../_lib/platform-schema");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const admin = await assertAdmin(request);
    await ensurePlatformSchema();

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
         set author_id = $1, status = 'APPROVED', reviewed_by = $3, reviewed_at = now(), updated_at = now()
         where id = $2`,
        [authorResult.rows[0].id, application.id, admin.id]
      );

      return authorResult.rows[0];
    });

    await writeAdminAuditLog({
      admin,
      action: "author_application.approve",
      resourceType: "author_application",
      resourceId: application.id,
      beforeValue: { status: "SUBMITTED" },
      afterValue: { status: "APPROVED", authorId: author.id },
      requestId: request.headers["x-request-id"] || null
    });

    sendJson(response, 200, { author });
  } catch (error) {
    handleError(response, error);
  }
};
