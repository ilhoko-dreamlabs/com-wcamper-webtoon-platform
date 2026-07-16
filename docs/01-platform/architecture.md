# Platform Architecture v0.1

Date: 2026-07-15
Status: Approved

## Core Architecture

```text
auth.wcamper.com
  |
  v
Webtoon API
  - auth adapter
  - creator workspace
  - admin review
  - asset metadata
  - feedback/events
  - publication snapshot
  - audit logs
  |
  v
Postgres write model
  - authors
  - author_applications
  - webtoon_series
  - webtoon_episodes
  - episode_images
  - asset_objects
  - publication_reviews
  - publication_snapshots
  - feedback
  - reader_activity_aggregates
  - creator_dashboard_counts
  - site_settings
  - admin_audit_logs
  |
  +--> Object/static asset storage
  |
  +--> Published Snapshot Builder
         |
         v
       Static public site / CDN
```

## Source Of Truth

| Data | Operational source | Public output |
|---|---|---|
| Creator identity | Auth session + `authors` | Public author snapshot |
| Author application | Webtoon DB | Not public unless explicitly exposed |
| Series | Webtoon DB | Published snapshot |
| Episodes | Webtoon DB | Published snapshot |
| Episode image metadata | Webtoon DB | Public image URLs in snapshot |
| Image binaries | Static assets now, object storage later | CDN/static URLs |
| Feedback | Webtoon DB | Public or moderated feedback output |
| Reader events | Event API + aggregate tables | Scores and summaries |
| Public catalog | Generated from DB | `data/catalog.js` or public catalog artifact |

## Read Models

| Consumer | Read model | Performance rule |
|---|---|---|
| Reader public site | Generated published snapshot | No runtime DB dependency for public webtoon reading |
| Creator workspace | DB/API workspace read model | Use coarse-grained workspace endpoints, not many small calls |
| Admin console | DB/API review and operations read model | Use pagination, filters, indexes, and audit logs |
| My page | Auth session + reader activity APIs | Keep personal data behind authenticated API |
| Build process | Snapshot builder | Fail fast on missing assets or invalid publication state |

## API Boundary

```text
api/_lib/
  auth-adapter.js
  author-access.js
  creator-repository.js
  creator-workspace-service.js
  admin-review-service.js
  asset-service.js
  publication-service.js
  public-snapshot-service.js
  event-aggregate-service.js
  audit-log-service.js
```

Routes should be thin. They should validate request shape, call a service, and return a response. Ownership, publication, asset, and auth decisions belong in shared modules.

## State Model

Production state and publication state are separate.

```text
draft_status:
  DRAFT
  SUBMITTED
  CHANGES_REQUESTED
  APPROVED

publication_status:
  PRIVATE
  SCHEDULED
  PUBLISHED
  PAUSED
  ARCHIVED
```

The public snapshot builder may include only rows that satisfy approved publication rules. A draft approval alone does not mean public visibility.

## Asset Model

Short term:

- Keep current static image paths.
- Store paths as `episode_images.image_url`.
- Validate paths before static generation.

Medium term:

- Store originals in object storage.
- Store optimized public panels and thumbnails separately.
- Store checksum, dimensions, MIME type, size, owner, episode, and public URL in DB.

Public pages should only receive public asset URLs, never private originals or storage credentials.

## Performance Architecture

| Area | Target |
|---|---|
| Public page loading | Static HTML/catalog and static/CDN images |
| Public catalog | Generated at build/snapshot time |
| Creator first screen | `/api/me` plus `/api/creator/workspace` |
| Creator details | Query only selected series or episode data |
| Admin lists | Paginated and status-indexed |
| Reader events | Batch or aggregate where possible |
| Build | Validate catalog, publication state, and asset paths before output |

## Operational Boundaries

The following require separate explicit approval:

- production deployment
- remote push or pull request creation
- production DB migration
- environment variable or secret changes
- secret rotation
- data deletion
- changing external routing, DNS, or storage policies

