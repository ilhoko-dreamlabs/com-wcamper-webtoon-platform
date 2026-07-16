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
const PUBLIC_ROOT = path.join(ROOT, "public");
const REPORT_PATH = path.join(ROOT, "reports", "public-catalog-generated-build.json");

function hasFlag(name) {
  return process.argv.includes(name);
}

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

function outputPathForRoute(routePath) {
  if (routePath === "/") return path.join(PUBLIC_ROOT, "index.html");
  if (routePath === "/404") return path.join(PUBLIC_ROOT, "404.html");
  return path.join(PUBLIC_ROOT, routePath, "index.html");
}

function assertGeneratedScriptReference(routePath) {
  const outputPath = outputPathForRoute(routePath);
  const html = fs.readFileSync(outputPath, "utf8");

  if (!html.includes(`src="${GENERATED_SCRIPT_PATH}"`)) {
    fail(`${path.relative(ROOT, outputPath)} does not reference ${GENERATED_SCRIPT_PATH}.`);
  }

  return path.relative(ROOT, outputPath);
}

function main() {
  if (!hasFlag("--generated-artifact-build")) {
    fail("Refusing to run without --generated-artifact-build. Use npm run build:public-artifact.");
  }

  run("node", ["scripts/generate-static-pages.js"], {
    env: {
      WCAMPER_CATALOG_SCRIPT_PATH: GENERATED_SCRIPT_PATH
    }
  });
  run("node", ["scripts/generate-public-catalog.js", "--dry-run", "--write-artifact"]);

  const generatedCatalog = loadStaticCatalog(GENERATED_ARTIFACT_PATH);
  const expectedArtifact = buildPublicCatalogArtifact(loadStaticCatalog(), {
    baseline: readStaticCatalogBaseline()
  });
  const generatedHash = stableHash(generatedCatalog);

  if (!expectedArtifact.baselineComparison.matches) {
    fail("Generated artifact does not match the published baseline.");
  }

  if (generatedHash !== expectedArtifact.payloadHash) {
    fail("Generated artifact payload hash does not match expected public artifact payload.");
  }

  const series = generatedCatalog.series[0];
  const author = series && generatedCatalog.authors.find((item) => item.id === series.authorId);
  const episode = series && generatedCatalog.episodes.find((item) => item.seriesId === series.id);

  if (!author || !series || !episode) {
    fail("Generated catalog does not include a representative author, series, and episode.");
  }

  const checkedRoutes = [
    "/",
    "/webtoons",
    `/@${author.id}/works/${series.id}`,
    `/@${author.id}/works/${series.id}/episodes/${episode.number}`
  ];
  const checkedHtml = checkedRoutes.map(assertGeneratedScriptReference);
  const report = {
    role: "public-catalog-generated-build",
    generatedAt: new Date().toISOString(),
    runtimeScript: GENERATED_SCRIPT_PATH,
    artifactPath: path.relative(ROOT, GENERATED_ARTIFACT_PATH),
    artifactVersion: expectedArtifact.artifactVersion,
    payloadHash: generatedHash,
    counts: {
      authors: generatedCatalog.authors.length,
      series: generatedCatalog.series.length,
      episodes: generatedCatalog.episodes.length,
      images: expectedArtifact.counts.images
    },
    baselineComparison: expectedArtifact.baselineComparison,
    checkedRoutes,
    checkedHtml,
    defaultBuildChanged: false,
    productionDeployment: false
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Public catalog generated build");
  console.log(`Runtime script: ${GENERATED_SCRIPT_PATH}`);
  console.log(`Generated artifact: ${path.relative(ROOT, GENERATED_ARTIFACT_PATH)}`);
  console.log(`Build report: ${path.relative(ROOT, REPORT_PATH)}`);
  console.log(`Payload hash: ${generatedHash}`);
  console.log(`Series: ${generatedCatalog.series.length}`);
  console.log(`Episodes: ${generatedCatalog.episodes.length}`);
  console.log(`Checked routes: ${checkedRoutes.join(", ")}`);
  console.log("Baseline match: yes");
}

main();
