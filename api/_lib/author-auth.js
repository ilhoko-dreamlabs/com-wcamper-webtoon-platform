const { verifyAuthSession } = require("./auth");
const { query } = require("./db");

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

async function activeAuthorFromSession(session) {
  if (!session?.authenticated || !session.user?.id) return null;

  try {
    const result = await query(
      `select id, user_id as "userId", display_name as "displayName", status,
              approved_at as "approvedAt", created_at as "createdAt", updated_at as "updatedAt"
       from authors
       where user_id = $1 and status = 'ACTIVE'
       order by created_at desc nulls last
       limit 1`,
      [session.user.id]
    );

    const author = result.rows[0] || null;
    return author ? { ...author, source: "webtoon-author-record" } : null;
  } catch (error) {
    if (["42P01", "42703", "3D000", "ECONNREFUSED", "ENOTFOUND", "DB_NOT_CONFIGURED"].includes(error.code)) {
      return null;
    }

    throw error;
  }
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

  const author = await activeAuthorFromSession(session);

  if (author) {
    return {
      authType: "webtoon-author-record",
      roles: rolesFromSession(session),
      user: session.user,
      author
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
  activeAuthorFromSession,
  authorEmails,
  emailFromSession,
  rolesFromSession,
  sessionHasAuthorGrant,
  virtualAuthorFromSession
};
