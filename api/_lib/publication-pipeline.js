const crypto = require("node:crypto");
const {
  serializePublicCatalogArtifactPayload,
  stableHash
} = require("./public-catalog-snapshot");
const { query, transaction } = require("./db");

const SNAPSHOT_STATUS = {
  generated: "GENERATED",
  published: "PUBLISHED",
  rolledBack: "ROLLED_BACK"
};

const RELEASE_STATUS = {
  created: "CREATED",
  smokePassed: "SMOKE_PASSED",
  promoted: "PROMOTED",
  rolledBack: "ROLLED_BACK"
};

const RELEASE_CANDIDATE_STATUSES = ["SCHEDULED", "PUBLISHED"];

function rowTags(value) {
  return Array.isArray(value) ? value : [];
}

function buildCatalogFromRows(rows) {
  const authorsById = new Map();
  rows.authors.forEach((author) => {
    authorsById.set(author.id, {
      id: author.handle || author.id,
      authorId: author.id,
      name: author.displayName,
      bio: author.bio || "",
      image: author.iconUrl || "",
      status: author.status
    });
  });

  const episodesBySeries = rows.episodes.reduce((grouped, episode) => {
    if (!grouped[episode.seriesId]) grouped[episode.seriesId] = [];
    grouped[episode.seriesId].push(episode);
    return grouped;
  }, {});

  const imagesByEpisode = rows.images.reduce((grouped, image) => {
    if (!grouped[image.episodeId]) grouped[image.episodeId] = [];
    grouped[image.episodeId].push(image);
    return grouped;
  }, {});

  const series = rows.series.map((seriesRow) => {
    const episodes = (episodesBySeries[seriesRow.id] || [])
      .slice()
      .sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));

    return {
      id: seriesRow.id,
      authorId: authorsById.get(seriesRow.authorId)?.id || seriesRow.authorId,
      title: seriesRow.title,
      summary: seriesRow.summary || "",
      tags: rowTags(seriesRow.tags),
      cover: seriesRow.coverUrl || "",
      status: "공개",
      episodes: episodes.map((episode) => episode.id)
    };
  });

  const episodes = rows.episodes.map((episode) => ({
    id: episode.id,
    seriesId: episode.seriesId,
    number: episode.number,
    title: episode.title,
    summary: episode.summary || "",
    status: "공개",
    publishedAt: episode.publishedAt,
    panels: (imagesByEpisode[episode.id] || [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
      .map((image) => ({
        image: image.imageUrl,
        caption: image.altText || "",
        backgroundColor: image.backgroundColor || "#ffffff"
      }))
  }));

  return {
    authors: Array.from(authorsById.values()).sort((a, b) => a.id.localeCompare(b.id)),
    series: series.sort((a, b) => a.id.localeCompare(b.id)),
    episodes: episodes.sort((a, b) => a.seriesId.localeCompare(b.seriesId) || a.number - b.number || a.id.localeCompare(b.id))
  };
}

async function readPublishedRows(tx = query) {
  const authorsResult = await tx(
    `select distinct a.id, a.handle, a.display_name as "displayName", a.bio, a.icon_url as "iconUrl", a.status
     from authors a
     join webtoon_series s on s.author_id = a.id
       where a.status = 'ACTIVE'
       and s.publication_status = any($1::text[])
     order by a.id`
    ,
    [RELEASE_CANDIDATE_STATUSES]
  );
  const seriesResult = await tx(
    `select id, author_id as "authorId", title, summary, genre, tags, cover_url as "coverUrl",
            publication_status as "publicationStatus"
     from webtoon_series
     where publication_status = any($1::text[])
     order by id`,
    [RELEASE_CANDIDATE_STATUSES]
  );
  const episodesResult = await tx(
    `select e.id, e.series_id as "seriesId", e.number, e.title, e.summary,
            e.content_url as "contentUrl", e.published_at as "publishedAt",
            e.publication_status as "publicationStatus"
     from webtoon_episodes e
     join webtoon_series s on s.id = e.series_id
     where e.publication_status = any($1::text[])
       and s.publication_status = any($1::text[])
     order by e.series_id, e.number, e.id`,
    [RELEASE_CANDIDATE_STATUSES]
  );
  const imagesResult = await tx(
    `select i.id, i.episode_id as "episodeId", i.sort_order as "sortOrder",
            i.image_url as "imageUrl", i.alt_text as "altText",
            i.gap_after as "gapAfter", i.background_color as "backgroundColor"
     from episode_images i
     join webtoon_episodes e on e.id = i.episode_id
     join webtoon_series s on s.id = e.series_id
     where e.publication_status = any($1::text[])
       and s.publication_status = any($1::text[])
     order by i.episode_id, i.sort_order, i.id`,
    [RELEASE_CANDIDATE_STATUSES]
  );

  return {
    authors: authorsResult.rows,
    series: seriesResult.rows,
    episodes: episodesResult.rows,
    images: imagesResult.rows
  };
}

function buildSnapshotPayload(rows, generatedAt = new Date().toISOString()) {
  const catalog = buildCatalogFromRows(rows);
  const sourceHash = stableHash({
    authors: rows.authors,
    series: rows.series,
    episodes: rows.episodes,
    images: rows.images
  });

  return {
    artifactVersion: "publication-pipeline.v0.32",
    source: "database",
    sourceHash,
    generatedAt,
    counts: {
      authors: catalog.authors.length,
      series: catalog.series.length,
      episodes: catalog.episodes.length,
      images: rows.images.length
    },
    invariants: {
      releaseCandidateSeries: rows.series.every((series) => RELEASE_CANDIDATE_STATUSES.includes(series.publicationStatus)),
      releaseCandidateEpisodes: rows.episodes.every((episode) => RELEASE_CANDIDATE_STATUSES.includes(episode.publicationStatus)),
      seriesEpisodeRefsResolve: catalog.series.every((series) =>
        series.episodes.every((episodeId) => catalog.episodes.some((episode) => episode.id === episodeId))
      )
    },
    payload: catalog
  };
}

async function createPublicationSnapshot(admin, options = {}) {
  return transaction(async (tx) => {
    const rows = await readPublishedRows(tx);
    const snapshot = buildSnapshotPayload(rows);
    const snapshotId = crypto.randomUUID();
    const outputPath = options.outputPath || "public/data/catalog.generated.js";
    const artifactContent = serializePublicCatalogArtifactPayload(snapshot.payload);
    const artifactChecksum = stableHash(artifactContent);
    const manifest = {
      snapshotId,
      sourceHash: snapshot.sourceHash,
      images: rows.images.map((image) => ({
        id: image.id,
        episodeId: image.episodeId,
        imageUrl: image.imageUrl
      }))
    };

    await tx(
      `insert into publication_snapshots
       (id, source, status, snapshot_type, target_id, source_hash, output_path, metadata, catalog_json, generated_by, generated_at)
       values ($1, 'database', 'GENERATED', 'CATALOG', null, $2, $3, $4::jsonb, $5::jsonb, $6, now())`,
      [
        snapshotId,
        snapshot.sourceHash,
        outputPath,
        JSON.stringify({
          counts: snapshot.counts,
          invariants: snapshot.invariants,
          seriesIds: rows.series.map((row) => row.id),
          episodeIds: rows.episodes.map((row) => row.id)
        }),
        JSON.stringify(snapshot.payload),
        admin.id
      ]
    );

    await tx(
      `insert into static_artifacts
       (id, snapshot_id, artifact_type, output_path, checksum, byte_size, metadata)
       values ($1, $2, 'CATALOG_JSON', $3, $4, $5, $6::jsonb)`,
      [
        crypto.randomUUID(),
        snapshotId,
        outputPath,
        artifactChecksum,
        Buffer.byteLength(artifactContent, "utf8"),
        JSON.stringify({ globalName: "WCAMPER_WEBTOON", mediaType: "application/javascript" })
      ]
    );

    await tx(
      `insert into static_artifacts
       (id, snapshot_id, artifact_type, output_path, checksum, byte_size, metadata)
       values ($1, $2, 'IMAGE_MANIFEST', $3, $4, $5, $6::jsonb)`,
      [
        crypto.randomUUID(),
        snapshotId,
        "public/data/image-manifest.generated.json",
        stableHash(manifest),
        Buffer.byteLength(JSON.stringify(manifest), "utf8"),
        JSON.stringify({ imageCount: rows.images.length })
      ]
    );

    return {
      id: snapshotId,
      status: SNAPSHOT_STATUS.generated,
      source: "database",
      sourceHash: snapshot.sourceHash,
      outputPath,
      counts: snapshot.counts,
      invariants: snapshot.invariants,
      artifactChecksum
    };
  });
}

async function listPublicationSnapshots() {
  const result = await query(
    `select id, source, status, snapshot_type as "snapshotType", target_id as "targetId",
            source_hash as "sourceHash", output_path as "outputPath", metadata,
            generated_by as "generatedBy", generated_at as "generatedAt", published_at as "publishedAt"
     from publication_snapshots
     order by generated_at desc
     limit 50`
  );
  return result.rows;
}

async function createPreviewRelease(admin, snapshotId, body = {}) {
  const releaseId = crypto.randomUUID();
  const previewUrl = typeof body.previewUrl === "string" && body.previewUrl.trim()
    ? body.previewUrl.trim().slice(0, 500)
    : null;

  const result = await query(
    `insert into publication_releases
     (id, snapshot_id, environment, status, release_url, promoted_by, metadata)
     select $1, id, 'PREVIEW', 'CREATED', $3, $4, $5::jsonb
     from publication_snapshots
     where id = $2 and status in ('GENERATED', 'PUBLISHED')
     returning id, snapshot_id as "snapshotId", environment, status, release_url as "releaseUrl", created_at as "createdAt"`,
    [releaseId, snapshotId, previewUrl, admin.id, JSON.stringify({ smoke: "pending" })]
  );
  return result.rows[0] || null;
}

async function markReleaseSmokePassed(admin, releaseId, body = {}) {
  const result = await query(
    `update publication_releases
     set status = 'SMOKE_PASSED',
         promoted_by = $2,
         metadata = metadata || $3::jsonb
     where id = $1 and environment = 'PREVIEW' and status = 'CREATED'
     returning id, snapshot_id as "snapshotId", environment, status, release_url as "releaseUrl", metadata, created_at as "createdAt"`,
    [releaseId, admin.id, JSON.stringify({ smoke: "passed", note: String(body.note || "").slice(0, 1000) })]
  );
  return result.rows[0] || null;
}

async function promoteRelease(admin, releaseId, body = {}) {
  return transaction(async (tx) => {
    const preview = await tx(
      `select id, snapshot_id, release_url
       from publication_releases
       where id = $1 and environment = 'PREVIEW' and status = 'SMOKE_PASSED'
       limit 1`,
      [releaseId]
    );
    const source = preview.rows[0];
    if (!source) return null;

    await tx(
      `update publication_releases
       set status = 'ROLLED_BACK'
       where environment = 'PRODUCTION' and status = 'PROMOTED'`
    );

    await tx(
      `update publication_snapshots
       set status = case when id = $1 then 'PUBLISHED' else status end,
           published_at = case when id = $1 then now() else published_at end
       where id = $1`,
      [source.snapshot_id]
    );

    const snapshotResult = await tx(
      `select metadata
       from publication_snapshots
       where id = $1
       limit 1`,
      [source.snapshot_id]
    );
    const snapshotMetadata = snapshotResult.rows[0]?.metadata || {};
    const seriesIds = Array.isArray(snapshotMetadata.seriesIds) ? snapshotMetadata.seriesIds : [];
    const episodeIds = Array.isArray(snapshotMetadata.episodeIds) ? snapshotMetadata.episodeIds : [];

    if (seriesIds.length) {
      await tx(
        `update webtoon_series
         set status = 'PUBLISHED',
             draft_status = 'APPROVED',
             publication_status = 'PUBLISHED',
             updated_at = now()
         where id = any($1::text[])`,
        [seriesIds]
      );
    }
    if (episodeIds.length) {
      await tx(
        `update webtoon_episodes
         set status = 'PUBLISHED',
             draft_status = 'APPROVED',
             publication_status = 'PUBLISHED',
             published_at = coalesce(published_at, now()),
             updated_at = now()
         where id = any($1::text[])`,
        [episodeIds]
      );
    }

    const production = await tx(
      `insert into publication_releases
       (id, snapshot_id, environment, status, release_url, promoted_by, promoted_at, rollback_of_release_id, metadata)
       values ($1, $2, 'PRODUCTION', 'PROMOTED', $3, $4, now(), null, $5::jsonb)
       returning id, snapshot_id as "snapshotId", environment, status, release_url as "releaseUrl",
                 promoted_by as "promotedBy", promoted_at as "promotedAt", created_at as "createdAt"`,
      [
        crypto.randomUUID(),
        source.snapshot_id,
        typeof body.productionUrl === "string" && body.productionUrl.trim() ? body.productionUrl.trim().slice(0, 500) : source.release_url,
        admin.id,
        JSON.stringify({ promotedFromPreviewReleaseId: releaseId })
      ]
    );

    return production.rows[0];
  });
}

async function rollbackProductionRelease(admin, releaseId, body = {}) {
  return transaction(async (tx) => {
    const current = await tx(
      `select id, snapshot_id, release_url
       from publication_releases
       where id = $1 and environment = 'PRODUCTION' and status = 'PROMOTED'
       limit 1`,
      [releaseId]
    );
    const release = current.rows[0];
    if (!release) return null;

    const previous = await tx(
      `select id, snapshot_id, release_url
       from publication_releases
       where environment = 'PRODUCTION'
         and status in ('ROLLED_BACK', 'PROMOTED')
         and id <> $1
       order by promoted_at desc nulls last, created_at desc
       limit 1`,
      [releaseId]
    );
    const target = previous.rows[0];
    if (!target) {
      await tx(
        `update publication_releases
         set status = 'ROLLED_BACK'
         where id = $1`,
        [releaseId]
      );
      return { rolledBackReleaseId: releaseId, replacementRelease: null };
    }

    await tx(
      `update publication_releases
       set status = 'ROLLED_BACK'
       where id = $1`,
      [releaseId]
    );

    const replacement = await tx(
      `insert into publication_releases
       (id, snapshot_id, environment, status, release_url, promoted_by, promoted_at, rollback_of_release_id, metadata)
       values ($1, $2, 'PRODUCTION', 'PROMOTED', $3, $4, now(), $5, $6::jsonb)
       returning id, snapshot_id as "snapshotId", environment, status, release_url as "releaseUrl",
                 rollback_of_release_id as "rollbackOfReleaseId", promoted_at as "promotedAt"`,
      [
        crypto.randomUUID(),
        target.snapshot_id,
        typeof body.productionUrl === "string" && body.productionUrl.trim() ? body.productionUrl.trim().slice(0, 500) : target.release_url,
        admin.id,
        releaseId,
        JSON.stringify({ rollbackReason: String(body.reason || "").slice(0, 1000), restoredReleaseId: target.id })
      ]
    );

    return { rolledBackReleaseId: releaseId, replacementRelease: replacement.rows[0] };
  });
}

async function listPublicationReleases() {
  const result = await query(
    `select id, snapshot_id as "snapshotId", environment, status, release_url as "releaseUrl",
            promoted_by as "promotedBy", promoted_at as "promotedAt",
            rollback_of_release_id as "rollbackOfReleaseId", metadata, created_at as "createdAt"
     from publication_releases
     order by created_at desc
     limit 50`
  );
  return result.rows;
}

module.exports = {
  buildCatalogFromRows,
  buildSnapshotPayload,
  createPreviewRelease,
  createPublicationSnapshot,
  listPublicationReleases,
  listPublicationSnapshots,
  markReleaseSmokePassed,
  promoteRelease,
  readPublishedRows,
  rollbackProductionRelease
};
