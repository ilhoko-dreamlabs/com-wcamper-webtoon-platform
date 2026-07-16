const path = require("path");
const { ROOT, loadCatalog } = require("./_catalog-loader");
const {
  buildPublicCatalogArtifact,
  readStaticCatalogBaseline,
  stableHash
} = require("../api/_lib/public-catalog-snapshot");
const { loadStaticCatalog } = require("../api/_lib/catalog-import-service");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const catalog = loadCatalog();
  const baseline = readStaticCatalogBaseline();
  const expectedArtifact = buildPublicCatalogArtifact(catalog, { baseline });
  const artifactPath = path.join(ROOT, "public", "data", "catalog.generated.js");
  const generatedCatalog = loadStaticCatalog(artifactPath);
  const generatedHash = stableHash(generatedCatalog);

  if (!expectedArtifact.baselineComparison.matches) {
    fail("Expected public catalog artifact does not match the published baseline.");
  }

  if (expectedArtifact.payloadHash !== generatedHash) {
    fail("Generated public catalog artifact hash does not match the expected payload hash.");
  }

  if (!expectedArtifact.invariants.publishedOnlySeries || !expectedArtifact.invariants.publishedOnlyEpisodes) {
    fail("Expected public catalog artifact is not published-only.");
  }

  console.log("Public catalog artifact verification");
  console.log(`Path: ${path.relative(ROOT, artifactPath)}`);
  console.log(`Artifact version: ${expectedArtifact.artifactVersion}`);
  console.log(`Payload hash: ${generatedHash}`);
  console.log(`Series: ${generatedCatalog.series.length}`);
  console.log(`Episodes: ${generatedCatalog.episodes.length}`);
  console.log("Baseline match: yes");
}

main();
