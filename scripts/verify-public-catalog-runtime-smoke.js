const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_catalog-loader");
const {
  buildPublicCatalogArtifact,
  readStaticCatalogBaseline,
  stableHash
} = require("../api/_lib/public-catalog-snapshot");
const { loadStaticCatalog } = require("../api/_lib/catalog-import-service");

const GENERATED_SCRIPT_PATH = "/data/catalog.generated.js";
const GENERATED_ARTIFACT_PATH = path.join(ROOT, "public", "data", "catalog.generated.js");
const PUBLIC_INDEX_PATH = path.join(ROOT, "public", "index.html");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...options.env },
    encoding: "utf8"
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }

  return result;
}

function main() {
  run("node", ["scripts/generate-public-catalog.js", "--dry-run", "--write-artifact"]);

  const generatedCatalog = loadStaticCatalog(GENERATED_ARTIFACT_PATH);
  const expectedArtifact = buildPublicCatalogArtifact(loadStaticCatalog(), {
    baseline: readStaticCatalogBaseline()
  });
  const generatedHash = stableHash(generatedCatalog);

  if (generatedHash !== expectedArtifact.payloadHash) {
    fail("Generated artifact payload hash does not match expected public artifact payload.");
  }

  if (!expectedArtifact.baselineComparison.matches) {
    fail("Generated artifact does not match the published baseline.");
  }

  run("node", ["scripts/generate-static-pages.js"], {
    env: {
      WCAMPER_CATALOG_SCRIPT_PATH: GENERATED_SCRIPT_PATH
    }
  });
  run("node", ["scripts/generate-public-catalog.js", "--dry-run", "--write-artifact"]);

  const publicIndex = fs.readFileSync(PUBLIC_INDEX_PATH, "utf8");
  if (!publicIndex.includes(`src="${GENERATED_SCRIPT_PATH}"`)) {
    fail(`public/index.html does not reference ${GENERATED_SCRIPT_PATH}.`);
  }

  const postBuildCatalog = loadStaticCatalog(GENERATED_ARTIFACT_PATH);
  const postBuildHash = stableHash(postBuildCatalog);

  if (postBuildHash !== expectedArtifact.payloadHash) {
    fail("Post-build generated artifact payload hash does not match expected public artifact payload.");
  }

  console.log("Public catalog generated runtime smoke");
  console.log(`Runtime script: ${GENERATED_SCRIPT_PATH}`);
  console.log(`Generated artifact: ${path.relative(ROOT, GENERATED_ARTIFACT_PATH)}`);
  console.log(`Payload hash: ${postBuildHash}`);
  console.log(`Series: ${postBuildCatalog.series.length}`);
  console.log(`Episodes: ${postBuildCatalog.episodes.length}`);
  console.log("Baseline match: yes");
}

main();
