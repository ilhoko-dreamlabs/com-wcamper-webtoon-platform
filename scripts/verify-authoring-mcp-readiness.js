const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "reports", "authoring-mcp-readiness-v0.34.json");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const requiredFiles = [
  "docs/03-apis/authoring-mcp-contract-v0.34.md",
  "docs/05-implementation/authoring-mcp-integration-plan-v0.34.md"
];

const contract = read("docs/03-apis/authoring-mcp-contract-v0.34.md");
const plan = read("docs/05-implementation/authoring-mcp-integration-plan-v0.34.md");
const docsIndex = read("docs/00-index.md");
const packageJson = JSON.parse(read("package.json"));

const requiredTools = [
  "create_authoring_import",
  "register_authoring_asset",
  "upsert_series_draft",
  "upsert_episode_draft",
  "set_episode_panels",
  "submit_episode_for_review",
  "get_authoring_import_status"
];

const forbiddenProductionBypassTerms = [
  "MCP may approve",
  "MCP can approve",
  "MCP may promote",
  "MCP can promote",
  "direct production publication from MCP | Allowed",
  "Approve review | Allowed",
  "Promote to production | Allowed",
  "Roll back production | Allowed"
];

const requiredBoundaryTerms = [
  "not a public publication API",
  "Approve review | Not allowed",
  "Generate publication snapshot | Not allowed",
  "Promote to production | Not allowed",
  "Roll back production | Not allowed",
  "idempotencyKey",
  "worker token or signed job token",
  "SUBMITTED_FOR_REVIEW",
  "REVIEW_REQUESTED",
  "publication_reviews",
  "publication_snapshots",
  "publication_releases"
];

const checks = {
  requiredFiles: requiredFiles.every(exists),
  toolContract: requiredTools.every((tool) => contract.includes(tool)),
  productionBypassBlocked: forbiddenProductionBypassTerms.every((term) => !contract.includes(term) && !plan.includes(term)),
  requiredBoundaries: requiredBoundaryTerms.every((term) => contract.includes(term) || plan.includes(term)),
  implementationSequence: [
    "DB migration draft",
    "MCP transport",
    "Internal service bridge",
    "Auth hardening",
    "Integration smoke"
  ].every((term) => plan.includes(term)),
  docsIndex: [
    "docs/03-apis/authoring-mcp-contract-v0.34.md",
    "docs/05-implementation/authoring-mcp-integration-plan-v0.34.md"
  ].every((term) => docsIndex.includes(term)),
  packageScript: packageJson.scripts
    && packageJson.scripts["readiness:authoring-mcp"] === "node scripts/verify-authoring-mcp-readiness.js"
};

const report = {
  task: "authoring-mcp-readiness-v0.34",
  generatedAt: new Date().toISOString(),
  mutationPerformed: false,
  checks,
  requiredFiles,
  requiredTools,
  missingFiles: requiredFiles.filter((file) => !exists(file)),
  missingTools: requiredTools.filter((tool) => !contract.includes(tool)),
  missingBoundaryTerms: requiredBoundaryTerms.filter((term) => !contract.includes(term) && !plan.includes(term)),
  forbiddenTermsFound: forbiddenProductionBypassTerms.filter((term) => contract.includes(term) || plan.includes(term))
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

if (Object.values(checks).some((passed) => !passed)) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
