const fs = require("node:fs");
const path = require("node:path");
const { buildSnapshotPayload } = require("../api/_lib/publication-pipeline");

const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "reports", "publication-pipeline-readiness-v0.32.json");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const requiredFiles = [
  "api/_lib/publication-pipeline.js",
  "docs/05-implementation/publication-pipeline-plan-v0.32.md",
  "docs/06-operations/publication-pipeline-release-runbook-v0.32.md",
  "docs/06-operations/skill-candidates-v0.32.md"
];

const adminApi = read("api/admin-operations.js");
const pipeline = read("api/_lib/publication-pipeline.js");
const app = read("assets/js/app.js");
const creatorContent = read("api/_lib/creator-content.js");
const catalogImport = read("api/_lib/catalog-import-service.js");
const packageJson = JSON.parse(read("package.json"));

const sampleSnapshot = buildSnapshotPayload({
  authors: [
    {
      id: "author-1",
      handle: "author-one",
      displayName: "Author One",
      bio: "",
      iconUrl: "/assets/img/favicon.svg",
      status: "ACTIVE"
    }
  ],
  series: [
    {
      id: "series-1",
      authorId: "author-1",
      title: "Series One",
      summary: "Release candidate",
      tags: ["test"],
      coverUrl: "/assets/img/cover-bd-crew.svg",
      publicationStatus: "SCHEDULED"
    }
  ],
  episodes: [
    {
      id: "episode-1",
      seriesId: "series-1",
      number: 1,
      title: "Episode One",
      summary: "Release candidate episode",
      publishedAt: null,
      publicationStatus: "SCHEDULED"
    }
  ],
  images: [
    {
      id: "image-1",
      episodeId: "episode-1",
      sortOrder: 1,
      imageUrl: "/assets/img/panel-001.svg",
      altText: "Panel",
      backgroundColor: "#ffffff"
    }
  ]
}, "2026-07-24T00:00:00.000Z");

const requiredAdminTerms = [
  "publication-snapshots",
  "publication-releases",
  "smoke-pass",
  "promote",
  "rollback",
  "publication_snapshot.generate",
  "publication_release.promote",
  "publication_release.rollback"
];

const requiredPipelineTerms = [
  "readPublishedRows",
  "buildSnapshotPayload",
  "createPublicationSnapshot",
  "createPreviewRelease",
  "markReleaseSmokePassed",
  "promoteRelease",
  "rollbackProductionRelease",
  "static_artifacts",
  "publication_releases"
];

const requiredAppTerms = [
  "data-admin-snapshot-generate",
  "data-admin-snapshot-preview",
  "data-admin-release-smoke",
  "data-admin-release-promote",
  "data-admin-release-rollback",
  "/api/admin/publication-snapshots",
  "/api/admin/publication-releases"
];

const checks = {
  requiredFiles: requiredFiles.every(exists),
  adminPipelineRoutes: requiredAdminTerms.every((term) => adminApi.includes(term)),
  pipelineServiceContract: requiredPipelineTerms.every((term) => pipeline.includes(term)),
  adminUiControls: requiredAppTerms.every((term) => app.includes(term)),
  reviewPublishActionRemoved: !adminApi.includes("\"publish\"") && !app.includes('data-admin-review-action="publish"'),
  legacyAutoSeedOptIn: creatorContent.includes('WEBTOON_ENABLE_INITIAL_CATALOG_ATTACH === "true"'),
  explicitImportMaintainsSplitStatus: catalogImport.includes("draft_status = excluded.draft_status")
    && catalogImport.includes("publication_status = excluded.publication_status"),
  sampleSnapshotBuilds: sampleSnapshot.source === "database"
    && sampleSnapshot.counts.series === 1
    && sampleSnapshot.counts.episodes === 1
    && sampleSnapshot.counts.images === 1
    && sampleSnapshot.invariants.releaseCandidateSeries
    && sampleSnapshot.invariants.releaseCandidateEpisodes
    && sampleSnapshot.invariants.seriesEpisodeRefsResolve
    && sampleSnapshot.payload.series[0].episodes[0] === "episode-1",
  packageScript: packageJson.scripts
    && packageJson.scripts["readiness:publication-pipeline"] === "node scripts/verify-publication-pipeline-readiness.js"
};

const report = {
  task: "publication-pipeline-readiness-v0.32",
  generatedAt: new Date().toISOString(),
  mutationPerformed: false,
  checks,
  requiredFiles,
  endpointContract: [
    { method: "GET", path: "/api/admin/publication-snapshots" },
    { method: "POST", path: "/api/admin/publication-snapshots" },
    { method: "POST", path: "/api/admin/publication-snapshots/:id/preview" },
    { method: "GET", path: "/api/admin/publication-releases" },
    { method: "POST", path: "/api/admin/publication-releases/:id/smoke-pass" },
    { method: "POST", path: "/api/admin/publication-releases/:id/promote" },
    { method: "POST", path: "/api/admin/publication-releases/:id/rollback" }
  ],
  boundary: {
    approvalDoesNotPublish: checks.reviewPublishActionRemoved,
    productionPromotionRequiresReleaseEndpoint: checks.adminPipelineRoutes,
    catalogAutoSeedDefaultDisabled: checks.legacyAutoSeedOptIn
  },
  sampleSnapshot: {
    sourceHash: sampleSnapshot.sourceHash,
    counts: sampleSnapshot.counts,
    invariants: sampleSnapshot.invariants
  },
  missingFiles: requiredFiles.filter((file) => !exists(file)),
  missingAdminTerms: requiredAdminTerms.filter((term) => !adminApi.includes(term)),
  missingPipelineTerms: requiredPipelineTerms.filter((term) => !pipeline.includes(term)),
  missingAppTerms: requiredAppTerms.filter((term) => !app.includes(term))
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

if (Object.values(checks).some((passed) => !passed)) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
