# Authoring MCP Integration Plan v0.34

Date: 2026-08-21
Status: Design contract and readiness guard

## Goal

Introduce an MCP integration layer for external authoring workers while keeping
the existing publication safety boundary:

```text
external authoring worker
-> Authoring MCP tools
-> creator draft DB state
-> creator/admin review
-> publication snapshot
-> preview smoke
-> production promote
```

The goal is not to let workers publish directly. The goal is to let workers
submit reviewable draft content in a repeatable, auditable way.

## Registry References

```text
/workspace/dreamlabs-skill-registry/README.md
/workspace/dreamlabs-skill-registry/REGISTRY.md
/workspace/dreamlabs-skill-registry/docs/WORKER_USAGE_GUIDE.md
/workspace/dreamlabs-skill-registry/skills/general/atomic/repo-inspection/SKILL.md
/workspace/dreamlabs-skill-registry/skills/general/atomic/test-command-discovery/SKILL.md
/workspace/dreamlabs-skill-registry/skills/general/atomic/secret-scan-review/SKILL.md
```

## Responsibilities

| Component | Responsibility |
|---|---|
| Authoring MCP | Worker-facing draft import tools and status resources |
| Creator studio | Human author management, manual edits, feedback, and review request visibility |
| Admin console | Review approval, revision requests, release operations |
| Publication pipeline | Snapshot, artifact metadata, preview, smoke, promote, rollback |
| Public site | Static reader surface only |

## Non-Goals

| Non-goal | Reason |
|---|---|
| Direct production publication from MCP | Would bypass review and release controls |
| Browser cookie reuse by workers | Worker calls need explicit machine-oriented auth |
| Object storage implementation in this step | Storage provider and signing policy are external environment decisions |
| Production DB migration in this step | Connection target is not available in the worker environment |

## Data Model Additions For Later Implementation

The current step records the contract only. A later DB migration should add:

| Table | Purpose |
|---|---|
| `authoring_imports` | Import job envelope, worker identity, author binding, status |
| `authoring_import_events` | Append-only audit trail for MCP tool calls |
| `authoring_idempotency_keys` | Idempotent mutation result cache by worker/import/tool/key |

Recommended statuses:

```text
OPEN
DRAFT_READY
SUBMITTED_FOR_REVIEW
REVIEW_APPROVED
RELEASED
FAILED
CANCELLED
```

## Tool Set

The MCP contract is defined in:

```text
docs/03-apis/authoring-mcp-contract-v0.34.md
```

Required tools:

| Tool | Required boundary |
|---|---|
| `create_authoring_import` | Creates or reuses an import envelope |
| `register_authoring_asset` | Registers asset metadata without exposing secrets |
| `upsert_series_draft` | Mutates draft series only |
| `upsert_episode_draft` | Mutates draft episode only |
| `set_episode_panels` | Replaces episode panel composition |
| `submit_episode_for_review` | Creates normal review request |
| `get_authoring_import_status` | Read-only status resource |

## Implementation Sequence

| Step | Work | Completion criteria |
|---:|---|---|
| 1 | Contract documentation | Contract and plan are indexed |
| 2 | Readiness guard | `npm run readiness:authoring-mcp` verifies boundaries |
| 3 | DB migration draft | Add import/idempotency/audit tables |
| 4 | MCP transport | Expose tools through approved MCP server surface |
| 5 | Internal service bridge | Reuse creator services for drafts/assets/review request |
| 6 | Admin visibility | Admin and creator UI show import provenance |
| 7 | Auth hardening | Worker token or signed job token validation |
| 8 | Integration smoke | Sample external worker submits a draft and review request |

## Acceptance Criteria For This Step

| Check | Expected |
|---|---|
| Contract exists | `authoring-mcp-contract-v0.34.md` |
| Plan exists | `authoring-mcp-integration-plan-v0.34.md` |
| Docs index | Both documents are linked from `docs/00-index.md` |
| Package script | `readiness:authoring-mcp` is registered |
| Safety boundary | Readiness fails if the contract allows direct production release |
| Wiki sync | Runtime Knowledge Wiki records the durable MCP decision |

## External Boundary

This step does not create a production MCP server, issue worker tokens, write to
object storage, migrate staging or production DBs, promote a release, or deploy
new production infrastructure.
