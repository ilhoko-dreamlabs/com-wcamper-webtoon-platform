const { assertAuthor } = require("../_lib/author-auth");
const { ensureAuthorRecord, listCreatorSeries, createCreatorSeries } = require("../_lib/creator-content");
const { handleError, methodNotAllowed, readJson, sendJson } = require("../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    await listSeries(request, response);
    return;
  }

  if (request.method === "POST") {
    await createSeries(request, response);
    return;
  }

  methodNotAllowed(response, ["GET", "POST"]);
};

async function listSeries(request, response) {
  try {
    const authorContext = await assertAuthor(request);
    const author = await ensureAuthorRecord(authorContext);
    const series = await listCreatorSeries(author.id);
    sendJson(response, 200, { author, series });
  } catch (error) {
    handleError(response, error);
  }
}

async function createSeries(request, response) {
  try {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const series = await createCreatorSeries(author.id, body);
    sendJson(response, 201, { series });
  } catch (error) {
    handleError(response, error);
  }
}
