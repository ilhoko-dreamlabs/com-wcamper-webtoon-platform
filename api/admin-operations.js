const crypto = require("node:crypto");
const { assertAdmin } = require("./_lib/admin-auth");
const { writeAdminAuditLog } = require("./_lib/admin-audit");
const { query, transaction } = require("./_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { ensurePlatformSchema } = require("./_lib/platform-schema");

const FEEDBACK_STATUSES = new Set(["VISIBLE", "HIDDEN", "DELETED", "REPORTED"]);
const REVIEW_ACTIONS = new Set(["approve", "request-revision", "publish", "reject"]);

function pathParts(request) {
  const path = request.query?.path;
  if (Array.isArray(path)) return path;
  if (typeof path === "string") return path.split("/").filter(Boolean);
  return [];
}

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

function feedbackStatus(value) {
  const status = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!FEEDBACK_STATUSES.has(status)) {
    throw Object.assign(new Error("Invalid feedback status"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "피드백 상태값을 확인해주세요."
    });
  }
  return status;
}

function reviewAction(value) {
  const action = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!REVIEW_ACTIONS.has(action)) {
    throw Object.assign(new Error("Invalid review action"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "검수 액션을 확인해주세요."
    });
  }
  return action;
}

function reviewStatus(action) {
  return {
    approve: "APPROVED",
    "request-revision": "REVISION_REQUESTED",
    publish: "PUBLISHED",
    reject: "REJECTED"
  }[action];
}

async function listAuthorApplications(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const url = new URL(request.url || "/", "https://webtoon.wcamper.com");
  const status = String(url.searchParams.get("status") || "").trim().toUpperCase();
  const params = [];
  const where = status ? "where status = $1" : "";
  if (status) params.push(status);
  const result = await query(
    `select id, user_id as "userId", author_id as "authorId", display_name as "displayName",
            status, portfolio_url as "portfolioUrl", introduction, sample_plan as "samplePlan",
            reviewed_by as "reviewedBy", reviewed_at as "reviewedAt", rejection_reason as "rejectionReason",
            created_at as "createdAt", updated_at as "updatedAt"
     from author_applications
     ${where}
     order by created_at desc
     limit 100`,
    params
  );
  sendJson(response, 200, { authorApplications: result.rows });
}

async function getAuthorApplication(request, response, id) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const result = await query(
    `select id, user_id as "userId", author_id as "authorId", display_name as "displayName",
            status, portfolio_url as "portfolioUrl", introduction, sample_plan as "samplePlan",
            reviewed_by as "reviewedBy", reviewed_at as "reviewedAt", rejection_reason as "rejectionReason",
            created_at as "createdAt", updated_at as "updatedAt"
     from author_applications
     where id = $1
     limit 1`,
    [id]
  );
  if (!result.rows[0]) return sendJson(response, 404, { error: "NOT_FOUND", message: "작가신청을 찾지 못했습니다." });
  sendJson(response, 200, { authorApplication: result.rows[0] });
}

async function approveAuthorApplication(request, response, admin, id) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const applicationResult = await query(
    `select id, user_id, display_name, introduction
     from author_applications
     where id = $1 and status in ('SUBMITTED', 'REVIEWING')`,
    [id]
  );
  const application = applicationResult.rows[0];
  if (!application) return sendJson(response, 404, { error: "NOT_FOUND", message: "승인 가능한 작가신청을 찾지 못했습니다." });

  const author = await transaction(async (tx) => {
    const authorResult = await tx(
      `insert into authors (id, user_id, display_name, bio, status, approved_at)
       values ($1, $2, $3, $4, 'ACTIVE', now())
       on conflict (user_id)
       do update set display_name = excluded.display_name, bio = excluded.bio, status = 'ACTIVE', approved_at = now(), updated_at = now()
       returning id, user_id as "userId", display_name as "displayName", status, approved_at as "approvedAt"`,
      [crypto.randomUUID(), application.user_id, application.display_name, application.introduction]
    );
    await tx(
      `update author_applications
       set author_id = $1, status = 'APPROVED', reviewed_by = $3, reviewed_at = now(), updated_at = now()
       where id = $2`,
      [authorResult.rows[0].id, application.id, admin.id]
    );
    return authorResult.rows[0];
  });

  await writeAdminAuditLog({ admin, action: "author_application.approve", resourceType: "author_application", resourceId: application.id, afterValue: { status: "APPROVED", authorId: author.id }, requestId: request.headers["x-request-id"] || null });
  sendJson(response, 200, { author });
}

async function rejectAuthorApplication(request, response, admin, id) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const body = await readJson(request);
  const result = await query(
    `update author_applications
     set status = 'REJECTED', reviewed_by = $2, reviewed_at = now(), rejection_reason = $3, updated_at = now()
     where id = $1 and status in ('SUBMITTED', 'REVIEWING')
     returning id, display_name as "displayName", status, rejection_reason as "rejectionReason", reviewed_at as "reviewedAt"`,
    [id, admin.id, rejectReason(body.reason)]
  );
  if (!result.rows[0]) return sendJson(response, 404, { error: "NOT_FOUND", message: "반려 가능한 작가신청을 찾지 못했습니다." });
  await writeAdminAuditLog({ admin, action: "author_application.reject", resourceType: "author_application", resourceId: result.rows[0].id, afterValue: { status: "REJECTED" }, requestId: request.headers["x-request-id"] || null });
  sendJson(response, 200, { authorApplication: result.rows[0] });
}

