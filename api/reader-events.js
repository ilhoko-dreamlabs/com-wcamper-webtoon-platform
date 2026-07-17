const crypto = require("node:crypto");
const { optionalAuthSession } = require("./_lib/auth");
const { query, transaction } = require("./_lib/db");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { ensurePlatformSchema } = require("./_lib/platform-schema");
const { normalizeTargetType, requiredString } = require("./_lib/validation");

const EVENT_TYPES = new Set(["VIEW", "READ_START", "READ_COMPLETE", "RETURN_VISIT"]);

function eventType(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!EVENT_TYPES.has(normalized)) {
    throw Object.assign(new Error("Invalid reader event type"), {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      publicMessage: "독자 이벤트 유형을 확인해주세요."
    });
  }
  return normalized;
}

function incrementColumn(type) {
  return {
    VIEW: "views",
    READ_START: "read_starts",
    READ_COMPLETE: "read_completes",
    RETURN_VISIT: "return_visits"
  }[type];
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const [session, body] = await Promise.all([optionalAuthSession(request), readJson(request)]);
    await ensurePlatformSchema();

    const type = eventType(body.eventType);
    const targetType = normalizeTargetType(body.targetType);
    const targetId = requiredString(body.targetId, "targetId", 1, 160);
    const anonymousId = requiredString(body.anonymousId || "anonymous", "anonymousId", 1, 160);
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
    const column = incrementColumn(type);
    const id = crypto.randomUUID();

    await transaction(async (tx) => {
      await tx(
        `insert into reader_events (id, user_id, anonymous_id, event_type, target_type, target_id, metadata)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [id, session?.user?.id || null, anonymousId, type, targetType, targetId, JSON.stringify(metadata)]
      );
      await tx(
        `insert into reader_activity_daily (activity_date, target_type, target_id, ${column})
         values (current_date, $1, $2, 1)
         on conflict (activity_date, target_type, target_id)
         do update set ${column} = reader_activity_daily.${column} + 1, updated_at = now()`,
        [targetType, targetId]
      );
    });

    sendJson(response, 202, { accepted: true, id });
  } catch (error) {
    handleError(response, error);
  }
};
