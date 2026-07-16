const fs = require("fs");
const path = require("path");
const { ROOT, loadCatalog } = require("./_catalog-loader");

function isLocalAsset(value) {
  return typeof value === "string" && /^assets\//.test(value);
}

function collectRefs(data) {
  const refs = [];

  function add(ref, owner) {
    if (isLocalAsset(ref)) refs.push({ path: ref, owner });
  }

  data.series.forEach((series) => {
    add(series.cover, `series:${series.id}:cover`);
    add(series.thumbnail, `series:${series.id}:thumbnail`);
  });

  data.authors.forEach((author) => {
    add(author.image, `author:${author.id}:image`);
  });

  data.episodes.forEach((episode) => {
    add(episode.thumbnail, `episode:${episode.id}:thumbnail`);
    (episode.panels || []).forEach((panel, index) => {
      add(panel.image, `episode:${episode.id}:panel:${index + 1}`);
    });
  });

  return refs;
}

function main() {
  const data = loadCatalog();
  const refs = collectRefs(data);
  const missing = refs.filter((ref) => !fs.existsSync(path.join(ROOT, ref.path)));

  console.log(`Checked ${refs.length} catalog asset references`);

  if (missing.length > 0) {
    console.error(`Missing ${missing.length} asset references:`);
    missing.forEach((ref) => {
      console.error(`- ${ref.path} (${ref.owner})`);
    });
    process.exit(1);
  }

  console.log("All catalog asset references exist");
}

main();
