const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { buildStaticCatalogImportPlan, loadStaticCatalog } = require("./catalog-import-service");

const ROOT = path.resolve(__dirname, "..", "..");

function readStaticCatalogBaseline(baselinePath = path.join(ROOT, "reports", "static-catalog-baseline.json")) {
  if (!fs.existsSync(baselinePath)) return null;
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function stableHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function byId(rows) {
  return rows.reduce((indexed, row) => {
    indexed[row.id] = row;
    return indexed;
  }, {});
}

function baselinePublishedProjection(baseline) {
  if (!baseline) {
    return {
      seriesIds: [],
      episodeIds: [],
      imageRows: 0
    };
  }

  const seriesIds = (baseline.series || [])
    .filter((series) => String(series.status || "").includes("공개"))
    .map((series) => series.id)
    .sort();
  const publishedEpisodes = (baseline.episodes || []).filter((episode) =>
    String(episode.status || "").includes("공개")
  );

  return {
    seriesIds,
    episodeIds: publishedEpisodes.map((episode) => episode.id).sort(),
    imageRows: publishedEpisodes.reduce((total, episode) => total + (episode.panelCount || 0), 0)
  };
}

function diffIds(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  return {
    missing: expected.filter((id) => !actualSet.has(id)),
    unexpected: actual.filter((id) => !expectedSet.has(id))
  };
}

function buildPublicSnapshot(plan, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const episodeIndex = byId(plan.rows.episodes);
  const imageRowsByEpisodeId = plan.rows.images.reduce((grouped, image) => {
    if (!grouped[image.episodeId]) grouped[image.episodeId] = [];
    grouped[image.episodeId].push(image);
    return grouped;
  }, {});

  const authors = plan.rows.authors.map((author) => ({
    id: author.id,
    handle: author.handle,
    displayName: author.displayName,
    bio: author.bio,
    iconUrl: author.iconUrl,
    status: author.status
  }));

  const episodes = plan.rows.episodes
    .filter((episode) => episode.publicationStatus === "PUBLISHED")
    .map((episode) => ({
      id: episode.id,
      seriesId: episode.seriesId,
      number: episode.number,
      title: episode.title,
      summary: episode.summary,
      contentUrl: episode.contentUrl,
      publishedAt: episode.publishedAt,
      images: (imageRowsByEpisodeId[episode.id] || [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => ({
          id: image.id,
          sortOrder: image.sortOrder,
          imageUrl: image.imageUrl,
          altText: image.altText,
          gapAfter: image.gapAfter,
          backgroundColor: image.backgroundColor
        }))
    }))
    .sort((a, b) => a.seriesId.localeCompare(b.seriesId) || a.number - b.number || a.id.localeCompare(b.id));

  const publicEpisodeIds = new Set(episodes.map((episode) => episode.id));
  const series = plan.rows.series
    .filter((seriesRow) => seriesRow.publicationStatus === "PUBLISHED")
    .map((seriesRow) => ({
      id: seriesRow.id,
      authorId: seriesRow.authorId,
      title: seriesRow.title,
      summary: seriesRow.summary,
      genre: seriesRow.genre,
      tags: seriesRow.tags,
      coverUrl: seriesRow.coverUrl,
      episodes: plan.rows.episodes
        .filter((episode) => episode.seriesId === seriesRow.id && publicEpisodeIds.has(episode.id))
        .sort((a, b) => a.number - b.number || a.id.localeCompare(b.id))
        .map((episode) => episode.id)
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    role: "public-catalog-snapshot-dry-run",
    source: plan.source || "static-catalog-import-plan",
    mutationPerformed: false,
    generatedAt,
    authors,
    series,
    episodes,
    imageCount: episodes.reduce((total, episode) => total + episode.images.length, 0),
    orphanPublishedEpisodes: episodes
      .filter((episode) => !plan.rows.series.some((seriesRow) => seriesRow.id === episode.seriesId))
      .map((episode) => episode.id),
    missingEpisodeRows: series
      .flatMap((seriesRow) => seriesRow.episodes)
      .filter((episodeId) => !episodeIndex[episodeId])
  };
}

function comparePublicSnapshotToBaseline(snapshot, baseline) {
  const expected = baselinePublishedProjection(baseline);
  const actual = {
    seriesIds: snapshot.series.map((series) => series.id).sort(),
    episodeIds: snapshot.episodes.map((episode) => episode.id).sort(),
    imageRows: snapshot.imageCount
  };
  const seriesDiff = diffIds(expected.seriesIds, actual.seriesIds);
  const episodeDiff = diffIds(expected.episodeIds, actual.episodeIds);
  const mismatches = [];

  if (expected.imageRows !== actual.imageRows) {
    mismatches.push({ key: "imageRows", expected: expected.imageRows, actual: actual.imageRows });
  }

  return {
    expected,
    actual,
    seriesDiff,
    episodeDiff,
    mismatches,
    matches:
      !seriesDiff.missing.length &&
      !seriesDiff.unexpected.length &&
      !episodeDiff.missing.length &&
      !episodeDiff.unexpected.length &&
      !mismatches.length
  };
}

function buildPublicSnapshotReport(catalog, options = {}) {
  const baseline = options.baseline === undefined ? readStaticCatalogBaseline() : options.baseline;
  const plan = buildStaticCatalogImportPlan(catalog, { baseline });
  const snapshot = buildPublicSnapshot(plan, { generatedAt: options.generatedAt });
  const baselineComparison = comparePublicSnapshotToBaseline(snapshot, baseline);

  return {
    ...snapshot,
    source: "static-catalog-import-plan",
    sourceHash: stableHash({
      series: snapshot.series,
      episodes: snapshot.episodes,
      imageCount: snapshot.imageCount
    }),
    counts: {
      authors: snapshot.authors.length,
      series: snapshot.series.length,
      episodes: snapshot.episodes.length,
      images: snapshot.imageCount
    },
    baselineComparison
  };
}

function buildPublicCatalogPayload(catalog, snapshot) {
  const publishedSeriesIds = new Set(snapshot.series.map((series) => series.id));
  const publishedEpisodeIds = new Set(snapshot.episodes.map((episode) => episode.id));
  const publishedAuthorIds = new Set(snapshot.series.map((series) => series.authorId));

  return {
    ...catalog,
    series: (catalog.series || [])
      .filter((series) => publishedSeriesIds.has(series.id))
      .map((series) => ({
        ...series,
        episodes: (series.episodes || []).filter((episodeId) => publishedEpisodeIds.has(episodeId))
      })),
    authors: (catalog.authors || []).filter((author) => publishedAuthorIds.has(author.id)),
    episodes: (catalog.episodes || []).filter((episode) => publishedEpisodeIds.has(episode.id))
  };
}

function buildPublicCatalogArtifact(catalog, options = {}) {
  const report = buildPublicSnapshotReport(catalog, options);
  const payload = buildPublicCatalogPayload(catalog, report);
  const payloadHash = stableHash(payload);

  return {
    role: "public-catalog-artifact-dry-run",
    artifactVersion: "public-catalog-artifact.v0.8",
    source: report.source,
    sourceHash: report.sourceHash,
    payloadHash,
    mutationPerformed: false,
    generatedAt: report.generatedAt,
    runtimeContract: {
      globalName: "WCAMPER_WEBTOON",
      assignment: "window.WCAMPER_WEBTOON",
      mediaType: "application/javascript",
      candidatePath: "public/data/catalog.generated.js",
      currentRuntimePath: "/data/catalog.js"
    },
    counts: {
      authors: payload.authors.length,
      series: payload.series.length,
      episodes: payload.episodes.length,
      images: report.counts.images
    },
    baselineComparison: report.baselineComparison,
    invariants: {
      publishedOnlySeries: payload.series.every((series) => String(series.status || "").includes("공개")),
      publishedOnlyEpisodes: payload.episodes.every((episode) => String(episode.status || "").includes("공개")),
      seriesEpisodeRefsResolve: payload.series.every((series) =>
        (series.episodes || []).every((episodeId) => payload.episodes.some((episode) => episode.id === episodeId))
      ),
      matchesPublishedBaseline: report.baselineComparison.matches,
      mutationPerformed: false
    },
    payload
  };
}

function serializePublicCatalogArtifactPayload(payload) {
  return `window.WCAMPER_WEBTOON = ${JSON.stringify(payload, null, 2)};\n`;
}

function writePublicCatalogArtifactFile(artifact, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serializePublicCatalogArtifactPayload(artifact.payload));

  return {
    outputPath,
    payloadHash: artifact.payloadHash,
    bytes: fs.statSync(outputPath).size,
    localFileWritten: true
  };
}

function loadPublicCatalogForBuild(options = {}) {
  const catalog = loadStaticCatalog(options.catalogPath);
  return {
    catalog,
    source: "data/catalog.js",
    mode: "static-snapshot-input",
    mutationPerformed: false
  };
}

module.exports = {
  buildPublicCatalogArtifact,
  buildPublicCatalogPayload,
  baselinePublishedProjection,
  buildPublicSnapshot,
  buildPublicSnapshotReport,
  comparePublicSnapshotToBaseline,
  loadPublicCatalogForBuild,
  readStaticCatalogBaseline,
  serializePublicCatalogArtifactPayload,
  stableHash,
  writePublicCatalogArtifactFile
};
