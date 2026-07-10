const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");
const { listSiteSettings } = require("../_lib/site-settings");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    const result = await listSiteSettings({ publicOnly: true });
    sendJson(response, 200, result, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
    });
  } catch (error) {
    handleError(response, error);
  }
};
