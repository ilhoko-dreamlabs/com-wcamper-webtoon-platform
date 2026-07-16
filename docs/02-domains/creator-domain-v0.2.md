# Creator Domain v0.2

Date: 2026-07-15
Status: Approved design baseline

## Goal

Define the writer-side domain for the author/supplier workflow before changing runtime behavior. This document converts the approved v0.1 platform direction into creator-owned entities, state rules, and implementation boundaries.

## Current Implementation Facts

| Area | Current fact | Source |
|---|---|---|
| Author identity | Approved authors are represented by `authors` and connected to an authenticated user | `db/schema.sql`, `api/_lib/creator-content.js` |
| Author onboarding | Admin approval of `author_applications` creates or activates an `authors` row | `api/admin/author-applications/[id]/approve.js` |
| Creator workspace | Creator APIs expose profile, workspace, summary, series, episodes, images, and review requests | `api/creator.js` |
| Content ownership | `webtoon_series.author_id` owns works; episodes belong to series; images belong to episodes | `db/schema.sql` |
| Current status model | Series and episodes each use one `status` field | `db/schema.sql` |
| Static catalog seed | Selected owner emails can attach the initial public catalog into DB rows | `api/_lib/creator-content.js` |

## Domain Roles

| Role | Responsibility | Initial authority |
|---|---|---|
| Author | Creates and updates profile, works, episodes, and episode images | Own draft workspace only |
| Operator | Approves author applications, reviews content, controls publication | Required for publication |
| Reader | Reads published snapshots and sends feedback signals | No write access to creator content |
| Snapshot builder | Converts approved publication rows into static public catalog/pages | Read-only build process |

## Core Entities

| Entity | Purpose | Current table | v0.2 note |
|---|---|---|---|
| Author | Supplier account and public author profile | `authors` | Keep as owner root |
| Author Application | Request to become an author | `author_applications` | Keep separate from active author |
| Series | Creator-owned work container | `webtoon_series` | Split draft/publication state in next schema phase |
| Episode | Creator-owned unit of publication | `webtoon_episodes` | Publication is episode-level first |
| Episode Image | Ordered reading asset reference | `episode_images` | Treat as asset metadata, not binary storage |
| Feedback | Reader signal scoped to author, series, or episode | `feedback` | Read model input for creator dashboard |
| Publication Review | Operator review decision | planned | Add before direct publish workflows |
| Publication Snapshot | Static public output provenance | planned | Add before DB-driven public catalog generation |
| Asset Object | Binary/object metadata | planned | Add when upload/object storage is introduced |

## State Model

The current implementation uses one `status` field for both production and public visibility. v0.2 keeps that behavior unchanged in runtime, but future work must separate:

| State | Scope | Values |
|---|---|---|
| `draft_status` | Author production workflow | `DRAFT`, `REVIEW_REQUESTED`, `REVISION_REQUESTED`, `APPROVED`, `ARCHIVED` |
| `publication_status` | Public visibility workflow | `UNPUBLISHED`, `SCHEDULED`, `PUBLISHED`, `WITHDRAWN` |

Temporary compatibility mapping:

| Current `status` | `draft_status` | `publication_status` |
|---|---|---|
| `DRAFT` | `DRAFT` | `UNPUBLISHED` |
| `REVIEW_REQUESTED` | `REVIEW_REQUESTED` | `UNPUBLISHED` |
| `REVISION_REQUESTED` | `REVISION_REQUESTED` | `UNPUBLISHED` |
| `APPROVED` | `APPROVED` | `UNPUBLISHED` |
| `SCHEDULED` | `APPROVED` | `SCHEDULED` |
| `PUBLISHED` | `APPROVED` | `PUBLISHED` |
| `ARCHIVED` | `ARCHIVED` | `WITHDRAWN` |

## Author Write Rules

| Operation | Allowed when | Notes |
|---|---|---|
| Update profile | Author is `ACTIVE` | Does not require publication review |
| Create series | Author is `ACTIVE` | Starts as draft |
| Update series | Series is draft-like | Current code allows `DRAFT` and `REVISION_REQUESTED` |
| Create episode | Parent series belongs to author | Starts as draft |
| Update episode | Episode is draft-like | Must not mutate published public snapshot directly |
| Add/update image | Episode belongs to author and is draft-like | Asset URL must be validated before publish |
| Request review | Episode is complete enough for operator review | Should create review/audit trail in next phase |

## Completion Criteria For This Domain Baseline

- Current creator entities are mapped to the approved platform model.
- The single-status compatibility mapping is explicit.
- Publication authority remains operator controlled.
- Next implementation backlog can be derived without changing production data.

