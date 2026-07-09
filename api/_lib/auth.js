const DEFAULT_AUTH_SESSION_URL = "https://auth.wcamper.com/api/auth/session";

async function verifyAuthSession(request) {
  const cookie = request.headers.cookie || "";

  if (!cookie) {
    throw Object.assign(new Error("Authentication required"), {
      statusCode: 401,
      code: "AUTH_REQUIRED",
      publicMessage: "통합로그인이 필요합니다."
    });
  }

  const response = await fetch(process.env.AUTH_SESSION_URL || DEFAULT_AUTH_SESSION_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Cookie: cookie,
      Origin: process.env.WEBTOON_PUBLIC_ORIGIN || "https://webtoon.wcamper.com"
    }
  });

  let session = null;

  try {
    session = await response.json();
  } catch {
    session = null;
  }

  if (!response.ok || !session?.authenticated || !session.user?.id) {
    throw Object.assign(new Error("Authentication required"), {
      statusCode: 401,
      code: "AUTH_REQUIRED",
      publicMessage: "통합로그인이 필요합니다."
    });
  }

  return session;
}

async function optionalAuthSession(request) {
  try {
    return await verifyAuthSession(request);
  } catch (error) {
    if (error.statusCode === 401) {
      return null;
    }

    throw error;
  }
}

module.exports = {
  optionalAuthSession,
  verifyAuthSession
};
