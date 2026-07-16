const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_catalog-loader");

const HANDOFF_PATH = path.join(ROOT, "docs", "06-operations", "public-catalog-default-runtime-release-handoff-v0.16.md");
const RELEASE_READINESS_REPORT_PATH = path.join(ROOT, "reports", "public-catalog-release-readiness.json");
const SWITCH_REPORT_PATH = path.join(ROOT, "reports", "public-catalog-default-runtime-switch.json");
const REPORT_PATH = path.join(ROOT, "reports", "public-catalog-release-handoff.json");
const PUBLIC_INDEX_PATH = path.join(ROOT, "public", "index.html");
const GENERATED_ARTIFACT_PATH = path.join(ROOT, "public", "data", "catalog.generated.js");
const GENERATED_SCRIPT_PATH = "/data/catalog.generated.js";
const LEGACY_SCRIPT_PATH = "/data/catalog.js";

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

function assertReportBoundary(report, label) {
  if (report.productionDeployment !== false) {
    fail(`${label} must record productionDeployment: false.`);
  }
  if (report.remotePush !== false) {
    fail(`${label} must record remotePush: false.`);
  }
  if (report.databaseMigration !== false) {
    fail(`${label} must record databaseMigration: false.`);
  }
}

function main() {
  if (!hasFlag("--release-handoff")) {
    fail("Refusing to run without --release-handoff. Use npm run readiness:public-artifact-handoff.");
  }

  const handoff = fs.readFileSync(HANDOFF_PATH, "utf8");
  const releaseReadiness = readJson(RELEASE_READINESS_REPORT_PATH);
  const switchReadiness = readJson(SWITCH_REPORT_PATH);

  [
    "Public Catalog Default Runtime Release Handoff v0.16",
    "npm run build",
    "npm run build:legacy-catalog",
    "npm run readiness:public-artifact-switch",
    "npm run readiness:public-artifact",
    "npm run verify:public-artifact",
    "npm run smoke:public-artifact-browser",
    "reports/public-catalog-release-readiness.json",
    "reports/public-catalog-default-runtime-switch.json",
    "Rollback",
    "Approval Boundary",
    "No production deployment",
    GENERATED_SCRIPT_PATH,
    LEGACY_SCRIPT_PATH
  ].forEach((value) => assertIncludes(handoff, value, "Release handoff document"));

  if (!releaseReadiness.passed) {
    fail("Release-readiness report is not passing.");
  }

  if (releaseReadiness.defaultRuntimeScript !== GENERATED_SCRIPT_PATH) {
    fail("Release-readiness report does not reflect generated default runtime.");
  }

  if (!releaseReadiness.fileDiff || releaseReadiness.fileDiff.unexpectedGeneratedOnly.length !== 0) {
    fail("Release-readiness report contains unexpected generated-only files.");
  }

  if (!releaseReadiness.fileDiff.generatedOnly.includes("data/catalog.generated.js")) {
    fail("Release-readiness report does not list the generated artifact.");
  }

  if (switchReadiness.defaultRuntimeScript !== GENERATED_SCRIPT_PATH) {
    fail("Switch report does not reflect generated default runtime.");
  }

  if (switchReadiness.legacyRuntimeScript !== LEGACY_SCRIPT_PATH) {
    fail("Switch report does not record the legacy rollback runtime.");
  }

  assertReportBoundary(switchReadiness, "Switch report");

  run("npm", ["run", "build"]);

  const publicIndex = fs.readFileSync(PUBLIC_INDEX_PATH, "utf8");
  if (!publicIndex.includes(`src="${GENERATED_SCRIPT_PATH}"`)) {
    fail("Default build does not reference the generated runtime script.");
  }

  if (!fs.existsSync(GENERATED_ARTIFACT_PATH)) {
    fail("Default build did not emit public/data/catalog.generated.js.");
  }

  const report = {
    role: "public-catalog-release-handoff",
    generatedAt: new Date().toISOString(),
    handoffPath: path.relative(ROOT, HANDOFF_PATH),
    releaseReadinessReportPath: path.relative(ROOT, RELEASE_READINESS_REPORT_PATH),
    switchReportPath: path.relative(ROOT, SWITCH_REPORT_PATH),
    defaultRuntimeScript: GENERATED_SCRIPT_PATH,
    legacyRuntimeScript: LEGACY_SCRIPT_PATH,
    rollbackCommand: "npm run build:legacy-catalog",
    payloadHash: switchReadiness.payloadHash,
    counts: switchReadiness.counts,
    releaseReadinessPassed: releaseReadiness.passed,
    defaultBuildReferencesGeneratedScript: true,
    generatedArtifactExistsAfterDefaultBuild: true,
    handoffIncludesApprovalBoundary: handoff.includes("Approval Boundary"),
    handoffIncludesRollback: handoff.includes("Rollback"),
    productionDeployment: false,
    remotePush: false,
    databaseMigration: false,
    secretRotation: false
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Public catalog release handoff readiness");
  console.log(`Handoff: ${path.relative(ROOT, HANDOFF_PATH)}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
  console.log(`Default runtime script: ${GENERATED_SCRIPT_PATH}`);
  console.log(`Rollback command: ${report.rollbackCommand}`);
  console.log(`Payload hash: ${report.payloadHash}`);
  console.log("Release handoff: passed");
}

main();
