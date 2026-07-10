const { verifyAuthSession } = require("./auth");

const ADMIN_ROLES = new Set(["siteAdmin", "webtoonAdmin"]);

function readBearerToken(request) {
  const authorization = request.headers.authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

function rolesFromSession(session) {
  const candidates = [
    session?.roles,
    session?.user?.roles,
    session?.user?.appRoles,
    session?.claims?.roles,
    session?.user?.claims?.roles
  ];

  return candidates
    .flatMap((value) => Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,\s]+/) : [])
    .filter(Boolean);
}

async function assertAdmin(request) {
  const expectedToken = process.env.WEBTOON_ADMIN_API_TOKEN;
  const token = readBearerToken(request);

  if (expectedToken && token && token === expectedToken) {
    return {
      id: "admin-token",
      authType: "bearer",
      roles: ["webtoonAdmin"]
    };
  }

  let session = null;

  try {
    session = await verifyAuthSession(request);
  } catch {
    session = null;
  }

  const roles = rolesFromSession(session);
  const isAdmin = roles.some((role) => ADMIN_ROLES.has(role));

  if (session?.authenticated && session.user?.id && isAdmin) {
    return {
      id: session.user.id,
      authType: "session",
      roles,
      user: session.user
    };
  }

  throw Object.assign(new Error("Admin authorization required"), {
    statusCode: session?.authenticated ? 403 : 401,
    code: session?.authenticated ? "ADMIN_FORBIDDEN" : "ADMIN_AUTH_REQUIRED",
    publicMessage: session?.authenticated ? "사이트관리자 권한이 없습니다." : "운영자 인증이 필요합니다."
  });
}

module.exports = {
  assertAdmin
};
