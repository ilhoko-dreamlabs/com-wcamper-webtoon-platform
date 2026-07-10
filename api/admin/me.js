const { assertAdmin } = require("../_lib/admin-auth");
const { handleError, methodNotAllowed, sendJson } = require("../_lib/http");

module.exports = async function handler(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  try {
    const admin = await assertAdmin(request);
    sendJson(response, 200, {
      authenticated: true,
      admin: {
        id: admin.authType === "bearer" ? "admin-token" : admin.id,
        authType: admin.authType,
        roles: admin.roles
      }
    });
  } catch (error) {
    handleError(response, error);
  }
};
