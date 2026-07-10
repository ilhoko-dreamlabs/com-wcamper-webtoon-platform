const { assertAuthor } = require("../../../_lib/author-auth");
const { ensureAuthorRecord, requestEpisodeReview } = require("../../../_lib/creator-content");
const { handleError, methodNotAllowed, sendJson } = require("../../../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  try {
    const authorContext = await assertAuthor(request);
    const author = await ensureAuthorRecord(authorContext);
    const episode = await requestEpisodeReview(author.id, request.query?.id);

    if (!episode) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "회차를 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { episode });
  } catch (error) {
    handleError(response, error);
  }
};
