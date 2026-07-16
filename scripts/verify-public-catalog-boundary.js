const { buildPublicSnapshotReport, loadPublicCatalogForBuild } = require("../api/_lib/public-catalog-snapshot");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const { catalog, source, mode, mutationPerformed } = loadPublicCatalogForBuild();
  const report = buildPublicSnapshotReport(catalog);

  if (mutationPerformed) {
    fail("Public catalog boundary reported a mutation.");
  }

  if (!report.baselineComparison.matches) {
    fail("Public catalog snapshot does not match the published baseline.");
  }

  if (report.orphanPublishedEpisodes.length) {
    fail(`Public catalog has orphan published episodes: ${report.orphanPublishedEpisodes.join(", ")}`);
  }

  if (report.missingEpisodeRows.length) {
    fail(`Public catalog has missing episode rows: ${report.missingEpisodeRows.join(", ")}`);
  }

  console.log("Public catalog boundary verification");
  console.log(`Source: ${source}`);
  console.log(`Mode: ${mode}`);
  console.log(`Series: ${report.counts.series}`);
  console.log(`Episodes: ${report.counts.episodes}`);
  console.log(`Images: ${report.counts.images}`);
  console.log("Baseline match: yes");
  console.log("Mutation performed: no");
}

main();
