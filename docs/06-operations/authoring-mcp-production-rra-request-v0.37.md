# Authoring MCP Production RRA Request v0.37

Date: 2026-08-21
Status: RRA path exercised; production unauthenticated boundary active

## Goal

Activate the already deployed Authoring MCP production route by verifying and
setting the required production environment variables through an approved
administrator path.

The code route is already deployed:

```text
POST /api/authoring-mcp/tools/create_authoring_import
POST /api/authoring-mcp/tools/get_authoring_import_status
```

Current unauthenticated production smoke returns
`401 AUTHORING_MCP_AUTH_REQUIRED`, which confirms that the route exists and the
production worker token environment variable is active in the deployed function.

## Boundary

This request must not expose, print, copy, or store secret values in chat,
logs, evidence, commit history, or Wiki pages.

Authoring MCP is a draft import integration boundary only. It must not approve
reviews, create publication snapshots, promote production releases, or roll back
production releases.

## Requested Admin Worker

Use `worker00` only if it is running an approved admin-capable worker profile.
Recommended DreamLabs profile:

```text
dlw-gitops-admin
```

Applicable DreamLabs registry guidance:

- `docs/WORKER_USAGE_GUIDE.md`
- `skills/dreamlabs-admin/atomic/dreamlabs-secret-variable-audit`
- `skills/dreamlabs-specific/workflows/dreamlabs-deployment-readiness`
- `skills/dreamlabs-specific/workflows/dreamlabs-release-handoff`

## Repository And Production Target

| Item | Value |
|---|---|
| Repository | `https://github.com/ilhoko-dreamlabs/com-wcamper-webtoon-platform.git` |
| Branch | `main` |
| Production domain | `https://webtoon.wcamper.com` |
| Latest known production redeploy trigger commit | `e95abae` |
| Current route contract | `/api/authoring-mcp/tools/:toolName` rewritten through `api/creator.js` |

## Production Environment Variable Audit

worker00 should report metadata only: `present` / `missing`, target
environment, and whether the setting is protected or encrypted according to the
hosting provider. Do not report values.

| Variable | Required | Expected environment | Purpose | Required action |
|---|---:|---|---|---|
| `WEBTOON_AUTHORING_MCP_TOKEN` | Yes | production | Bearer token for external authoring worker tool calls | Create if missing; rotate only if owner explicitly requests |
| `WEBTOON_AUTHORING_MCP_WORKER_ID` | No | production | Fallback worker id when `X-Authoring-Worker-Id` is omitted | Optional; set to a non-secret stable worker id if desired |
| `WEBTOON_DATABASE_URL` or `POSTGRES_URL` or `DATABASE_URL` | Yes | production | Postgres connection used by Authoring MCP import/status tools | Verify one exists; do not print value |
| `WEBTOON_DATABASE_SSL` | No | production | Set to `disable` only when the DB provider requires no SSL | Verify current policy; default code path uses SSL |

## DB Schema Requirement

The Authoring MCP minimal adapter requires the additive tables below. The
application schema bootstrap can create them when DB access is configured, but
production operators may also apply the reviewed SQL explicitly.

Reference SQL:

```text
docs/04-data/authoring-mcp-migration-v0.35.sql
```

Required tables:

- `authoring_imports`
- `authoring_import_events`
- `authoring_idempotency_keys`

The happy path also requires at least one `authors.status = 'ACTIVE'` row for
the target `authorRef`.

## RRA Request Text For worker00

```text
worker00 RRA request:

Project: com-wcamper-webtoon-platform
Repository: https://github.com/ilhoko-dreamlabs/com-wcamper-webtoon-platform.git
Production domain: https://webtoon.wcamper.com
Purpose: Activate the already deployed Authoring MCP production route.

Please perform a sanitized production environment audit and, if approved through
RRA, configure the missing production environment variables without exposing
secret values.

Required checks:
1. Confirm production deployment for GitHub main is active.
2. Confirm production env metadata only:
   - WEBTOON_AUTHORING_MCP_TOKEN
   - WEBTOON_AUTHORING_MCP_WORKER_ID
   - one of WEBTOON_DATABASE_URL, POSTGRES_URL, DATABASE_URL
   - WEBTOON_DATABASE_SSL
3. Do not print, copy, export, or store any secret value.
4. If WEBTOON_AUTHORING_MCP_TOKEN is missing, create a high-entropy production
   secret value through the approved hosting secret path.
5. Verify DB connectivity is configured, but do not reveal the connection string.
6. Confirm the additive Authoring MCP tables exist or apply the reviewed
   additive migration:
   docs/04-data/authoring-mcp-migration-v0.35.sql
7. Run production smoke without exposing the token:
   - no Authorization header:
     POST /api/authoring-mcp/tools/create_authoring_import
     expected 401 AUTHORING_MCP_AUTH_REQUIRED after token is configured
   - invalid Authorization header:
     expected 401 AUTHORING_MCP_AUTH_REQUIRED
   - valid Authorization header with an approved test authorRef:
     expected 200 with status OPEN, then idempotent replay returns the same import
8. Confirm deferred tools still return 501:
   - set_episode_panels
   - submit_episode_for_review
9. Confirm no MCP tool can approve, snapshot, promote, or rollback production.

Report back only sanitized metadata, HTTP statuses, public error codes, import
ids for test data if allowed, and whether rollback is needed. Do not include
tokens, DB URLs, cookies, or private keys.
```

## Expected Production Smoke After Activation

| Scenario | Expected |
|---|---|
| No `Authorization` header | `401 AUTHORING_MCP_AUTH_REQUIRED` |
| Invalid bearer token | `401 AUTHORING_MCP_AUTH_REQUIRED` |
| Valid token but missing/invalid authorRef | `400 VALIDATION_ERROR` or `404 AUTHOR_NOT_FOUND` |
| Valid token and active authorRef | `200`, import `status=OPEN` |
| Same idempotency key replay | `200`, same import response with `idempotentReplay=true` |
| Deferred mutation tool | `501 AUTHORING_MCP_TOOL_NOT_IMPLEMENTED` |
| Unknown tool | `404 AUTHORING_MCP_TOOL_NOT_FOUND` |

## Rollback

If activation causes unexpected behavior, remove or disable
`WEBTOON_AUTHORING_MCP_TOKEN` in production. The route will return
`503 AUTHORING_MCP_NOT_CONFIGURED` again while public reader and normal
creator/admin routes remain deployed.

Do not roll back the production site deployment unless unrelated regressions are
found.

## Current Worker Result

The worker00 Remote Request API path was exercised without exposing secret
values.

| Request | Result |
|---|---|
| `req-5d21fab089a61d0488157efae9b768c8` | Prerequisite check completed; Vercel project and production DB env metadata present |
| `req-1ffd19f93f458009fb474fcf6e170443` | Token recheck completed; `WEBTOON_AUTHORING_MCP_TOKEN` already exists in production, not overwritten |
| `req-88a0a3614b78b4a1e2b96e6d21b65500` | Broad activation request failed before vendor dispatch |
| `req-0a30a366720ce089d324aa0bc3464a9a` | Redeploy request failed before vendor dispatch |

Because this worker has GitHub push access but no Vercel CLI token, production
redeploy was triggered by pushing empty commit `e95abae`.

Current production smoke:

```text
POST /api/authoring-mcp/tools/create_authoring_import
=> 401 AUTHORING_MCP_AUTH_REQUIRED
```

Remaining validation requires an approved production bearer token and test
`authorRef`. Neither value was exposed to this worker.
