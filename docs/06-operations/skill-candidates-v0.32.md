# Skill Candidates v0.32

Date: 2026-07-24
Status: Candidate notes only

## Purpose

Record workflow fragments from this task that are repeatable enough to consider for DreamLabs Skill Registry promotion later.

No registry files were changed in this project task.

## Candidates

| Candidate | Why it may become a skill | Evidence from this task | Suggested registry area |
|---|---|---|---|
| `publication-pipeline-readiness` | Repeatedly verifies review/snapshot/preview/promote/rollback boundaries without touching production | `scripts/verify-publication-pipeline-readiness.js` and report artifact | `skills/dreamlabs-specific/atomic` |
| `legacy-source-deprecation-check` | Detects hidden runtime side effects from legacy static sources and confirms explicit import paths | Auto catalog attach changed to opt-in and import script keeps split statuses | `skills/general/atomic` or `skills/dreamlabs-specific/atomic` |
| `webtoon-release-runbook-writer` | Produces operator handoff for webtoon snapshot/artifact release flows | `docs/06-operations/publication-pipeline-release-runbook-v0.32.md` | `skills/dreamlabs-specific/atomic` |
| `admin-release-api-boundary-review` | Checks that approval, preview, production promote, and rollback are different API actions | Admin API and UI publish action split | `skills/dreamlabs-specific/atomic` |

## Evidence Format To Use Later

```text
Evidence 1/3
- Date: 2026-07-24
- Task: Creator studio publication pipeline completion
- Repository or context: com-wcamper-webtoon-platform
- Skill used: <candidate name>
- Result: Local implementation and readiness report completed
- Verification: npm run readiness:publication-pipeline
- Notes: No secrets, remote push, deployment, or production migration performed
```

## Registry Promotion Boundary

These are not installed or registered skills yet. Promotion requires:

- checking for overlap with existing registry skills,
- adding a proper `SKILL.md` and `STATUS.md`,
- collecting at least three successful evidence entries,
- review through the registry workflow.
