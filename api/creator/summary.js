const { assertAuthor } = require("../_lib/author-auth");
const { ensureAuthorRecord, creatorSummary } = require("../_lib/creator-content");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    const authorContext = await assertAuthor(request);
    const author = await ensureAuthorRecord(authorContext);
    const summary = await creatorSummary(author.id);

    sendJson(response, 200, { author, summary });
  } catch (error) {
    handleError(response, error);
  }
};
