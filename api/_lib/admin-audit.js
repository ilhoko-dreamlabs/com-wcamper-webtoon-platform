const crypto = require("node:crypto");
const { query } = require("./db");
const { isMissingSettingsStore } = require("./site-settings");

async function writeAdminAuditLog({ admin, action, resourceType, resourceId = null, beforeValue = null, afterValue = null, requestId = null }) {
  try {
    await query(
      `insert into admin_audit_logs (id, admin_user_id, action, resource_type, resource_id, before_value, after_value, request_id, created_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, now())`,
      [
        crypto.randomUUID(),
        admin?.id || null,
        action,
        resourceType,
        resourceId,
        beforeValue === null ? null : JSON.stringify(beforeValue),
        afterValue === null ? null : JSON.stringify(afterValue),
        requestId
      ]
    );
  } catch (error) {
    if (!isMissingSettingsStore(error) && error.code !== "42P01") {
      throw error;
    }
  }
}

module.exports = {
  writeAdminAuditLog
};
