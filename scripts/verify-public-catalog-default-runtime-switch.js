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

const LEGACY_SCRIPT_PATH = "/data/catalog.js";
const GENERATED_SCRIPT_PATH = "/data/catalog.generated.js";
const PUBLIC_INDEX_PATH = path.join(ROOT, "public", "index.html");
const GENERATED_ARTIFACT_PATH = path.join(ROOT, "public", "data", "catalog.generated.js");
const READINESS_REPORT_PATH = path.join(ROOT, "reports", "public-catalog-release-readiness.json");
const REPORT_PATH = path.join(ROOT, "reports", "public-catalog-default-runtime-switch.json");

function hasFlag(name) {
  return process.argv.includes(name);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }

  return result;
}

function assertRuntimeScript(expectedScriptPath, label) {
  const publicIndex = fs.readFileSync(PUBLIC_INDEX_PATH, "utf8");
  if (!publicIndex.includes(`src="${expectedScriptPath}"`)) {
    fail(`${label} does not reference ${expectedScriptPath}.`);
  }
}

function assertGeneratedArtifact(expectedExists, label) {
  const exists = fs.existsSync(GENERATED_ARTIFACT_PATH);
  if (exists !== expectedExists) {
    fail(`${label} generated artifact existence mismatch.`);
  }
}

function verifyGeneratedArtifact() {
  const generatedCatalog = loadStaticCatalog(GENERATED_ARTIFACT_PATH);
  const expectedArtifact = buildPublicCatalogArtifact(loadStaticCatalog(), {
    baseline: readStaticCatalogBaseline()
  });
  const generatedHash = stableHash(generatedCatalog);

  if (!expectedArtifact.baselineComparison.matches) {
    fail("Expected public catalog artifact does not match the published baseline.");
  }

  if (generatedHash !== expectedArtifact.payloadHash) {
    fail("Generated public catalog artifact hash does not match the expected payload hash.");
  }

  return {
    payloadHash: generatedHash,
    artifactVersion: expectedArtifact.artifactVersion,
    counts: {
      authors: generatedCatalog.authors.length,
      series: generatedCatalog.series.length,
      episodes: generatedCatalog.episodes.length,
      images: expectedArtifact.counts.images
    }
  };
}

function main() {
  if (!hasFlag("--default-runtime-switch")) {
    fail("Refusing to run without --default-runtime-switch. Use npm run readiness:public-artifact-switch.");
  }

  run("npm", ["run", "readiness:public-artifact"]);

  run("npm", ["run", "build"]);
  assertRuntimeScript(GENERATED_SCRIPT_PATH, "Default build");
  assertGeneratedArtifact(true, "Default build");
  const artifact = verifyGeneratedArtifact();

  run("npm", ["run", "build:legacy-catalog"]);
  assertRuntimeScript(LEGACY_SCRIPT_PATH, "Legacy rollback build");
  assertGeneratedArtifact(false, "Legacy rollback build");

  run("npm", ["run", "build"]);
  assertRuntimeScript(GENERATED_SCRIPT_PATH, "Restored default build");
  assertGeneratedArtifact(true, "Restored default build");

  const readiness = JSON.parse(fs.readFileSync(READINESS_REPORT_PATH, "utf8"));
  const report = {
    role: "public-catalog-default-runtime-switch",
    generatedAt: new Date().toISOString(),
    readinessReportPath: path.relative(ROOT, READINESS_REPORT_PATH),
    defaultRuntimeScript: GENERATED_SCRIPT_PATH,
    legacyRuntimeScript: LEGACY_SCRIPT_PATH,
    artifactPath: path.relative(ROOT, GENERATED_ARTIFACT_PATH),
    artifactVersion: artifact.artifactVersion,
    payloadHash: artifact.payloadHash,
    counts: artifact.counts,
    releaseReadinessPassed: readiness.passed,
    defaultBuildReferencesGeneratedScript: true,
    legacyRollbackBuildReferencesLegacyScript: true,
    restoredDefaultBuildReferencesGeneratedScript: true,
    defaultRuntimeReplacement: true,
    productionDeployment: false,
    remotePush: false,
    databaseMigration: false
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Public catalog default-runtime switch readiness");
  console.log(`Default runtime script: ${GENERATED_SCRIPT_PATH}`);
  console.log(`Legacy rollback script: ${LEGACY_SCRIPT_PATH}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
  console.log(`Payload hash: ${artifact.payloadHash}`);
  console.log(`Series: ${artifact.counts.series}`);
  console.log(`Episodes: ${artifact.counts.episodes}`);
  console.log("Rollback build: passed");
  console.log("Default runtime switch: passed");
}

main();
