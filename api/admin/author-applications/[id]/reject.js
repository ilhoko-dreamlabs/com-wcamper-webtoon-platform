const { assertAdmin } = require("../../../_lib/admin-auth");
const { writeAdminAuditLog } = require("../../../_lib/admin-audit");
const { query } = require("../../../_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../../_lib/http");
const { ensurePlatformSchema } = require("../../../_lib/platform-schema");

function rejectReason(value) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 2 || reason.length > 1000) {
    throw Object.assign(new Error("Invalid rejection reason"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "반려 사유를 2자 이상 1000자 이하로 입력해주세요."
    });
  }
  return reason;
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const admin = await assertAdmin(request);
    const body = await readJson(request);
    await ensurePlatformSchema();

    const reason = rejectReason(body.reason);
    const result = await query(
      `update author_applications
       set status = 'REJECTED',
           reviewed_by = $2,
           reviewed_at = now(),
           rejection_reason = $3,
           updated_at = now()
       where id = $1 and status in ('SUBMITTED', 'REVIEWING')
       returning id, display_name as "displayName", status, rejection_reason as "rejectionReason", reviewed_at as "reviewedAt"`,
      [request.query?.id, admin.id, reason]
    );

    if (!result.rows[0]) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "반려 가능한 작가신청을 찾지 못했습니다." });
      return;
    }

    await writeAdminAuditLog({
      admin,
      action: "author_application.reject",
      resourceType: "author_application",
      resourceId: result.rows[0].id,
      afterValue: { status: "REJECTED" },
      requestId: request.headers["x-request-id"] || null
    });

    sendJson(response, 200, { authorApplication: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
};
