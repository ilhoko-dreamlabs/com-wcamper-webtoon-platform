const { assertAuthor } = require("./_lib/author-auth");
const {
  creatorStoreDiagnostics,
  ensureAuthorRecord,
  getCreatorProfile,
  updateCreatorProfile,
  listCreatorSeries,
  getCreatorSeries,
  createCreatorSeries,
  updateCreatorSeries,
  listCreatorEpisodes,
  getCreatorEpisode,
  createCreatorEpisode,
  updateCreatorEpisode,
  listEpisodeImages,
  createEpisodeImage,
  updateEpisodeImage,
  requestEpisodeReview,
  creatorSummary
} = require("./_lib/creator-content");
const { handleError, methodNotAllowed, readJson, sendJson } = require("./_lib/http");

function pathParts(request) {
  const path = request.query?.path;
  if (Array.isArray(path)) return path;
  if (typeof path === "string") return path.split("/").filter(Boolean);

  const pathname = new URL(request.url || "/", "https://webtoon.wcamper.com").pathname;
  const prefix = "/api/creator/";
  if (pathname.startsWith(prefix)) {
    return pathname.slice(prefix.length).split("/").filter(Boolean);
  }

  return [];
}

async function authorRecord(request) {
  const authorContext = await assertAuthor(request);
  const author = await ensureAuthorRecord(authorContext);
  return { authorContext, author };
}

async function handleMe(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  const authorContext = await assertAuthor(request);
  sendJson(response, 200, {
    authenticated: true,
    author: authorContext.author,
    user: {
      id: authorContext.user.id,
      displayName: authorContext.user.displayName || authorContext.user.name || authorContext.user.nickname || null,
      email: authorContext.user.email || null
    },
    roles: authorContext.roles
  });
}

async function handleDiagnostics(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  await assertAuthor(request);
  const diagnostics = await creatorStoreDiagnostics();
  sendJson(response, diagnostics.ready ? 200 : 503, diagnostics);
}

async function handleSummary(request, response) {
  if (request.method !== "GET") {
    methodNotAllowed(response, ["GET"]);
    return;
  }

  const { author } = await authorRecord(request);
  const summary = await creatorSummary(author.id);
  sendJson(response, 200, { author, summary });
}

async function handleProfile(request, response) {
  if (request.method === "GET") {
    const { author } = await authorRecord(request);
    const profile = await getCreatorProfile(author.id);
    sendJson(response, 200, { author, profile });
    return;
  }

  if (request.method === "PATCH") {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const profile = await updateCreatorProfile(author.id, body);
    sendJson(response, 200, { profile });
    return;
  }

  methodNotAllowed(response, ["GET", "PATCH"]);
}

async function handleSeriesCollection(request, response) {
  if (request.method === "GET") {
    const { author } = await authorRecord(request);
    const series = await listCreatorSeries(author.id);
    sendJson(response, 200, { author, series });
    return;
  }

  if (request.method === "POST") {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const series = await createCreatorSeries(author.id, body);
    sendJson(response, 201, { series });
    return;
  }

  methodNotAllowed(response, ["GET", "POST"]);
}

async function handleSeriesItem(request, response, seriesId) {
  if (request.method === "GET") {
    const { author } = await authorRecord(request);
    const series = await getCreatorSeries(author.id, seriesId);

    if (!series) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { series });
    return;
  }

  if (request.method === "PATCH") {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const series = await updateCreatorSeries(author.id, seriesId, body);

    if (!series) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { series });
    return;
  }

  methodNotAllowed(response, ["GET", "PATCH"]);
}

async function handleSeriesEpisodes(request, response, seriesId) {
  if (request.method === "GET") {
    const { author } = await authorRecord(request);
    const episodes = await listCreatorEpisodes(author.id, seriesId);

    if (!episodes) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { episodes });
    return;
  }

  if (request.method === "POST") {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const episode = await createCreatorEpisode(author.id, seriesId, body);

    if (!episode) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "작품을 찾지 못했습니다." });
      return;
    }

    sendJson(response, 201, { episode });
    return;
  }

  methodNotAllowed(response, ["GET", "POST"]);
}

