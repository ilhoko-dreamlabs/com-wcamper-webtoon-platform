const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_catalog-loader");
const {
  buildPublicCatalogArtifact,
  readStaticCatalogBaseline,
  stableHash
} = require("../api/_lib/public-catalog-snapshot");
const { loadStaticCatalog } = require("../api/_lib/catalog-import-service");

const DEFAULT_SCRIPT_PATH = "/data/catalog.js";
const GENERATED_SCRIPT_PATH = "/data/catalog.generated.js";
const PUBLIC_ROOT = path.join(ROOT, "public");
const GENERATED_ARTIFACT_PATH = path.join(PUBLIC_ROOT, "data", "catalog.generated.js");
const REPORT_PATH = path.join(ROOT, "reports", "public-catalog-release-readiness.json");

function hasFlag(name) {
  return process.argv.includes(name);
}

function fail(message) {
  throw new Error(message);
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

function relativeFiles(root) {
  const results = [];

  function walk(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        return;
      }
      if (entry.isFile()) {
        results.push(path.relative(root, absolutePath).split(path.sep).join("/"));
      }
    });
  }

  walk(root);
  return results.sort();
}

function hashFile(filePath) {
  return stableHash(fs.readFileSync(filePath));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function normalizeGeneratedHtml(html) {
  return html.split(GENERATED_SCRIPT_PATH).join(DEFAULT_SCRIPT_PATH);
}

function compareHtml(defaultRoot, generatedRoot, files) {
  return files.map((relativePath) => {
    const defaultHtml = readText(path.join(defaultRoot, relativePath));
    const generatedHtml = readText(path.join(generatedRoot, relativePath));
    const normalizedGeneratedHtml = normalizeGeneratedHtml(generatedHtml);
    const matchesAfterRuntimeScriptNormalization = defaultHtml === normalizedGeneratedHtml;

    return {
      path: relativePath,
      defaultReferencesDefaultScript: defaultHtml.includes(`src="${DEFAULT_SCRIPT_PATH}"`),
      generatedReferencesGeneratedScript: generatedHtml.includes(`src="${GENERATED_SCRIPT_PATH}"`),
      matchesAfterRuntimeScriptNormalization
    };
  });
}

function compareSharedFiles(defaultRoot, generatedRoot, files) {
  return files.map((relativePath) => {
    const defaultHash = hashFile(path.join(defaultRoot, relativePath));
    const generatedHash = hashFile(path.join(generatedRoot, relativePath));

    return {
      path: relativePath,
      matches: defaultHash === generatedHash
    };
  });
}

function copyPublicOutput(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.cpSync(PUBLIC_ROOT, targetPath, { recursive: true });
}

function buildReport(defaultRoot, generatedRoot) {
  const defaultFiles = relativeFiles(defaultRoot);
  const generatedFiles = relativeFiles(generatedRoot);
  const defaultSet = new Set(defaultFiles);
  const generatedSet = new Set(generatedFiles);
  const defaultOnly = defaultFiles.filter((file) => !generatedSet.has(file));
  const generatedOnly = generatedFiles.filter((file) => !defaultSet.has(file));
  const shared = defaultFiles.filter((file) => generatedSet.has(file));
  const htmlFiles = shared.filter((file) => file.endsWith(".html"));
  const sharedNonHtmlFiles = shared.filter((file) => !file.endsWith(".html"));
  const htmlComparison = compareHtml(defaultRoot, generatedRoot, htmlFiles);
  const sharedFileComparison = compareSharedFiles(defaultRoot, generatedRoot, sharedNonHtmlFiles);
  const generatedCatalog = loadStaticCatalog(path.join(generatedRoot, "data", "catalog.generated.js"));
  const expectedArtifact = buildPublicCatalogArtifact(loadStaticCatalog(), {
    baseline: readStaticCatalogBaseline()
  });
  const generatedHash = stableHash(generatedCatalog);
  const allowedGeneratedOnly = ["data/catalog.generated.js"];
  const unexpectedGeneratedOnly = generatedOnly.filter((file) => !allowedGeneratedOnly.includes(file));
  const missingAllowedGeneratedOnly = allowedGeneratedOnly.filter((file) => !generatedOnly.includes(file));
  const failedHtml = htmlComparison.filter((item) =>
    !item.defaultReferencesDefaultScript ||
    !item.generatedReferencesGeneratedScript ||
    !item.matchesAfterRuntimeScriptNormalization
  );
  const failedSharedFiles = sharedFileComparison.filter((item) => !item.matches);
  const artifactHashMatches = generatedHash === expectedArtifact.payloadHash;
  const passed =
    defaultOnly.length === 0 &&
    unexpectedGeneratedOnly.length === 0 &&
    missingAllowedGeneratedOnly.length === 0 &&
    failedHtml.length === 0 &&
    failedSharedFiles.length === 0 &&
    expectedArtifact.baselineComparison.matches &&
    artifactHashMatches;

  return {
    role: "public-catalog-release-readiness",
    generatedAt: new Date().toISOString(),
    legacyRuntimeScript: DEFAULT_SCRIPT_PATH,
    defaultRuntimeScript: GENERATED_SCRIPT_PATH,
    generatedRuntimeScript: GENERATED_SCRIPT_PATH,
    artifactPath: path.relative(ROOT, GENERATED_ARTIFACT_PATH),
    artifactVersion: expectedArtifact.artifactVersion,
    payloadHash: generatedHash,
    counts: {
      defaultFiles: defaultFiles.length,
      generatedFiles: generatedFiles.length,
      htmlFiles: htmlFiles.length,
      sharedNonHtmlFiles: sharedNonHtmlFiles.length,
      generatedArtifactSeries: generatedCatalog.series.length,
      generatedArtifactEpisodes: generatedCatalog.episodes.length,
      generatedArtifactImages: expectedArtifact.counts.images
    },
    fileDiff: {
      defaultOnly,
      generatedOnly,
      allowedGeneratedOnly,
      unexpectedGeneratedOnly,
      missingAllowedGeneratedOnly
    },
    htmlComparison,
    sharedFileComparison,
    baselineComparison: expectedArtifact.baselineComparison,
    artifactHashMatches,
    passed,
    approvalBoundary: {
      defaultRuntimeReplacement: true,
      productionDeployment: false,
      remotePush: false,
      databaseMigration: false
    }
  };
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  if (!hasFlag("--release-readiness")) {
    console.error("Refusing to run without --release-readiness. Use npm run readiness:public-artifact.");
    process.exit(1);
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "wcamper-public-catalog-readiness-"));
  const defaultRoot = path.join(tempRoot, "default-public");
  const generatedRoot = path.join(tempRoot, "generated-public");
  let report;

  try {
    run("npm", ["run", "build:legacy-catalog"]);
    copyPublicOutput(defaultRoot);

    run("npm", ["run", "build"]);
    copyPublicOutput(generatedRoot);

    report = buildReport(defaultRoot, generatedRoot);
    writeReport(report);

    if (!report.passed) {
      fail("Generated artifact release-readiness comparison failed. See reports/public-catalog-release-readiness.json.");
    }

    console.log("Public catalog release-readiness comparison");
    console.log(`Legacy runtime script: ${DEFAULT_SCRIPT_PATH}`);
    console.log(`Default runtime script: ${GENERATED_SCRIPT_PATH}`);
    console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
    console.log(`Payload hash: ${report.payloadHash}`);
    console.log(`HTML files compared: ${report.counts.htmlFiles}`);
    console.log(`Shared non-HTML files compared: ${report.counts.sharedNonHtmlFiles}`);
    console.log(`Generated-only files: ${report.fileDiff.generatedOnly.join(", ")}`);
    console.log("Baseline match: yes");
    console.log("Release readiness: passed");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    try {
      run("npm", ["run", "build"]);
    } catch (error) {
      console.error(`Default build restore failed: ${error.message}`);
      process.exit(1);
    }
  }
}

main();
