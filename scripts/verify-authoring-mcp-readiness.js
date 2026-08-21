const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "reports", "authoring-mcp-readiness-v0.35.json");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const requiredFiles = [
  "docs/03-apis/authoring-mcp-contract-v0.34.md",
  "docs/05-implementation/authoring-mcp-integration-plan-v0.34.md",
  "docs/04-data/authoring-mcp-migration-v0.35.sql",
  "api/authoring-mcp.js",
  "api/_lib/authoring-mcp-service.js"
];

const contract = read("docs/03-apis/authoring-mcp-contract-v0.34.md");
const plan = read("docs/05-implementation/authoring-mcp-integration-plan-v0.34.md");
const docsIndex = read("docs/00-index.md");
const packageJson = JSON.parse(read("package.json"));
const service = read("api/_lib/authoring-mcp-service.js");
const adapter = read("api/authoring-mcp.js");
const platformSchema = read("api/_lib/platform-schema.js");
const dbSchema = read("db/schema.sql");
const migrationSql = read("docs/04-data/authoring-mcp-migration-v0.35.sql");
const vercelConfig = read("vercel.json");

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

const implementedTools = [
  "create_authoring_import",
  "get_authoring_import_status"
];

const deferredTools = [
  "register_authoring_asset",
  "upsert_series_draft",
  "upsert_episode_draft",
  "set_episode_panels",
  "submit_episode_for_review"
];

const requiredSchemaTerms = [
  "authoring_imports",
  "authoring_import_events",
  "authoring_idempotency_keys",
  "unique (worker_id, external_job_id)",
  "unique (worker_id, tool_name, idempotency_key)"
];

const checks = {
  requiredFiles: requiredFiles.every(exists),
  toolContract: requiredTools.every((tool) => contract.includes(tool)),
  productionBypassBlocked: forbiddenProductionBypassTerms.every((term) => !contract.includes(term) && !plan.includes(term)),
  requiredBoundaries: requiredBoundaryTerms.every((term) => contract.includes(term) || plan.includes(term)),
  implementationSequence: [
    "DB migration draft",
    "HTTP tool adapter",
    "Minimal service bridge",
    "Draft mutation bridge",
    "Auth hardening",
    "Integration smoke"
  ].every((term) => plan.includes(term)),
  docsIndex: [
    "docs/03-apis/authoring-mcp-contract-v0.34.md",
    "docs/05-implementation/authoring-mcp-integration-plan-v0.34.md"
  ].every((term) => docsIndex.includes(term)),
  packageScript: packageJson.scripts
    && packageJson.scripts["readiness:authoring-mcp"] === "node scripts/verify-authoring-mcp-readiness.js",
  routeAdapter: adapter.includes("invokeAuthoringTool")
    && adapter.includes("tools")
    && vercelConfig.includes("/api/authoring-mcp/:path*"),
  implementedToolBridge: implementedTools.every((tool) => service.includes(tool))
    && service.includes("WEBTOON_AUTHORING_MCP_TOKEN")
    && service.includes("idempotencyKey")
    && service.includes("AUTHORING_MCP_TOOL_NOT_IMPLEMENTED"),
  deferredToolsBlocked: deferredTools.every((tool) => service.includes(tool))
    && service.includes("501"),
  schemaTables: requiredSchemaTerms.every((term) => platformSchema.includes(term) && dbSchema.includes(term)),
  migrationDraft: requiredSchemaTerms.every((term) => migrationSql.includes(term)),
  productionBypassAbsentInCode: [
    "publication_snapshots",
    "publication_releases",
    "promote",
    "rollback"
  ].every((term) => !service.includes(`insert into ${term}`) && !service.includes(`update ${term}`))
};

const report = {
  task: "authoring-mcp-readiness-v0.35",
  generatedAt: new Date().toISOString(),
  mutationPerformed: false,
  checks,
  requiredFiles,
  requiredTools,
  implementedTools,
  deferredTools,
  missingFiles: requiredFiles.filter((file) => !exists(file)),
  missingTools: requiredTools.filter((tool) => !contract.includes(tool)),
  missingBoundaryTerms: requiredBoundaryTerms.filter((term) => !contract.includes(term) && !plan.includes(term)),
  forbiddenTermsFound: forbiddenProductionBypassTerms.filter((term) => contract.includes(term) || plan.includes(term)),
  missingSchemaTerms: requiredSchemaTerms.filter((term) => !platformSchema.includes(term) || !dbSchema.includes(term))
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

if (Object.values(checks).some((passed) => !passed)) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
