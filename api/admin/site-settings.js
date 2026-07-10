const { assertAdmin } = require("../_lib/admin-auth");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");
const { listSiteSettings } = require("../_lib/site-settings");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    await assertAdmin(request);
    const result = await listSiteSettings();
    sendJson(response, 200, result);
  } catch (error) {
    handleError(response, error);
  }
};
