# Creator Studio Release Handoff v0.31

Date: 2026-07-24
Status: Local release package prepared

## Summary

This handoff packages the creator studio route/API split, additive publication schema, and local readiness checks for staging deployment review. Remote push, pull request creation, production deployment, and production DB migration are outside this local handoff.

## Change Set

| Area | Change |
|---|---|
| Creator navigation | `/creator-studio/dashboard`, `/works`, `/works/:id`, `/episodes/:id`, `/feedback`, `/settings` |
| Creator API | dashboard and feedback read models added; existing series/episode endpoints reused |
| Client loading | new creator UI path no longer depends on `/api/creator/workspace` |
| Schema | `draft_status`, `publication_status`, `static_artifacts`, `publication_releases` added |
| Admin review | review decisions update separated draft/publication states |
| Static routing | nested creator routes are generated and rewritten to the SPA entry |
| Verification | `readiness:creator-studio` added for repeatable local regression checks |

## Validation Commands

Run these before staging deployment:

```bash
npm run readiness:creator-studio
npm run build
npm run verify:public-catalog
npm run verify:public-artifact
npm run validate:assets
npm run smoke:public-artifact-runtime
npm run smoke:public-artifact-browser
npm run readiness:public-artifact
```

Optional syntax sweep:

```bash
find api scripts assets -type f -name '*.js' -not -path './node_modules/*' -print | xargs -n1 node --check
```

## Staging Acceptance

| Check | Expected |
|---|---|
| `/creator-studio/dashboard` direct URL | renders without 404 |
| `/creator-studio/works` direct URL | renders without 404 |
| `/creator-studio/works/:seriesId` direct URL | fetches only selected work and episodes |
| `/creator-studio/episodes/:episodeId` direct URL | fetches selected episode and images |
| `/creator-studio/feedback` direct URL | uses `/api/creator/feedback` |
| `/creator-studio/settings` direct URL | uses `/api/creator/profile` |
| workspace dependency | no client request to `/api/creator/workspace` during normal navigation |
| review request | appends review row and keeps publication state unpublished |
| admin approval | updates draft/publication fields according to decision |

## Rollback Note

The release can be rolled back by redeploying the previous application build. The DB migration is additive and can remain in place during application rollback.

| Item | Decision |
|---|---|
| Destructive DB rollback | not recommended by default |
| Audit/review rows | preserve |
| Generated public artifacts | verify with existing public artifact smoke commands after rollback |
| Nested route rewrite | restored by previous deployment if app rollback includes `vercel.json` |

## Remaining Work After Release

| Work | Status |
|---|---|
| Staging migration rehearsal | pending external environment |
| Staging performance measurement | pending external environment |
| Production change request | pending owner approval and staging evidence |
| Snapshot preview/promote/rollback API | complete locally; see `publication-pipeline-release-runbook-v0.32.md` |
| `data/catalog.js` automatic seed removal | complete locally as default-disabled opt-in; explicit import remains available |
