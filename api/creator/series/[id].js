const { assertAuthor } = require("../../_lib/author-auth");
const { ensureAuthorRecord, getCreatorSeries, updateCreatorSeries } = require("../../_lib/creator-content");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    await getSeries(request, response);
    return;
  }

  if (request.method === "PATCH") {
    await updateSeries(request, response);
    return;
  }

  methodNotAllowed(response, ["GET", "PATCH"]);
};

async function getSeries(request, response) {
  try {
    const authorContext = await assertAuthor(request);
    const author = await ensureAuthorRecord(authorContext);
    const series = await getCreatorSeries(author.id, request.query?.id);

    if (!series) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { series });
  } catch (error) {
    handleError(response, error);
  }
}

async function updateSeries(request, response) {
  try {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const series = await updateCreatorSeries(author.id, request.query?.id, body);

    if (!series) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { series });
  } catch (error) {
    handleError(response, error);
  }
}
