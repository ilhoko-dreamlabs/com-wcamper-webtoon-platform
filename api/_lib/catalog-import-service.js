const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..", "..");

function loadStaticCatalog(catalogPath = path.join(ROOT, "data", "catalog.js")) {
  const source = fs.readFileSync(catalogPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: catalogPath });

  if (!context.window.WCAMPER_WEBTOON) {
    throw new Error("data/catalog.js did not define window.WCAMPER_WEBTOON");
  }

  return context.window.WCAMPER_WEBTOON;
}

function normalizeAssetUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function catalogStatusToDbStatus(value) {
  const text = String(value || "").trim();
  if (text.includes("공개")) return "PUBLISHED";
  if (text.includes("기획")) return "DRAFT";
  return "DRAFT";
}

function statusProjection(dbStatus) {
  if (dbStatus === "PUBLISHED") {
    return {
      draftStatus: "APPROVED",
      publicationStatus: "PUBLISHED"
    };
  }

  return {
    draftStatus: "DRAFT",
    publicationStatus: "UNPUBLISHED"
  };
}

function normalizeTags(value) {
  return Array.isArray(value)
    ? value.map((tag) => String(tag || "").trim()).filter(Boolean)
    : [];
}

function firstAuthor(catalog) {
  const author = Array.isArray(catalog.authors) ? catalog.authors[0] : null;
  if (!author) {
    throw new Error("Catalog import requires at least one author");
  }
  return author;
}

function toAuthorRows(catalog) {
  return [firstAuthor(catalog)].map((author) => ({
    id: author.id,
    handle: author.id,
    displayName: author.name || author.id,
    bio: author.bio || "",
    iconUrl: normalizeAssetUrl(author.image),
    status: "ACTIVE"
  }));
}

function toSeriesRows(catalog) {
  return (catalog.series || []).map((series) => {
    const status = catalogStatusToDbStatus(series.status);
    const projection = statusProjection(status);

    return {
      id: series.id,
      authorId: series.authorId || firstAuthor(catalog).id,
      title: series.title,
      summary: series.summary || "",
      genre: normalizeTags(series.tags)[0] || "",
      tags: normalizeTags(series.tags),
      coverUrl: normalizeAssetUrl(series.cover || series.thumbnail),
      status,
      draftStatus: projection.draftStatus,
      publicationStatus: projection.publicationStatus
    };
  });
}

function toEpisodeRows(catalog) {
  return (catalog.episodes || []).map((episode) => {
    const status = catalogStatusToDbStatus(episode.status);
    const projection = statusProjection(status);

    return {
      id: episode.id,
      seriesId: episode.seriesId,
      number: Number.parseInt(episode.number, 10),
      title: episode.title,
      summary: episode.summary || "",
      contentUrl: status === "PUBLISHED" ? `/episodes/${episode.id}` : null,
      status,
      draftStatus: projection.draftStatus,
      publicationStatus: projection.publicationStatus,
      publishedAt: status === "PUBLISHED" ? episode.publishedAt || null : null
    };
  });
}

function toImageRows(catalog) {
  return (catalog.episodes || []).flatMap((episode) =>
    (episode.panels || []).map((panel, index) => ({
      id: `${episode.id}-image-${String(index + 1).padStart(3, "0")}`,
      episodeId: episode.id,
      sortOrder: index + 1,
      imageUrl: normalizeAssetUrl(panel.image),
      altText: panel.caption || panel.beat || episode.title || "",
      gapAfter: 0,
      backgroundColor: "#ffffff"
    }))
  );
}

function findDuplicateIds(rows) {
  const seen = new Set();
  const duplicates = new Set();

  rows.forEach((row) => {
    if (seen.has(row.id)) duplicates.add(row.id);
    seen.add(row.id);
  });

  return Array.from(duplicates).sort();
}

function missingRequiredRows(rows, fields) {
  return rows
    .map((row) => ({
      id: row.id,
      missing: fields.filter((field) => row[field] === null || row[field] === undefined || row[field] === "")
    }))
    .filter((item) => item.missing.length > 0);
}

function compareBaseline(plan, baseline) {
  if (!baseline || !baseline.counts) return [];

  const mismatches = [];
  const expected = {
    authors: baseline.counts.authors,
    series: baseline.counts.series,
    episodes: baseline.counts.episodes,
    images: baseline.counts.panels
  };
  const actual = {
    authors: plan.rows.authors.length,
    series: plan.rows.series.length,
    episodes: plan.rows.episodes.length,
    images: plan.rows.images.length
  };

  Object.keys(expected).forEach((key) => {
    if (expected[key] !== actual[key]) {
      mismatches.push({ key, expected: expected[key], actual: actual[key] });
    }
  });

  return mismatches;
}