async function listFeedback(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
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
}

async function moderateFeedback(request, response, admin, id) {
  if (request.method !== "PATCH") return methodNotAllowed(response, ["PATCH"]);
  const body = await readJson(request);
  const status = feedbackStatus(body.status);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const result = await transaction(async (tx) => {
    const updated = await tx(
      `update feedback
       set status = $2, moderated_by = $3, moderated_at = now(), moderation_note = $4, updated_at = now()
       where id = $1
       returning id, target_type as "targetType", target_id as "targetId", body, status, moderation_note as "moderationNote", updated_at as "updatedAt"`,
      [id, status, admin.id, note]
    );
    if (updated.rows[0] && ["VISIBLE", "HIDDEN", "DELETED"].includes(status)) {
      await tx(
        `update feedback_reports
         set status = case when $2 = 'VISIBLE' then 'DISMISSED' else 'ACTIONED' end
         where feedback_id = $1 and status = 'OPEN'`,
        [id, status]
      );
    }
    return updated;
  });
  if (!result.rows[0]) return sendJson(response, 404, { error: "NOT_FOUND", message: "피드백을 찾지 못했습니다." });
  await writeAdminAuditLog({ admin, action: "feedback.moderate", resourceType: "feedback", resourceId: result.rows[0].id, afterValue: { status }, requestId: request.headers["x-request-id"] || null });
  sendJson(response, 200, { feedback: result.rows[0] });
}

async function listPublicationReviews(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const result = await query(
    `select pr.id, pr.target_type as "targetType", pr.target_id as "targetId", pr.author_id as "authorId",
            pr.status, pr.review_note as "reviewNote", pr.requested_at as "requestedAt", pr.reviewed_at as "reviewedAt",
            coalesce(e.title, s.title) as "targetTitle", a.display_name as "authorName"
     from publication_reviews pr
     left join webtoon_episodes e on pr.target_type = 'EPISODE' and e.id = pr.target_id
     left join webtoon_series s on pr.target_type = 'SERIES' and s.id = pr.target_id
     left join authors a on a.id = pr.author_id
     order by pr.created_at desc
     limit 100`
  );
  sendJson(response, 200, { publicationReviews: result.rows });
}

async function moderatePublicationReview(request, response, admin, id) {
  if (request.method !== "PATCH") return methodNotAllowed(response, ["PATCH"]);
  const body = await readJson(request);
  const action = reviewAction(body.action);
  const status = reviewStatus(action);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const result = await transaction(async (tx) => {
    const reviewResult = await tx(
      `update publication_reviews
       set status = $2, reviewed_by = $3, reviewed_at = now(), review_note = $4, updated_at = now()
       where id = $1
       returning id, target_type as "targetType", target_id as "targetId", author_id as "authorId", status, review_note as "reviewNote"`,
      [id, status, admin.id, note]
    );
    const review = reviewResult.rows[0];
    if (!review) return reviewResult;
    if (review.targetType === "EPISODE") {
      await tx(
        `update webtoon_episodes
         set status = $2, review_note = $3, published_at = case when $2 = 'PUBLISHED' then coalesce(published_at, now()) else published_at end, updated_at = now()
         where id = $1`,
        [review.targetId, status, note]
      );
    }
    if (review.targetType === "SERIES") {
      await tx(`update webtoon_series set status = $2, review_note = $3, updated_at = now() where id = $1`, [review.targetId, status, note]);
    }
    return reviewResult;
  });
  if (!result.rows[0]) return sendJson(response, 404, { error: "NOT_FOUND", message: "검수 항목을 찾지 못했습니다." });
  await writeAdminAuditLog({ admin, action: `publication_review.${action}`, resourceType: "publication_review", resourceId: result.rows[0].id, afterValue: { status }, requestId: request.headers["x-request-id"] || null });
  sendJson(response, 200, { publicationReview: result.rows[0] });
}

module.exports = async function handler(request, response) {
  try {
    const admin = await assertAdmin(request);
    await ensurePlatformSchema();
    const parts = pathParts(request);

    if (parts.length === 1 && parts[0] === "author-applications") return listAuthorApplications(request, response);
    if (parts.length === 2 && parts[0] === "author-applications") return getAuthorApplication(request, response, parts[1]);
    if (parts.length === 3 && parts[0] === "author-applications" && parts[2] === "approve") return approveAuthorApplication(request, response, admin, parts[1]);
    if (parts.length === 3 && parts[0] === "author-applications" && parts[2] === "reject") return rejectAuthorApplication(request, response, admin, parts[1]);
    if (parts.length === 1 && parts[0] === "feedback") return listFeedback(request, response);
    if (parts.length === 2 && parts[0] === "feedback") return moderateFeedback(request, response, admin, parts[1]);
    if (parts.length === 1 && parts[0] === "publication-reviews") return listPublicationReviews(request, response);
    if (parts.length === 2 && parts[0] === "publication-reviews") return moderatePublicationReview(request, response, admin, parts[1]);

    sendJson(response, 404, { error: "NOT_FOUND", message: "관리자 운영 API 경로를 찾지 못했습니다." });
  } catch (error) {
    handleError(response, error);
  }
};
