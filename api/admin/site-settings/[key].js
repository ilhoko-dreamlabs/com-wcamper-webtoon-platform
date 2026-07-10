const { assertAdmin } = require("../../_lib/admin-auth");
const { writeAdminAuditLog } = require("../../_lib/admin-audit");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../_lib/http");
const { updateSiteSetting } = require("../../_lib/site-settings");

module.exports = async function handler(request, response) {
  if (request.method !== "PATCH") {
    methodNotAllowed(response, ["PATCH"]);
    return;
  }

  try {
    const admin = await assertAdmin(request);
    const body = await readJson(request);
    const setting = await updateSiteSetting(request.query?.key, body.value, admin);

    await writeAdminAuditLog({
      admin,
      action: "site_setting.update",
      resourceType: "site_setting",
      resourceId: setting.key,
      afterValue: { value: setting.value },
      requestId: request.headers["x-request-id"] || null
    });

    sendJson(response, 200, { setting });
  } catch (error) {
    handleError(response, error);
  }
};
