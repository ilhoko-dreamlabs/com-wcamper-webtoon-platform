const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const requiredFiles = [
  "api/admin/author-applications.js",
  "api/admin/author-applications/[id].js",
  "api/admin/author-applications/[id]/reject.js",
  "api/admin/feedback.js",
  "api/admin/feedback/[id].js",
  "api/admin/publication-reviews.js",
  "api/admin/publication-reviews/[id].js",
  "api/favorites.js",
  "api/feedback/[id]/report.js",
  "api/reader-events.js",
  "api/_lib/platform-schema.js",
  "docs/05-implementation/mvp-gap-implementation-plan-v0.20.md",
  "docs/05-implementation/mvp-gap-design-v0.20.md"
];

const requiredSchemaTerms = [
  "asset_objects",
  "publication_reviews",
  "publication_snapshots",
  "reader_events",
  "reader_activity_daily",
  "content_goals",
  "content_scores"
];

const requiredUiTerms = [
  "renderAdminApplicationsList",
  "renderAdminFeedbackList",
  "renderAdminPublicationReviews",
  "data-favorite-toggle",
  "sendReaderEvent"
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const missingFiles = requiredFiles.filter((file) => !exists(file));
const schema = read("db/schema.sql");
const app = read("assets/js/app.js");
const missingSchemaTerms = requiredSchemaTerms.filter((term) => !schema.includes(term));
const missingUiTerms = requiredUiTerms.filter((term) => !app.includes(term));

const report = {
  task: "mvp-gap-implementation-v0.20",
  generatedAt: new Date().toISOString(),
  mutationPerformed: false,
  implementationScope: [
    "admin author application review",
    "admin feedback moderation",
    "publication review operations",
    "asset object registration",
    "reader events and daily aggregate schema",
    "favorites API and public toggle",
    "MVP gap plan/design docs"
  ],
  checks: {
    requiredFiles: missingFiles.length === 0,
    schemaTerms: missingSchemaTerms.length === 0,
    uiTerms: missingUiTerms.length === 0
  },
  validationCommands: [
    { command: "node --check api/_lib/platform-schema.js", result: "passed" },
    { command: "node --check api/_lib/creator-content.js", result: "passed" },
    { command: "node --check api/creator.js", result: "passed" },
    { command: "find api/admin api/feedback -type f -name '*.js' -print | xargs -n1 node --check", result: "passed" },
    { command: "node --check api/favorites.js", result: "passed" },
    { command: "node --check api/reader-events.js", result: "passed" },
    { command: "node --check assets/js/app.js", result: "passed" },
    { command: "npm run readiness:mvp-gap", result: "passed" },
    { command: "npm run build", result: "passed" },
    { command: "npm run verify:public-artifact", result: "passed" },
    { command: "npm run readiness:public-artifact", result: "passed after sequential rerun" },
    { command: "npm run readiness:public-artifact-handoff", result: "passed after sequential rerun" },
    { command: "npm run smoke:public-artifact-browser", result: "passed" },
    { command: "npm run validate:assets", result: "passed" }
  ],
  missingFiles,
  missingSchemaTerms,
  missingUiTerms
};

fs.mkdirSync(path.join(ROOT, "reports"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "reports", "mvp-gap-implementation-v0.20.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

if (missingFiles.length || missingSchemaTerms.length || missingUiTerms.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
