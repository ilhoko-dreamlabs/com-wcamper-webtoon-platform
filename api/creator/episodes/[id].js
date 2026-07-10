const { assertAuthor } = require("../../_lib/author-auth");
const { ensureAuthorRecord, updateCreatorEpisode } = require("../../_lib/creator-content");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "PATCH") {
    methodNotAllowed(response, ["PATCH"]);
    return;
  }

  try {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const episode = await updateCreatorEpisode(author.id, request.query?.id, body);

    if (!episode) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "회차를 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { episode });
  } catch (error) {
    handleError(response, error);
  }
};
