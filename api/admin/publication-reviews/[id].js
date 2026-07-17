const { assertAdmin } = require("../../_lib/admin-auth");
const { writeAdminAuditLog } = require("../../_lib/admin-audit");
const { query, transaction } = require("../../_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../_lib/http");
const { ensurePlatformSchema } = require("../../_lib/platform-schema");

const ACTIONS = new Set(["approve", "request-revision", "publish", "reject"]);

function normalizeAction(value) {
  const action = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!ACTIONS.has(action)) {
    throw Object.assign(new Error("Invalid review action"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "검수 액션을 확인해주세요."
    });
  }
  return action;
}

function actionStatus(action) {
  return {
    approve: "APPROVED",
    "request-revision": "REVISION_REQUESTED",
    publish: "PUBLISHED",
    reject: "REJECTED"
  }[action];
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

    const action = normalizeAction(body.action);
    const status = actionStatus(action);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";

    const result = await transaction(async (tx) => {
      const reviewResult = await tx(
        `update publication_reviews
         set status = $2,
             reviewed_by = $3,
             reviewed_at = now(),
             review_note = $4,
             updated_at = now()
         where id = $1
         returning id, target_type as "targetType", target_id as "targetId", author_id as "authorId", status, review_note as "reviewNote"`,
        [request.query?.id, status, admin.id, note]
      );
      const review = reviewResult.rows[0];
      if (!review) return reviewResult;

      const contentStatus = status === "PUBLISHED" ? "PUBLISHED" : status;
      if (review.targetType === "EPISODE") {
        await tx(
          `update webtoon_episodes
           set status = $2,
               review_note = $3,
               published_at = case when $2 = 'PUBLISHED' then coalesce(published_at, now()) else published_at end,
               updated_at = now()
           where id = $1`,
          [review.targetId, contentStatus, note]
        );
      }

      if (review.targetType === "SERIES") {
        await tx(
          `update webtoon_series
           set status = $2, review_note = $3, updated_at = now()
           where id = $1`,
          [review.targetId, contentStatus, note]
        );
      }

      return reviewResult;
    });

    if (!result.rows[0]) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "검수 항목을 찾지 못했습니다." });
      return;
    }

    await writeAdminAuditLog({
      admin,
      action: `publication_review.${action}`,
      resourceType: "publication_review",
      resourceId: result.rows[0].id,
      afterValue: { status },
      requestId: request.headers["x-request-id"] || null
    });

    sendJson(response, 200, { publicationReview: result.rows[0] });
  } catch (error) {
    handleError(response, error);
  }
};
