const fs = require("fs");
const path = require("path");
const { ROOT, loadCatalog } = require("./_catalog-loader");
const {
  buildPublicCatalogArtifact,
  buildPublicSnapshotReport,
  readStaticCatalogBaseline,
  writePublicCatalogArtifactFile
} = require("../api/_lib/public-catalog-snapshot");

function hasFlag(name) {
  return process.argv.includes(name);
}

function main() {
  if (!hasFlag("--dry-run")) {
    console.error("Refusing to run without --dry-run. This snapshot command remains dry-run only.");
    process.exit(1);
  }

  const catalog = loadCatalog();
  const baseline = readStaticCatalogBaseline();
  const report = buildPublicSnapshotReport(catalog, { baseline });
  const artifact = buildPublicCatalogArtifact(catalog, { baseline });
  const outputPath = path.join(ROOT, "reports", "public-catalog-snapshot-dry-run.json");
  const artifactPath = path.join(ROOT, "reports", "public-catalog-artifact-dry-run.json");
  const runtimeArtifactPath = path.join(ROOT, "public", "data", "catalog.generated.js");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log("Public catalog snapshot dry-run");
  console.log(`Series: ${report.counts.series}`);
  console.log(`Episodes: ${report.counts.episodes}`);
  console.log(`Images: ${report.counts.images}`);
  console.log(`Baseline match: ${report.baselineComparison.matches ? "yes" : "no"}`);
  console.log(`Artifact version: ${artifact.artifactVersion}`);
  console.log(`Artifact payload hash: ${artifact.payloadHash}`);
  console.log("Snapshot command mutation: not executed");
  console.log(`Wrote ${path.relative(ROOT, outputPath)}`);
  console.log(`Wrote ${path.relative(ROOT, artifactPath)}`);

  const hasFailure =
    !report.baselineComparison.matches ||
    report.orphanPublishedEpisodes.length ||
    report.missingEpisodeRows.length ||
    !artifact.invariants.publishedOnlySeries ||
    !artifact.invariants.publishedOnlyEpisodes ||
    !artifact.invariants.seriesEpisodeRefsResolve ||
    artifact.mutationPerformed;

  if (hasFailure) {
    process.exitCode = 1;
    return;
  }

  if (hasFlag("--write-artifact")) {
    const writeResult = writePublicCatalogArtifactFile(artifact, runtimeArtifactPath);
    console.log(`Wrote ${path.relative(ROOT, writeResult.outputPath)}`);
    console.log(`Artifact bytes: ${writeResult.bytes}`);
  }
}

main();
