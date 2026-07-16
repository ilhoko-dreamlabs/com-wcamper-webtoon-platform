const DEFAULT_AUTHOR_ICON = "/assets/img/authors/bongdal-universe-comics-logo.png";

function serializeSeries(row) {
  return {
    id: row.id,
    authorId: row.authorId,
    title: row.title,
    summary: row.summary,
    genre: row.genre,
    tags: row.tags || [],
    coverUrl: row.coverUrl,
    status: row.status,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function serializeAuthorProfile(row) {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    bio: row.bio || "",
    handle: row.handle || row.id,
    iconUrl: row.iconUrl || DEFAULT_AUTHOR_ICON,
    publicPageEnabled: row.publicPageEnabled !== false,
    status: row.status,
    approvedAt: row.approvedAt,
    updatedAt: row.updatedAt
  };
}

function serializeEpisode(row) {
  return {
    id: row.id,
    seriesId: row.seriesId,
    number: row.number,
    title: row.title,
    summary: row.summary,
    draftBody: row.draftBody,
    contentUrl: row.contentUrl,
    status: row.status,
    reviewNote: row.reviewNote,
    scheduledAt: row.scheduledAt,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function serializeEpisodeImage(row) {
  return {
    id: row.id,
    episodeId: row.episodeId,
    sortOrder: row.sortOrder,
    imageUrl: row.imageUrl,
    altText: row.altText || "",
    gapAfter: row.gapAfter || 0,
    backgroundColor: row.backgroundColor || "#ffffff",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function groupEpisodesBySeries(episodes) {
  return episodes.reduce((grouped, episode) => {
    if (!grouped[episode.seriesId]) grouped[episode.seriesId] = [];
    grouped[episode.seriesId].push(episode);
    return grouped;
  }, {});
}

module.exports = {
  DEFAULT_AUTHOR_ICON,
  serializeSeries,
  serializeAuthorProfile,
  serializeEpisode,
  serializeEpisodeImage,
  groupEpisodesBySeries
};
