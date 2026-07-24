const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function listFiles(dir) {
  const absoluteDir = path.join(ROOT, dir);
  if (!fs.existsSync(absoluteDir)) return [];

  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(relative);
    return [relative];
  });
}

const requiredFiles = [
  "creator-studio/index.html",
  "creator-studio/dashboard/index.html",
  "creator-studio/works/index.html",
  "creator-studio/feedback/index.html",
  "creator-studio/settings/index.html",
  "docs/05-implementation/creator-studio-refactor-plan-v0.30.md",
  "docs/06-operations/creator-studio-release-handoff-v0.31.md",
  "docs/06-operations/creator-studio-db-migration-runbook-v0.31.md"
];

const api = read("api/creator.js");
const app = read("assets/js/app.js");
const schema = read("db/schema.sql");
const staticGenerator = read("scripts/generate-static-pages.js");
const vercel = read("vercel.json");
const packageJson = JSON.parse(read("package.json"));

const requiredApiTerms = [
  "handleDashboard",
  "handleCreatorFeedback",
  "creatorDashboard",
  "listCreatorFeedback",
  "\"dashboard\"",
  "\"feedback\""
];

const requiredAppTerms = [
  "/creator-studio/dashboard",
  "/creator-studio/works",
  "/creator-studio/feedback",
  "/creator-studio/settings",
  "/api/creator/dashboard",
  "/api/creator/feedback",
  "draftStatus",
  "publicationStatus",
  "creatorEditable",
  "creatorCombinedStatusLabel"
];

const requiredSchemaTerms = [
  "draft_status",
  "publication_status",
  "publication_reviews",
  "publication_snapshots",
  "static_artifacts",
  "publication_releases"
];

const requiredGeneratorTerms = [
  "[\"dashboard\", \"works\", \"feedback\", \"settings\"]",
  "/creator-studio",
  "`/creator-studio/${creatorSection}`"
];

const publicClientFiles = listFiles("public/assets")
  .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
  .concat(listFiles("assets").filter((file) => file.endsWith(".js") || file.endsWith(".css")));

const workspaceReferences = publicClientFiles
  .map((file) => [file, read(file)])
  .filter(([, content]) => content.includes("/api/creator/workspace"))
  .map(([file]) => file);

const missingFiles = requiredFiles.filter((file) => !exists(file));
const missingApiTerms = requiredApiTerms.filter((term) => !api.includes(term));
const missingAppTerms = requiredAppTerms.filter((term) => !app.includes(term));
const missingSchemaTerms = requiredSchemaTerms.filter((term) => !schema.includes(term));
const missingGeneratorTerms = requiredGeneratorTerms.filter((term) => !staticGenerator.includes(term));
const hasVercelRewrite = vercel.includes("\"source\": \"/creator-studio/:path*\"")
  && vercel.includes("\"destination\": \"/creator-studio\"");
const hasPackageScript = packageJson.scripts
  && packageJson.scripts["readiness:creator-studio"] === "node scripts/verify-creator-studio-readiness.js";

const report = {
  task: "creator-studio-readiness-v0.31",
  generatedAt: new Date().toISOString(),
  mutationPerformed: false,
  checks: {
    requiredFiles: missingFiles.length === 0,
    apiReadModels: missingApiTerms.length === 0,
    clientRoutesAndApis: missingAppTerms.length === 0,
    schemaTerms: missingSchemaTerms.length === 0,
    staticGeneratorRoutes: missingGeneratorTerms.length === 0,
    vercelNestedRouteRewrite: hasVercelRewrite,
    packageScript: hasPackageScript,
    workspaceDependencyRemovedFromClient: workspaceReferences.length === 0
  },
  expectedRouteBoundaries: [
    { route: "/creator-studio/dashboard", api: "/api/creator/dashboard" },
    { route: "/creator-studio/works", api: "/api/creator/series" },
    { route: "/creator-studio/works/:seriesId", api: "/api/creator/series/:id + /api/creator/series/:id/episodes" },
    { route: "/creator-studio/episodes/:episodeId", api: "/api/creator/episodes/:id + /api/creator/episodes/:id/images" },
    { route: "/creator-studio/feedback", api: "/api/creator/feedback" },
    { route: "/creator-studio/settings", api: "/api/creator/profile" }
  ],
  missingFiles,
  missingApiTerms,
  missingAppTerms,
  missingSchemaTerms,
  missingGeneratorTerms,
  workspaceReferences
};

fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "reports", "creator-studio-readiness-v0.31.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

const failed = Object.values(report.checks).some((passed) => !passed);
if (failed) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
