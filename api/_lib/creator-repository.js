const { query } = require("./db");
const {
  serializeAuthorProfile,
  serializeEpisode,
  serializeEpisodeImage,
  serializeSeries
} = require("./creator-read-model");

function seriesSelectSql(whereClause) {
  return `select webtoon_series.id, author_id as "authorId", title, summary, genre, tags, cover_url as "coverUrl",
                 status, review_note as "reviewNote", created_at as "createdAt", updated_at as "updatedAt"
          from webtoon_series
          ${whereClause}`;
}

function episodeSelectSql(whereClause) {
  return `select webtoon_episodes.id, series_id as "seriesId", number, title, summary, draft_body as "draftBody",
                 content_url as "contentUrl", webtoon_episodes.status, webtoon_episodes.review_note as "reviewNote",
                 scheduled_at as "scheduledAt", published_at as "publishedAt",
                 webtoon_episodes.created_at as "createdAt", webtoon_episodes.updated_at as "updatedAt"
          from webtoon_episodes
          ${whereClause}`;
}

async function findCreatorProfile(authorId) {
  const result = await query(
    `select id, user_id as "userId", display_name as "displayName", bio, handle, icon_url as "iconUrl",
            public_page_enabled as "publicPageEnabled", status, approved_at as "approvedAt",
            updated_at as "updatedAt"
     from authors
     where id = $1
     limit 1`,
    [authorId]
  );
  return result.rows[0] ? serializeAuthorProfile(result.rows[0]) : null;
}

async function listSeriesByAuthor(authorId) {
  const result = await query(`${seriesSelectSql("where author_id = $1")} order by updated_at desc`, [authorId]);
  return result.rows.map(serializeSeries);
}

async function findSeriesByAuthor(authorId, seriesId) {
  const result = await query(`${seriesSelectSql("where author_id = $1 and id = $2")} limit 1`, [authorId, seriesId]);
  return result.rows[0] ? serializeSeries(result.rows[0]) : null;
}

async function listEpisodesBySeries(seriesId) {
  const result = await query(`${episodeSelectSql("where series_id = $1")} order by number asc, created_at asc`, [seriesId]);
  return result.rows.map(serializeEpisode);
}

async function findEpisodeByAuthor(authorId, episodeId) {
  const result = await query(
    `${episodeSelectSql("join webtoon_series s on s.id = webtoon_episodes.series_id where s.author_id = $1 and webtoon_episodes.id = $2")} limit 1`,
    [authorId, episodeId]
  );
  return result.rows[0] ? serializeEpisode(result.rows[0]) : null;
}

async function listWorkspaceEpisodes(authorId, options = {}) {
  const params = [authorId];
  let predicate = "";

  if (options.episodeId) {
    params.push(options.episodeId);
    predicate = "and webtoon_episodes.id = $2";
  } else if (options.seriesId) {
    params.push(options.seriesId);
    predicate = "and webtoon_episodes.series_id = $2";
  } else {
    return [];
  }

  const result = await query(
    `${episodeSelectSql("join webtoon_series s on s.id = webtoon_episodes.series_id where s.author_id = $1 " + predicate)}
     order by webtoon_episodes.series_id asc, number asc, webtoon_episodes.created_at asc`,
    params
  );
  return result.rows.map(serializeEpisode);
}

async function listImagesByEpisode(episodeId) {
  const result = await query(
    `select id, episode_id as "episodeId", sort_order as "sortOrder", image_url as "imageUrl",
            alt_text as "altText", gap_after as "gapAfter", background_color as "backgroundColor",
            created_at as "createdAt", updated_at as "updatedAt"
     from episode_images
     where episode_id = $1
     order by sort_order asc, created_at asc`,
    [episodeId]
  );
  return result.rows.map(serializeEpisodeImage);
}

module.exports = {
  findCreatorProfile,
  listSeriesByAuthor,
  findSeriesByAuthor,
  listEpisodesBySeries,
  findEpisodeByAuthor,
  listWorkspaceEpisodes,
  listImagesByEpisode,
  seriesSelectSql,
  episodeSelectSql
};