async function handleEpisodeItem(request, response, episodeId) {
  if (request.method === "GET") {
    const { author } = await authorRecord(request);
    const episode = await getCreatorEpisode(author.id, episodeId);

    if (!episode) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "회차를 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { episode });
    return;
  }

  if (request.method !== "PATCH") {
    methodNotAllowed(response, ["GET", "PATCH"]);
    return;
  }

  const authorContext = await assertAuthor(request);
  const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
  const episode = await updateCreatorEpisode(author.id, episodeId, body);

  if (!episode) {
    sendJson(response, 404, { error: "NOT_FOUND", message: "회차를 찾지 못했습니다." });
    return;
  }

  sendJson(response, 200, { episode });
}

async function handleEpisodeImages(request, response, episodeId) {
  if (request.method === "GET") {
    const { author } = await authorRecord(request);
    const images = await listEpisodeImages(author.id, episodeId);

    if (!images) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "회차를 찾지 못했습니다." });
      return;
    }

    sendJson(response, 200, { images });
    return;
  }

  if (request.method === "POST") {
    const authorContext = await assertAuthor(request);
    const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
    const image = await createEpisodeImage(author.id, episodeId, body);

    if (!image) {
      sendJson(response, 404, { error: "NOT_FOUND", message: "회차를 찾지 못했습니다." });
      return;
    }

    sendJson(response, 201, { image });
    return;
  }

  methodNotAllowed(response, ["GET", "POST"]);
}

async function handleEpisodeImageItem(request, response, imageId) {
  if (request.method !== "PATCH") {
    methodNotAllowed(response, ["PATCH"]);
    return;
  }

  const authorContext = await assertAuthor(request);
  const [author, body] = await Promise.all([ensureAuthorRecord(authorContext), readJson(request)]);
  const image = await updateEpisodeImage(author.id, imageId, body);

  if (!image) {
    sendJson(response, 404, { error: "NOT_FOUND", message: "이미지를 찾지 못했습니다." });
    return;
  }

  sendJson(response, 200, { image });
}

async function handleEpisodeReviewRequest(request, response, episodeId) {
  if (request.method !== "POST") {
    methodNotAllowed(response, ["POST"]);
    return;
  }

  const { author } = await authorRecord(request);
  const episode = await requestEpisodeReview(author.id, episodeId);

  if (!episode) {
    sendJson(response, 404, { error: "NOT_FOUND", message: "회차를 찾지 못했습니다." });
    return;
  }

  sendJson(response, 200, { episode });
}

module.exports = async function handler(request, response) {
  try {
    const parts = pathParts(request);

    if (parts.length === 1 && parts[0] === "me") {
      await handleMe(request, response);
      return;
    }

    if (parts.length === 1 && parts[0] === "diagnostics") {
      await handleDiagnostics(request, response);
      return;
    }

    if (parts.length === 1 && parts[0] === "summary") {
      await handleSummary(request, response);
      return;
    }

    if (parts.length === 1 && parts[0] === "profile") {
      await handleProfile(request, response);
      return;
    }

    if (parts.length === 1 && parts[0] === "series") {
      await handleSeriesCollection(request, response);
      return;
    }

    if (parts.length === 2 && parts[0] === "series") {
      await handleSeriesItem(request, response, parts[1]);
      return;
    }

    if (parts.length === 3 && parts[0] === "series" && parts[2] === "episodes") {
      await handleSeriesEpisodes(request, response, parts[1]);
      return;
    }

    if (parts.length === 2 && parts[0] === "episodes") {
      await handleEpisodeItem(request, response, parts[1]);
      return;
    }

    if (parts.length === 3 && parts[0] === "episodes" && parts[2] === "images") {
      await handleEpisodeImages(request, response, parts[1]);
      return;
    }

    if (parts.length === 3 && parts[0] === "episodes" && parts[2] === "request-review") {
      await handleEpisodeReviewRequest(request, response, parts[1]);
      return;
    }

    if (parts.length === 2 && parts[0] === "images") {
      await handleEpisodeImageItem(request, response, parts[1]);
      return;
    }

    sendJson(response, 404, { error: "NOT_FOUND", message: "작가 API 경로를 찾지 못했습니다." });
  } catch (error) {
    handleError(response, error);
  }
};
