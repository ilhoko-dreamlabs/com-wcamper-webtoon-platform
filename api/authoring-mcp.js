const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");
const { invokeAuthoringTool } = require("./_lib/authoring-mcp-service");

function pathParts(request) {
  const path = request.query?.path;
  if (Array.isArray(path)) return path;
  if (typeof path === "string") return path.split("/").filter(Boolean);

  const pathname = new URL(request.url || "/", "https://webtoon.wcamper.com").pathname;
  const prefix = "/api/authoring-mcp/";
  if (pathname.startsWith(prefix)) {
    return pathname.slice(prefix.length).split("/").filter(Boolean);
  }

  return [];
}

module.exports = async function handler(request, response) {
  try {
    const parts = pathParts(request);

    if (parts.length === 2 && parts[0] === "tools") {
      if (request.method !== "POST") {
        methodNotAllowed(response, ["POST"]);
        return;
      }

      const body = await readJson(request);
      const result = await invokeAuthoringTool(request, parts[1], body);
      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { error: "NOT_FOUND", message: "Authoring MCP 경로를 찾지 못했습니다." });
  } catch (error) {
    handleError(response, error);
  }
};
