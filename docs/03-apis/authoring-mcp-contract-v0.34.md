# Authoring MCP Contract v0.34

Date: 2026-08-21
Status: Contract with minimal HTTP tool adapter implementation

## Goal

Define the MCP-facing integration contract for external authoring workers that
create webtoon drafts.

The authoring MCP is not a public publication API. It is a controlled draft
submission interface that lets another worker prepare reviewable creator
content without bypassing creator/admin review and release controls.

## Boundary

| Capability | Decision |
|---|---|
| Create or update draft content | Allowed through MCP tools |
| Register or attach assets | Allowed through MCP tools |
| Submit an episode for review | Allowed through MCP tools |
| Approve review | Not allowed; admin console only |
| Generate publication snapshot | Not allowed; admin publication pipeline only |
| Promote to production | Not allowed; admin publication pipeline only |
| Roll back production | Not allowed; admin publication pipeline only |

## Authentication

MCP calls must use worker-oriented authentication rather than browser session
cookies.

| Requirement | Contract |
|---|---|
| Worker identity | A server-side worker token or signed job token identifies the calling worker |
| Author binding | Each import is bound to one target author id or approved author handle |
| Idempotency | Mutating tools require `idempotencyKey` |
| Auditability | Every accepted tool call records worker id, import id, target ids, action, and sanitized metadata |
| Secret handling | Tokens are never stored in draft payloads, logs, artifacts, or Wiki content |

## MCP Tools

| Tool | Purpose | Mutates DB | Production effect |
|---|---|---:|---:|
| `create_authoring_import` | Start or reuse an authoring import job | Yes | No |
| `upsert_series_draft` | Create or update a series draft owned by the target author | Yes | No |
| `upsert_episode_draft` | Create or update an episode draft in a series | Yes | No |
| `set_episode_panels` | Replace the ordered panel/image composition for an episode draft | Yes | No |
| `register_authoring_asset` | Register an already uploaded asset or request an upload slot | Yes | No |
| `submit_episode_for_review` | Submit a draft episode to the existing review flow | Yes | No |
| `get_authoring_import_status` | Return import, draft, review, and release-state pointers | No | No |

## Current HTTP Adapter

The current implementation exposes the first two tools through the platform API:

```text
POST /api/authoring-mcp/tools/create_authoring_import
POST /api/authoring-mcp/tools/get_authoring_import_status
```

The remaining tools are part of the contract but return
`AUTHORING_MCP_TOOL_NOT_IMPLEMENTED` until the draft mutation bridge is built.

## Tool Contracts

### `create_authoring_import`

Input:

```json
{
  "idempotencyKey": "job-20260821-001",
  "externalJobId": "worker-job-001",
  "authorRef": {
    "authorId": "author_123"
  },
  "source": {
    "workerName": "story-worker",
    "workflow": "episode-draft"
  },
  "metadata": {
    "title": "Episode import"
  }
}
```

Output:

```json
{
  "importId": "import_123",
  "status": "OPEN",
  "authorId": "author_123"
}
```

### `upsert_series_draft`

Input:

```json
{
  "idempotencyKey": "job-20260821-001-series",
  "importId": "import_123",
  "series": {
    "id": "optional_existing_series_id",
    "title": "Series title",
    "summary": "Series summary",
    "genre": "Fantasy",
    "tags": ["fantasy", "adventure"],
    "coverAssetId": "asset_001"
  }
}
```

Output:

```json
{
  "seriesId": "series_123",
  "draftStatus": "DRAFT",
  "publicationStatus": "UNPUBLISHED"
}
```

### `upsert_episode_draft`

Input:

```json
{
  "idempotencyKey": "job-20260821-001-episode",
  "importId": "import_123",
  "seriesId": "series_123",
  "episode": {
    "id": "optional_existing_episode_id",
    "number": 1,
    "title": "Episode title",
    "summary": "Episode summary",
    "draftBody": "Optional script or notes"
  }
}
```

Output:

```json
{
  "episodeId": "episode_123",
  "draftStatus": "DRAFT",
  "publicationStatus": "UNPUBLISHED"
}
```

### `set_episode_panels`

Input:

```json
{
  "idempotencyKey": "job-20260821-001-panels",
  "importId": "import_123",
  "episodeId": "episode_123",
  "panels": [
    {
      "sortOrder": 1,
      "assetId": "asset_001",
      "altText": "Opening panel",
      "gapAfter": 0,
      "backgroundColor": "#ffffff"
    }
  ]
}
```

Output:

```json
{
  "episodeId": "episode_123",
  "panelCount": 1
}
```

### `register_authoring_asset`

Input:

```json
{
  "idempotencyKey": "job-20260821-001-asset",
  "importId": "import_123",
  "asset": {
    "objectKey": "authors/author_123/import_123/panel-001.png",
    "publicUrl": "https://cdn.example.invalid/panel-001.png",
    "originalFilename": "panel-001.png",
    "mimeType": "image/png",
    "byteSize": 123456
  }
}
```

Output:

```json
{
  "assetId": "asset_001",
  "status": "REGISTERED"
}
```

### `submit_episode_for_review`

Input:

```json
{
  "idempotencyKey": "job-20260821-001-review",
  "importId": "import_123",
  "episodeId": "episode_123",
  "reviewNote": "Ready for editorial review"
}
```

Output:

```json
{
  "episodeId": "episode_123",
  "reviewId": "review_123",
  "draftStatus": "REVIEW_REQUESTED",
  "publicationStatus": "UNPUBLISHED"
}
```

### `get_authoring_import_status`

Input:

```json
{
  "importId": "import_123"
}
```

Output:

```json
{
  "importId": "import_123",
  "status": "SUBMITTED_FOR_REVIEW",
  "seriesId": "series_123",
  "episodeId": "episode_123",
  "reviewId": "review_123",
  "release": {
    "publicationStatus": "UNPUBLISHED",
    "latestReleaseId": null
  }
}
```

## Mapping To Existing Platform APIs

| MCP tool | Existing internal boundary |
|---|---|
| `upsert_series_draft` | Creator series create/update service |
| `upsert_episode_draft` | Creator episode create/update service |
| `set_episode_panels` | Creator episode image service |
| `register_authoring_asset` | Creator asset service |
| `submit_episode_for_review` | Existing creator review request flow |
| Release status fields | `publication_reviews`, `publication_snapshots`, `publication_releases` |

## Current Environment Variables

| Variable | Purpose |
|---|---|
| `WEBTOON_AUTHORING_MCP_TOKEN` | Bearer token required by the HTTP tool adapter |
| `WEBTOON_AUTHORING_MCP_WORKER_ID` | Optional fallback worker id when `X-Authoring-Worker-Id` is not sent |

## Acceptance Criteria

| Check | Expected |
|---|---|
| Production bypass | No MCP tool can approve, snapshot, promote, or roll back production |
| Idempotency | Mutating tools require `idempotencyKey` |
| Author binding | Import jobs are bound to one active author |
| Review path | Submission ends at `REVIEW_REQUESTED`, not `PUBLISHED` |
| Verification | `npm run readiness:authoring-mcp` passes |
