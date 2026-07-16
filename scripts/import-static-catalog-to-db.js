const fs = require("fs");
const path = require("path");
const { ROOT, loadCatalog } = require("./_catalog-loader");
const { buildStaticCatalogImportPlan } = require("../api/_lib/catalog-import-service");

function hasFlag(name) {
  return process.argv.includes(name);
}

function readBaseline() {
  const baselinePath = path.join(ROOT, "reports", "static-catalog-baseline.json");
  if (!fs.existsSync(baselinePath)) return null;
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

function issueCount(groups) {
  return Object.values(groups).reduce((total, items) => total + items.length, 0);
}

function main() {
  if (!hasFlag("--dry-run")) {
    console.error("Refusing to run without --dry-run. Apply mode is not implemented or approved.");
    process.exit(1);
  }

  const catalog = loadCatalog();
  const plan = buildStaticCatalogImportPlan(catalog, { baseline: readBaseline() });
  const outputPath = path.join(ROOT, "reports", "static-catalog-import-dry-run.json");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`);

  console.log("Static catalog import dry-run");
  console.log(`Authors planned: ${plan.counts.authors}`);
  console.log(`Series planned: ${plan.counts.series} (${plan.counts.publishedSeries} published, ${plan.counts.unpublishedSeries} unpublished)`);
  console.log(`Episodes planned: ${plan.counts.episodes} (${plan.counts.publishedEpisodes} published, ${plan.counts.unpublishedEpisodes} unpublished)`);
  console.log(`Images planned: ${plan.counts.images}`);
  console.log(`Duplicate id conflicts: ${issueCount(plan.duplicateIds)}`);
  console.log(`Required field issues: ${issueCount(plan.requiredFieldIssues)}`);
  console.log(`Baseline mismatches: ${plan.baselineMismatches.length}`);
  console.log("Apply mode: not executed");
  console.log(`Wrote ${path.relative(ROOT, outputPath)}`);

  if (issueCount(plan.duplicateIds) || issueCount(plan.requiredFieldIssues) || plan.baselineMismatches.length) {
    process.exitCode = 1;
  }
}

main();
