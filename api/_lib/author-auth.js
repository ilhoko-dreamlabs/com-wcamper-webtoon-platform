const { verifyAuthSession } = require("./auth");

const AUTHOR_ROLES = new Set(["webtoonAuthor", "creator", "author"]);
const DEFAULT_AUTHOR_EMAILS = ["ilho.ko@dreamlabs.co.kr"];

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function authorEmails() {
  return new Set([
    ...DEFAULT_AUTHOR_EMAILS,
    ...(process.env.WEBTOON_AUTHOR_EMAILS || "").split(/[,\s]+/)
  ].map(normalizeEmail).filter(Boolean));
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

function displayNameFromSession(session) {
  const email = emailFromSession(session);
  return (
    session?.user?.displayName ||
    session?.user?.name ||
    session?.user?.nickname ||
    (email ? email.split("@")[0] : "WCAMPER 작가")
  );
}

function virtualAuthorFromSession(session) {
  return {
    id: `author-${session.user.id}`,
    userId: session.user.id,
    displayName: displayNameFromSession(session),
    status: "ACTIVE",
    approvedAt: null,
    createdAt: null,
    updatedAt: null,
    source: "session-allowlist"
  };
}

function sessionHasAuthorGrant(session) {
  if (!session?.authenticated || !session.user?.id) return false;

  const roles = rolesFromSession(session);
  const email = emailFromSession(session);
  return roles.some((role) => AUTHOR_ROLES.has(role)) || authorEmails().has(email);
}

async function assertAuthor(request) {
  const session = await verifyAuthSession(request);

  if (sessionHasAuthorGrant(session)) {
    return {
      authType: "session",
      roles: rolesFromSession(session),
      user: session.user,
      author: virtualAuthorFromSession(session)
    };
  }

  throw Object.assign(new Error("Author authorization required"), {
    statusCode: 403,
    code: "AUTHOR_FORBIDDEN",
    publicMessage: "승인 작가 권한이 없습니다."
  });
}

module.exports = {
  assertAuthor,
  authorEmails,
  emailFromSession,
  rolesFromSession,
  sessionHasAuthorGrant,
  virtualAuthorFromSession
};
