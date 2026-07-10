const { assertAuthor } = require("../../../_lib/author-auth");
const { ensureAuthorRecord, listCreatorEpisodes, createCreatorEpisode } = require("../../../_lib/creator-content");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    await listEpisodes(request, response);
    return;
  }

  if (request.method === "POST") {
    await createEpisode(request, response);
    return;
  }

  methodNotAllowed(response, ["GET", "POST"]);
};

async function listEpisodes(request, response) {
  try {
    const authorContext = await assertAuthor(request);
    const author = await ensureAuthorRecord(authorContext);
    const episodes = await listCreatorEpisodes(author.id, request.query?.id);

    if (!episodes) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { episodes });
  } catch (error) {
    handleError(response, error);
  }
}

async function createEpisode(request, response) {
  try {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const episode = await createCreatorEpisode(author.id, request.query?.id, body);

    if (!episode) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 201, { episode });
  } catch (error) {
    handleError(response, error);
  }
}
