# Public Catalog Default Runtime Release Handoff v0.16

Date: 2026-07-15
Status: Prepared locally; not deployed

## Summary

The local static reader default runtime now points to the generated public catalog artifact:

```text
Default runtime script: /data/catalog.generated.js
Generated artifact: public/data/catalog.generated.js
Legacy rollback script: /data/catalog.js
Rollback command: npm run build:legacy-catalog
```

This handoff package records the commands, reports, rollback method, and approval boundary required before any release action. It does not deploy, push, create a PR, run a DB migration, rotate secrets, or change production state.

## Changed Commands

| Command | Purpose |
|---|---|
| `npm run build` | Builds static pages with `/data/catalog.generated.js` and emits `public/data/catalog.generated.js` after artifact checks |
| `npm run build:legacy-catalog` | Rehearses local rollback by building pages with `/data/catalog.js` and removing generated artifact output |
| `npm run readiness:public-artifact-switch` | Verifies generated default build, legacy rollback build, and restored generated default build |
| `npm run readiness:public-artifact` | Compares legacy runtime output with current generated default output |
| `npm run readiness:public-artifact-handoff` | Verifies this handoff package, report inputs, approval boundary, and current generated build output |
| `npm run verify:public-artifact` | Verifies `public/data/catalog.generated.js` payload hash |
| `npm run smoke:public-artifact-runtime` | Verifies generated runtime HTML and generated artifact payload |
| `npm run smoke:public-artifact-browser` | Executes representative public reader routes against generated artifact runtime |
| `npm run validate:assets` | Checks catalog asset references |

## Report Inputs

| Report | Required state |
|---|---|
| `reports/public-catalog-release-readiness.json` | `passed: true`, default runtime `/data/catalog.generated.js`, generated-only file limited to `data/catalog.generated.js` |
| `reports/public-catalog-default-runtime-switch.json` | Generated default build, legacy rollback build, and restored default build all verified |
| `reports/public-catalog-release-handoff.json` | Written by `npm run readiness:public-artifact-handoff` after this handoff document and current build output are checked |

## Rollback

Rollback target:

```text
Return static reader HTML to /data/catalog.js and remove public/data/catalog.generated.js from the local public output.
```

Rollback method:

```bash
npm run build:legacy-catalog
```

Verification after rollback rehearsal:

```bash
grep -R 'src="/data/catalog.js"' public/index.html
test ! -f public/data/catalog.generated.js
```

Code rollback, if required, is to restore `scripts/generate-static-pages.js` so `DEFAULT_CATALOG_SCRIPT_PATH` is `/data/catalog.js` and default build no longer writes `public/data/catalog.generated.js`.

## Approval Boundary

No production deployment is included in this handoff. The following actions require separate approval:

| Action | Current state |
|---|---|
| Production deploy | Not performed |
| Remote push | Not performed |
| PR or merge request creation | Not performed |
| DB migration | Not performed |
| Secret or variable rotation | Not performed |
| Public URL, DNS, CDN, or cache purge change | Not performed |

## Release Owner Checklist

Before approving release, the owner should confirm:

| Check | Expected result |
|---|---|
| `npm run readiness:public-artifact-handoff` | Passed |
| `npm run readiness:public-artifact-switch` | Passed |
| `npm run smoke:public-artifact-browser` | Passed |
| `npm run validate:assets` | Passed |
| Secret scan review | No likely committed secret introduced by the release handoff |
| Rollback command rehearsed | `npm run build:legacy-catalog` restores `/data/catalog.js` locally |

## Residual Risks

- Deployment-specific cache behavior is not verified locally.
- Production route ownership, CDN headers, and hosting configuration still require release-owner review.
- The generated artifact remains derived from the static catalog baseline until the DB/API publication snapshot export is implemented.

## Next Step

The next implementation step is to prepare the GitHub push/PR package for this generated public catalog default runtime. Do not push, create a PR, deploy, run DB migrations, rotate secrets, or change DNS/CDN/public URLs without separate approval.