function buildStaticCatalogImportPlan(catalog, options = {}) {
  const rows = {
    authors: toAuthorRows(catalog),
    series: toSeriesRows(catalog),
    episodes: toEpisodeRows(catalog),
    images: toImageRows(catalog)
  };
  const duplicateIds = {
    authors: findDuplicateIds(rows.authors),
    series: findDuplicateIds(rows.series),
    episodes: findDuplicateIds(rows.episodes),
    images: findDuplicateIds(rows.images)
  };
  const requiredFieldIssues = {
    authors: missingRequiredRows(rows.authors, ["id", "displayName", "status"]),
    series: missingRequiredRows(rows.series, ["id", "authorId", "title", "status"]),
    episodes: missingRequiredRows(rows.episodes, ["id", "seriesId", "number", "title", "status"]),
    images: missingRequiredRows(rows.images, ["id", "episodeId", "sortOrder", "imageUrl"])
  };
  const baselineMismatches = compareBaseline({ rows }, options.baseline);

  return {
    mode: "dry-run",
    source: "data/catalog.js",
    mutationPerformed: false,
    generatedAt: new Date().toISOString(),
    counts: {
      authors: rows.authors.length,
      series: rows.series.length,
      episodes: rows.episodes.length,
      images: rows.images.length,
      publishedSeries: rows.series.filter((row) => row.publicationStatus === "PUBLISHED").length,
      publishedEpisodes: rows.episodes.filter((row) => row.publicationStatus === "PUBLISHED").length,
      unpublishedSeries: rows.series.filter((row) => row.publicationStatus !== "PUBLISHED").length,
      unpublishedEpisodes: rows.episodes.filter((row) => row.publicationStatus !== "PUBLISHED").length
    },
    dryRunActions: {
      authors: { plan: rows.authors.length, create: "unknown-without-db", update: "unknown-without-db", conflict: duplicateIds.authors.length },
      series: { plan: rows.series.length, create: "unknown-without-db", update: "unknown-without-db", conflict: duplicateIds.series.length },
      episodes: { plan: rows.episodes.length, create: "unknown-without-db", update: "unknown-without-db", conflict: duplicateIds.episodes.length },
      images: { plan: rows.images.length, create: "unknown-without-db", update: "unknown-without-db", conflict: duplicateIds.images.length }
    },
    duplicateIds,
    requiredFieldIssues,
    baselineMismatches,
    rows
  };
}

async function upsertStaticCatalogSeed(tx, plan, options = {}) {
  const authorId = options.authorId || plan.rows.authors[0]?.id;
  if (!authorId) {
    throw new Error("Static catalog seed requires an authorId");
  }

  for (const series of plan.rows.series) {
    await tx(
      `insert into webtoon_series (id, author_id, title, summary, genre, tags, cover_url, status, updated_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, now())
       on conflict (id) do update
       set author_id = excluded.author_id,
           title = excluded.title,
           summary = excluded.summary,
           genre = excluded.genre,
           tags = excluded.tags,
           cover_url = excluded.cover_url,
           status = excluded.status,
           updated_at = now()`,
      [
        series.id,
        authorId,
        series.title,
        series.summary,
        series.genre,
        JSON.stringify(series.tags),
        series.coverUrl,
        series.status
      ]
    );
  }

  for (const episode of plan.rows.episodes) {
    await tx(
      `insert into webtoon_episodes (id, series_id, number, title, summary, content_url, status, published_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, now())
       on conflict (id) do update
       set series_id = excluded.series_id,
           number = excluded.number,
           title = excluded.title,
           summary = excluded.summary,
           content_url = excluded.content_url,
           status = excluded.status,
           published_at = excluded.published_at,
           updated_at = now()`,
      [
        episode.id,
        episode.seriesId,
        episode.number,
        episode.title,
        episode.summary,
        episode.contentUrl,
        episode.status,
        episode.publishedAt
      ]
    );
  }

  for (const image of plan.rows.images) {
    await tx(
      `insert into episode_images (id, episode_id, sort_order, image_url, alt_text, gap_after, background_color, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())
       on conflict (id) do update
       set episode_id = excluded.episode_id,
           sort_order = excluded.sort_order,
           image_url = excluded.image_url,
           alt_text = excluded.alt_text,
           gap_after = excluded.gap_after,
           background_color = excluded.background_color,
           updated_at = now()`,
      [
        image.id,
        image.episodeId,
        image.sortOrder,
        image.imageUrl,
        image.altText,
        image.gapAfter,
        image.backgroundColor
      ]
    );
  }

  return {
    authors: 0,
    series: plan.rows.series.length,
    episodes: plan.rows.episodes.length,
    images: plan.rows.images.length
  };
}

module.exports = {
  buildStaticCatalogImportPlan,
  catalogStatusToDbStatus,
  loadStaticCatalog,
  normalizeAssetUrl,
  statusProjection,
  upsertStaticCatalogSeed
};
