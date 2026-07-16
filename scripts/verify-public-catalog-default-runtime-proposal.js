const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_catalog-loader");

const PROPOSAL_PATH = path.join(ROOT, "docs", "04-data", "public-catalog-default-runtime-proposal-v0.14.md");
const READINESS_REPORT_PATH = path.join(ROOT, "reports", "public-catalog-release-readiness.json");
const REPORT_PATH = path.join(ROOT, "reports", "public-catalog-default-runtime-proposal-readiness.json");
const PUBLIC_INDEX_PATH = path.join(ROOT, "public", "index.html");
const GENERATED_ARTIFACT_PATH = path.join(ROOT, "public", "data", "catalog.generated.js");
const DEFAULT_SCRIPT_PATH = "/data/catalog.js";
const GENERATED_SCRIPT_PATH = "/data/catalog.generated.js";

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertIncludes(text, value, label) {
  if (!text.includes(value)) {
    fail(`${label} does not include ${value}.`);
  }
}

function main() {
  if (!hasFlag("--proposal-readiness")) {
    fail("Refusing to run without --proposal-readiness. Use npm run readiness:public-artifact-proposal.");
  }

  const proposal = fs.readFileSync(PROPOSAL_PATH, "utf8");
  const readiness = readJson(READINESS_REPORT_PATH);

  [
    DEFAULT_SCRIPT_PATH,
    GENERATED_SCRIPT_PATH,
    "Rollback Checklist",
    "No default runtime replacement in v0.14",
    "npm run readiness:public-artifact"
  ].forEach((value) => assertIncludes(proposal, value, "Proposal document"));

  if (!readiness.passed) {
    fail("Release-readiness report is not passing.");
  }

  const defaultRuntimeReplacementObserved = readiness.defaultRuntimeScript === GENERATED_SCRIPT_PATH;

  if (readiness.defaultRuntimeScript !== DEFAULT_SCRIPT_PATH && !defaultRuntimeReplacementObserved) {
    fail("Readiness report default runtime script changed unexpectedly.");
  }

  if (readiness.generatedRuntimeScript !== GENERATED_SCRIPT_PATH) {
    fail("Readiness report generated runtime script changed unexpectedly.");
  }

  const unexpectedGeneratedOnly = readiness.fileDiff && readiness.fileDiff.unexpectedGeneratedOnly;
  if (!Array.isArray(unexpectedGeneratedOnly) || unexpectedGeneratedOnly.length !== 0) {
    fail("Readiness report contains unexpected generated-only files.");
  }

  const generatedOnly = readiness.fileDiff && readiness.fileDiff.generatedOnly;
  if (!Array.isArray(generatedOnly) || generatedOnly.length !== 1 || generatedOnly[0] !== "data/catalog.generated.js") {
    fail("Readiness report does not contain exactly the expected generated-only artifact.");
  }

  if (readiness.counts.htmlFiles !== 30 || readiness.counts.sharedNonHtmlFiles !== 81) {
    fail("Readiness report comparison counts changed unexpectedly.");
  }

  if (
    readiness.counts.generatedArtifactSeries !== 2 ||
    readiness.counts.generatedArtifactEpisodes !== 16 ||
    readiness.counts.generatedArtifactImages !== 17
  ) {
    fail("Readiness report generated artifact counts changed unexpectedly.");
  }

  if (!readiness.approvalBoundary || typeof readiness.approvalBoundary.defaultRuntimeReplacement !== "boolean") {
    fail("Readiness report must state the default runtime replacement boundary.");
  }

  run("npm", ["run", "build"]);

  const publicIndex = fs.readFileSync(PUBLIC_INDEX_PATH, "utf8");
  const defaultBuildReferencesDefaultScript = publicIndex.includes(`src="${DEFAULT_SCRIPT_PATH}"`);
  const defaultBuildReferencesGeneratedScript = publicIndex.includes(`src="${GENERATED_SCRIPT_PATH}"`);
  const generatedArtifactExistsAfterDefaultBuild = fs.existsSync(GENERATED_ARTIFACT_PATH);

  if (defaultRuntimeReplacementObserved) {
    if (!defaultBuildReferencesGeneratedScript || !generatedArtifactExistsAfterDefaultBuild) {
      fail("Default build does not reflect the v0.15 generated runtime switch.");
    }
  } else {
    if (!defaultBuildReferencesDefaultScript || defaultBuildReferencesGeneratedScript) {
      fail("Default build output does not remain on /data/catalog.js.");
    }

    if (generatedArtifactExistsAfterDefaultBuild) {
      fail("Default build unexpectedly emitted public/data/catalog.generated.js.");
    }
  }

  const report = {
    role: "public-catalog-default-runtime-proposal-readiness",
    generatedAt: new Date().toISOString(),
    proposalPath: path.relative(ROOT, PROPOSAL_PATH),
    readinessReportPath: path.relative(ROOT, READINESS_REPORT_PATH),
    defaultRuntimeScript: DEFAULT_SCRIPT_PATH,
    proposedRuntimeScript: GENERATED_SCRIPT_PATH,
    observedDefaultRuntimeScript: readiness.defaultRuntimeScript,
    readinessPayloadHash: readiness.payloadHash,
    counts: {
      htmlFiles: readiness.counts.htmlFiles,
      sharedNonHtmlFiles: readiness.counts.sharedNonHtmlFiles,
      generatedArtifactSeries: readiness.counts.generatedArtifactSeries,
      generatedArtifactEpisodes: readiness.counts.generatedArtifactEpisodes,
      generatedArtifactImages: readiness.counts.generatedArtifactImages
    },
    proposalIncludesRollbackChecklist: proposal.includes("Rollback Checklist"),
    readinessPassed: readiness.passed,
    defaultBuildReferencesDefaultScript,
    defaultBuildReferencesGeneratedScript,
    generatedArtifactExistsAfterDefaultBuild,
    defaultRuntimeReplacement: defaultRuntimeReplacementObserved,
    productionDeployment: false,
    remotePush: false,
    databaseMigration: false
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Public catalog default-runtime proposal readiness");
  console.log(`Proposal: ${path.relative(ROOT, PROPOSAL_PATH)}`);
  console.log(`Readiness report: ${path.relative(ROOT, READINESS_REPORT_PATH)}`);
  console.log(`Proposal report: ${path.relative(ROOT, REPORT_PATH)}`);
  console.log(`Payload hash: ${readiness.payloadHash}`);
  console.log(`HTML files compared: ${readiness.counts.htmlFiles}`);
  console.log(`Shared non-HTML files compared: ${readiness.counts.sharedNonHtmlFiles}`);
  console.log(`Default runtime replacement: ${defaultRuntimeReplacementObserved ? "observed in v0.15" : "not performed"}`);
  console.log("Proposal readiness: passed");
}

main();
