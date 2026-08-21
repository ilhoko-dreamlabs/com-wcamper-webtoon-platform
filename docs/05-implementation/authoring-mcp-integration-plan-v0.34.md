# Authoring MCP Integration Plan v0.34

Date: 2026-08-21
Status: Minimal implementation started

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

## Data Model Additions

The v0.35 implementation adds the import envelope, event audit, and
idempotency cache tables locally:

| Table | Purpose |
|---|---|
| `authoring_imports` | Import job envelope, worker identity, author binding, status, draft pointers |
| `authoring_import_events` | Append-only audit trail for accepted MCP tool calls |
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
| 1 | Contract documentation | Complete |
| 2 | Readiness guard | Complete |
| 3 | DB migration draft | Complete for import/idempotency/audit tables |
| 4 | HTTP tool adapter | Complete for `/api/authoring-mcp/tools/:toolName` |
| 5 | Minimal service bridge | Complete for `create_authoring_import` and `get_authoring_import_status` |
| 6 | Draft mutation bridge | Pending for series, episode, panels, assets, review submission |
| 7 | Admin visibility | Pending; admin and creator UI should show import provenance |
| 8 | Auth hardening | Partial; bearer token exists, signed job token remains future hardening |
| 9 | Integration smoke | Pending; requires configured DB and worker token in staging/production |

## Implemented v0.35 API Surface

The platform now exposes a minimal HTTP adapter for worker tool calls:

```text
POST /api/authoring-mcp/tools/create_authoring_import
POST /api/authoring-mcp/tools/get_authoring_import_status
```

Authentication uses `Authorization: Bearer <WEBTOON_AUTHORING_MCP_TOKEN>`.
The worker id is taken from `X-Authoring-Worker-Id` or
`WEBTOON_AUTHORING_MCP_WORKER_ID`.

The first tool creates or reuses an import envelope bound to an active author.
The second tool reads status for imports owned by the calling worker id.

The remaining contracted tools return `501 AUTHORING_MCP_TOOL_NOT_IMPLEMENTED`
until their draft mutation behavior is implemented.

## Acceptance Criteria For This Step

| Check | Expected |
|---|---|
| Contract exists | `authoring-mcp-contract-v0.34.md` |
| Plan exists | `authoring-mcp-integration-plan-v0.34.md` |
| Docs index | Both documents are linked from `docs/00-index.md` |
| Package script | `readiness:authoring-mcp` is registered |
| Safety boundary | Readiness fails if the contract allows direct production release |
| Wiki sync | Runtime Knowledge Wiki records the durable MCP decision |
| Minimal adapter | `api/authoring-mcp.js` routes tool calls |
| Minimal service | `api/_lib/authoring-mcp-service.js` implements import create/status |

## External Boundary

This step does not issue worker tokens, write to object storage, run staging or
production DB migration, promote a release, or deploy new production
infrastructure.
