const { assertAuthor } = require("../_lib/author-auth");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    const author = await assertAuthor(request);

    sendJson(response, 200, {
      authenticated: true,
      author: author.author,
      user: {
        id: author.user.id,
        displayName: author.user.displayName || author.user.name || author.user.nickname || null,
        email: author.user.email || null
      },
      roles: author.roles
    });
  } catch (error) {
    handleError(response, error);
  }
};
