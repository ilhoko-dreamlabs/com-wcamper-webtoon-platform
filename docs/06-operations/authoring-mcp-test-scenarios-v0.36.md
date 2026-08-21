# Authoring MCP Test Scenarios v0.36

Date: 2026-08-21

## Scope

These scenarios cover the current minimal Authoring MCP adapter:

- `POST /api/authoring-mcp/tools/create_authoring_import`
- `POST /api/authoring-mcp/tools/get_authoring_import_status`

The public URL contract is served through the existing creator serverless
function to stay within the Vercel Node function limit. The MCP adapter must
not approve reviews, create publication snapshots, promote production releases,
or roll back production releases.

## Scenario Matrix

| ID | Scenario | Preconditions | Request | Expected result |
|---|---|---|---|---|
| S0 | Production route smoke | Production deployment is READY | `POST /api/authoring-mcp/tools/create_authoring_import` without worker token | Not `404`; returns configured auth boundary |
| S1 | MCP env missing | `WEBTOON_AUTHORING_MCP_TOKEN` is not configured | Any Authoring MCP tool call | `503 AUTHORING_MCP_NOT_CONFIGURED` |
| S2 | Missing bearer token | MCP token is configured | Tool call without `Authorization` | `401 AUTHORING_MCP_AUTH_REQUIRED` |
| S3 | Invalid bearer token | MCP token is configured | Tool call with wrong bearer token | `401 AUTHORING_MCP_AUTH_REQUIRED` |
| S4 | Store missing | MCP token is configured, DB env is missing | `create_authoring_import` with valid token | `503 DB_NOT_CONFIGURED` |
| S5 | Create import happy path | MCP token, DB schema, and active author exist | `create_authoring_import` with `idempotencyKey`, `externalJobId`, `authorRef` | `200`, `OPEN` import, event row, idempotency row |
| S6 | Idempotent replay | S5 has run once | Same `create_authoring_import` request | Same import response with `idempotentReplay: true` |
| S7 | Status lookup | Import exists for same worker id | `get_authoring_import_status` with `importId` | `200` with import, draft, review, release pointers |
| S8 | Cross-worker isolation | Import exists for worker A | Worker B requests same `importId` | `404 AUTHORING_IMPORT_NOT_FOUND` |
| S9 | Deferred tool guard | MCP token is configured | `set_episode_panels` or another deferred tool | `501 AUTHORING_MCP_TOOL_NOT_IMPLEMENTED` |
| S10 | Unknown tool guard | MCP token is configured | `/tools/not_a_tool` | `404 AUTHORING_MCP_TOOL_NOT_FOUND` |
| S11 | Production bypass guard | Any environment | MCP attempts approve/promote/rollback behavior | No supported tool or service path exists |
| S12 | Publication pipeline separation | Review/publish data exists | MCP status lookup after admin release | Read-only release pointers only; no mutation |

## Current Production Smoke Result

Latest direct activation attempt:

```text
date 2026-08-21
result blocked
reason Vercel CLI is available but the current worker is logged out; production
       WEBTOON_AUTHORING_MCP_TOKEN value is not available in this environment
```

Observed production route smoke:

| Route | Result |
|---|---|
| `/` | `200` |
| `/creator-studio/dashboard` | `200` |
| `/data/catalog.generated.js` | `200` |
| `/api/authoring-mcp/tools/create_authoring_import` | `503 AUTHORING_MCP_NOT_CONFIGURED` |
| `/api/authoring-mcp/tools/get_authoring_import_status` | `503 AUTHORING_MCP_NOT_CONFIGURED` |

Previous deployment smoke:

Deployment:

```text
dpl_AQF6i83yaUv8YpF64xvSBXzWVoAw
commit a66c21ea4ec30db268226e32310cf39a0164f146
state READY
lambdaRuntimeStats {"nodejs":12}
```

Observed production route smoke:

| Route | Result |
|---|---|
| `/` | `200` |
| `/creator-studio/dashboard` | `200` |
| `/creator-studio/works` | `200` |
| `/creator-studio/feedback` | `200` |
| `/creator-studio/settings` | `200` |
| `/data/catalog.generated.js` | `200` |
| `/api/creator/dashboard` | `401 AUTH_REQUIRED` |
| `/api/admin/publication-snapshots` | `401 ADMIN_AUTH_REQUIRED` |
| `/api/authoring-mcp/tools/create_authoring_import` | `503 AUTHORING_MCP_NOT_CONFIGURED` |
| `/api/authoring-mcp/tools/set_episode_panels` | `503 AUTHORING_MCP_NOT_CONFIGURED` |

The two `503` entries are expected until the worker token and DB environment
are configured for Authoring MCP integration testing.

## Next Test Environment Requirement

The happy-path and idempotency scenarios require:

- `WEBTOON_AUTHORING_MCP_TOKEN`
- `WEBTOON_AUTHORING_MCP_WORKER_ID` or `X-Authoring-Worker-Id`
- DB connection environment variables
- `authoring_imports`, `authoring_import_events`, and
  `authoring_idempotency_keys` migration applied
- At least one `ACTIVE` author row
