const fs = require("fs");
const path = require("path");
const { ROOT, loadCatalog } = require("./_catalog-loader");

function isLocalAsset(value) {
  return typeof value === "string" && /^assets\/img\//.test(value);
}

function unique(values) {
  return Array.from(new Set(values)).sort();
}

function collectImageRefs(data) {
  const refs = [];

  data.series.forEach((series) => {
    if (isLocalAsset(series.cover)) refs.push(series.cover);
    if (isLocalAsset(series.thumbnail)) refs.push(series.thumbnail);
  });

  data.authors.forEach((author) => {
    if (isLocalAsset(author.image)) refs.push(author.image);
  });

  data.episodes.forEach((episode) => {
    if (isLocalAsset(episode.thumbnail)) refs.push(episode.thumbnail);
    (episode.panels || []).forEach((panel) => {
      if (isLocalAsset(panel.image)) refs.push(panel.image);
    });
  });

  return unique(refs);
}

function countPublishedSeries(data) {
  return data.series.filter((series) => String(series.status || "").includes("공개")).length;
}

function countPublishedEpisodes(data) {
  return data.episodes.filter((episode) => String(episode.status || "").includes("공개")).length;
}

function countPanels(data) {
  return data.episodes.reduce((total, episode) => total + (episode.panels || []).length, 0);
}

function buildBaseline() {
  const data = loadCatalog();
  const imageRefs = collectImageRefs(data);
  const missingImageRefs = imageRefs.filter((assetPath) => !fs.existsSync(path.join(ROOT, assetPath)));

  return {
    generatedAt: new Date().toISOString(),
    source: "data/catalog.js",
    role: "migration-input-baseline",
    counts: {
      authors: data.authors.length,
      series: data.series.length,
      publishedSeries: countPublishedSeries(data),
      episodes: data.episodes.length,
      publishedEpisodes: countPublishedEpisodes(data),
      panels: countPanels(data),
      crew: (data.crew || []).length,
      notes: (data.notes || []).length,
      feedbackTargets: data.feedback && data.feedback.targets ? data.feedback.targets.length : 0,
      goals: data.goals && data.goals.items ? data.goals.items.length : 0,
      localImageRefs: imageRefs.length,
      missingLocalImageRefs: missingImageRefs.length
    },
    series: data.series.map((series) => ({
      id: series.id,
      authorId: series.authorId,
      title: series.title,
      status: series.status,
      episodeIds: series.episodes || [],
      episodeCount: (series.episodes || []).length
    })),
    episodes: data.episodes.map((episode) => ({
      id: episode.id,
      seriesId: episode.seriesId,
      number: episode.number,
      title: episode.title,
      status: episode.status,
      publishedAt: episode.publishedAt,
      panelCount: (episode.panels || []).length,
      imageRefs: unique([
        episode.thumbnail,
        ...(episode.panels || []).map((panel) => panel.image)
      ].filter(isLocalAsset))
    })),
    localImageRefs: imageRefs,
    missingLocalImageRefs: missingImageRefs
  };
}

function main() {
  const baseline = buildBaseline();
  const outputPath = path.join(ROOT, "reports", "static-catalog-baseline.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`);

  console.log(`Wrote ${path.relative(ROOT, outputPath)}`);
  console.log(`Series: ${baseline.counts.series}, episodes: ${baseline.counts.episodes}, panels: ${baseline.counts.panels}`);
  console.log(`Local image refs: ${baseline.counts.localImageRefs}, missing: ${baseline.counts.missingLocalImageRefs}`);

  if (baseline.counts.missingLocalImageRefs > 0) {
    process.exitCode = 1;
  }
}

main();
