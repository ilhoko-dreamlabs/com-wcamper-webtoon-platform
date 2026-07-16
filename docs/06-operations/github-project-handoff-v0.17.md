# GitHub Project Handoff v0.17

Date: 2026-07-16
Status: Corrected locally; not pushed

## Summary

This repository's primary remote is GitHub:

```text
origin https://github.com/ilhoko-dreamlabs/com-wcamper-webtoon-platform.git
```

The local `gitlab-preview` remote is a 보조 preview remote. Its presence does not make this repository's operating handoff GitLab-first, and it does not require worker00 for the current GitHub upload path.

## Corrected Boundary

| Item | Correct state |
|---|---|
| Primary repository remote | GitHub `origin` |
| Secondary remote | `gitlab-preview`, local preview support only |
| Current upload path | GitHub push/PR after explicit owner approval |
| worker00 | worker00 is not required |
| GitLab MR handoff | Removed from current plan |
| GitLab CI candidate change | Removed from current plan; `.gitlab-ci.yml` restored to its previous deploy-only shape |

## Removed Wrong Handoff Work

The following GitLab/worker00-specific local artifacts were removed:

```text
scripts/verify-gitlab-ci-public-catalog-readiness.js
scripts/verify-gitlab-ci-mr-handoff.js
scripts/verify-public-catalog-worker00-request.js
docs/06-operations/public-catalog-gitlab-ci-readiness-v0.17.md
docs/06-operations/public-catalog-gitlab-mr-handoff-v0.18.md
docs/06-operations/public-catalog-worker00-request-v0.19.md
reports/public-catalog-gitlab-ci-readiness.json
reports/public-catalog-gitlab-mr-handoff.json
reports/public-catalog-worker00-request.json
```

`package.json` no longer exposes GitLab or worker00 readiness commands.

## Verification

Run:

```bash
npm run readiness:github-handoff
npm run readiness:public-artifact-handoff
npm run readiness:public-artifact-switch
npm run smoke:public-artifact-browser
npm run validate:assets
npm run build
```

The GitHub handoff verifier checks:

- `origin` points to the GitHub repository.
- `gitlab-preview` is treated only as a secondary preview remote.
- README documents the repository identity.
- GitLab/worker00 scripts, docs, and reports are absent.
- `.gitlab-ci.yml` does not contain the removed `catalog_readiness` candidate job.

## Approval Boundary

No remote push, pull request, deployment, DB migration, secret rotation, DNS/CDN change, or public URL change is included in this cleanup.

Do not request GitLab MR work for this GitHub upload task.

## Next Step

Prepare the GitHub push/PR package for the generated public catalog default runtime after owner approval. The package should include branch name, changed-file summary, validation results, rollback note, and PR title/body.
