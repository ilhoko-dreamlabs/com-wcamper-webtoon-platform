const { assertAdmin } = require("../../_lib/admin-auth");
const { writeAdminAuditLog } = require("../../_lib/admin-audit");
const { query, transaction } = require("../../_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../_lib/http");
const { ensurePlatformSchema } = require("../../_lib/platform-schema");

const ALLOWED_STATUSES = new Set(["VISIBLE", "HIDDEN", "DELETED", "REPORTED"]);

function normalizeStatus(value) {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!ALLOWED_STATUSES.has(status)) {
    throw Object.assign(new Error("Invalid feedback status"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "피드백 상태값을 확인해주세요."
    });
  }
  return status;
}

module.exports = async function handler(request, response) {
  if (request.method !== "PATCH") {
    methodNotAllowed(response, ["PATCH"]);
    return;
  }

  try {
    const admin = await assertAdmin(request);
    const body = await readJson(request);
    await ensurePlatformSchema();

    const status = normalizeStatus(body.status);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";

    const result = await transaction(async (tx) => {
      const updated = await tx(
        `update feedback
         set status = $2,
             moderated_by = $3,
             moderated_at = now(),
             moderation_note = $4,
             updated_at = now()
         where id = $1
         returning id, target_type as "targetType", target_id as "targetId", body, status,
                   moderation_note as "moderationNote", updated_at as "updatedAt"`,
        [request.query?.id, status, admin.id, note]
      );

      if (updated.rows[0] && ["VISIBLE", "HIDDEN", "DELETED"].includes(status)) {
        await tx(
          `update feedback_reports
           set status = case when $2 = 'VISIBLE' then 'DISMISSED' else 'ACTIONED' end
           where feedback_id = $1 and status = 'OPEN'`,
          [request.query?.id, status]
        );
      }

      return updated;
    });

    if (!result.rows[0]) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "피드백을 찾지 못했습니다." });
      return;
    }

    await writeAdminAuditLog({
      admin,
      action: "feedback.moderate",
      resourceType: "feedback",
      resourceId: result.rows[0].id,
      afterValue: { status },
      requestId: request.headers["x-request-id"] || null
    });

    sendJson(response, 200, { feedback: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
};
