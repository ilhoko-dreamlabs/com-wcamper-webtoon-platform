const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_catalog-loader");

const DOC_PATH = path.join(ROOT, "docs", "06-operations", "github-project-handoff-v0.17.md");
const REPORT_PATH = path.join(ROOT, "reports", "github-project-handoff.json");
const PACKAGE_PATH = path.join(ROOT, "package.json");
const README_PATH = path.join(ROOT, "README.md");
const GITLAB_CI_PATH = path.join(ROOT, ".gitlab-ci.yml");

const REQUIRED_DOC_SNIPPETS = [
  "GitHub Project Handoff v0.17",
  "origin",
  "https://github.com/ilhoko-dreamlabs/com-wcamper-webtoon-platform.git",
  "gitlab-preview",
  "보조 preview remote",
  "GitHub push/PR",
  "worker00 is not required",
  "Do not request GitLab MR work"
];

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

  return result.stdout.trim();
}

function assertIncludes(text, value, label) {
  if (!text.includes(value)) {
    fail(`${label} does not include ${value}.`);
  }
}

function assertNotIncludes(text, value, label) {
  if (text.includes(value)) {
    fail(`${label} still includes ${value}.`);
  }
}

function parseRemotes(output) {
  const remotes = {};
  output.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) return;
    const [, name, url, direction] = match;
    remotes[name] = remotes[name] || {};
    remotes[name][direction] = url;
  });
  return remotes;
}

function main() {
  if (!hasFlag("--github-handoff")) {
    fail("Refusing to run without --github-handoff. Use npm run readiness:github-handoff.");
  }

  const doc = fs.readFileSync(DOC_PATH, "utf8");
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
  const readme = fs.readFileSync(README_PATH, "utf8");
  const gitlabCi = fs.readFileSync(GITLAB_CI_PATH, "utf8");
  const remotes = parseRemotes(run("git", ["remote", "-v"]));

  REQUIRED_DOC_SNIPPETS.forEach((value) => assertIncludes(doc, value, "GitHub handoff document"));

  if (!remotes.origin || remotes.origin.fetch !== "https://github.com/ilhoko-dreamlabs/com-wcamper-webtoon-platform.git") {
    fail("origin remote is not the expected GitHub repository.");
  }

  if (!remotes["gitlab-preview"]) {
    fail("gitlab-preview remote is missing; document the local state before removing it.");
  }

  assertIncludes(readme, "Primary repository remote: GitHub", "README");
  assertIncludes(readme, "gitlab-preview", "README");

  ["readiness:gitlab-ci-public-catalog", "readiness:gitlab-ci-mr-handoff", "readiness:worker00-public-catalog"].forEach((scriptName) => {
    if (packageJson.scripts[scriptName]) {
      fail(`${scriptName} should not remain in package.json.`);
    }
  });

  ["catalog_readiness", "needs:"].forEach((value) => {
    assertNotIncludes(gitlabCi, value, ".gitlab-ci.yml");
  });

  const forbiddenPaths = [
    "scripts/verify-gitlab-ci-public-catalog-readiness.js",
    "scripts/verify-gitlab-ci-mr-handoff.js",
    "scripts/verify-public-catalog-worker00-request.js",
    "docs/06-operations/public-catalog-gitlab-ci-readiness-v0.17.md",
    "docs/06-operations/public-catalog-gitlab-mr-handoff-v0.18.md",
    "docs/06-operations/public-catalog-worker00-request-v0.19.md",
    "reports/public-catalog-gitlab-ci-readiness.json",
    "reports/public-catalog-gitlab-mr-handoff.json",
    "reports/public-catalog-worker00-request.json"
  ];

  const remainingForbiddenPaths = forbiddenPaths.filter((relativePath) => fs.existsSync(path.join(ROOT, relativePath)));
  if (remainingForbiddenPaths.length > 0) {
    fail(`GitLab/worker00 cleanup incomplete: ${remainingForbiddenPaths.join(", ")}`);
  }

  const report = {
    role: "github-project-handoff",
    generatedAt: new Date().toISOString(),
    docPath: path.relative(ROOT, DOC_PATH),
    originRemote: remotes.origin.fetch,
    gitlabPreviewRemotePresent: Boolean(remotes["gitlab-preview"]),
    githubIsPrimaryRemote: true,
    worker00Required: false,
    gitLabMrHandoffRemoved: true,
    gitLabCiCandidateRemoved: true,
    packageGitLabScriptsRemoved: true,
    remotePushPerformed: false,
    pullRequestCreated: false,
    deploymentPerformed: false,
    databaseMigration: false,
    secretRotation: false,
    nextAction: "Prepare a GitHub push/PR request after owner approval."
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log("GitHub project handoff readiness");
  console.log(`origin: ${report.originRemote}`);
  console.log(`gitlab-preview present: ${report.gitlabPreviewRemotePresent}`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
  console.log("worker00 required: no");
  console.log("GitHub handoff: passed");
}

main();
