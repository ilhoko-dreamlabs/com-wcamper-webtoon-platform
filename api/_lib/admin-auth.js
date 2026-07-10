const { verifyAuthSession } = require("./auth");

const ADMIN_ROLES = new Set(["siteAdmin", "webtoonAdmin"]);
const DEFAULT_ADMIN_EMAILS = ["ilho.ko@dreamlabs.co.kr"];

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function adminEmails() {
  return new Set([
    ...DEFAULT_ADMIN_EMAILS,
    ...(process.env.WEBTOON_ADMIN_EMAILS || "").split(/[,\s]+/)
  ].map(normalizeEmail).filter(Boolean));
}

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

function emailFromSession(session) {
  return normalizeEmail(
    session?.user?.email ||
    session?.email ||
    session?.claims?.email ||
    session?.user?.claims?.email
  );
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
  const email = emailFromSession(session);
  const isRoleAdmin = roles.some((role) => ADMIN_ROLES.has(role));
  const isEmailAdmin = adminEmails().has(email);
  const isAdmin = isRoleAdmin || isEmailAdmin;

  if (session?.authenticated && session.user?.id && isAdmin) {
    return {
      id: session.user.id,
      authType: "session",
      roles: isEmailAdmin && !isRoleAdmin ? [...roles, "webtoonAdmin"] : roles,
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
  assertAdmin,
  adminEmails,
  emailFromSession,
  rolesFromSession
};
