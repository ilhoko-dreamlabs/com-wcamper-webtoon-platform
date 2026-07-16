# Static Catalog Import v0.2

Date: 2026-07-15
Status: Approved design baseline

## Goal

Define how `data/catalog.js` becomes repeatable migration input for creator-owned DB rows without treating it as the future source of truth.

## Input

| Input | Role |
|---|---|
| `data/catalog.js` | Current static MVP catalog and migration input |
| `reports/static-catalog-baseline.json` | Count and asset baseline for verification |
| `assets/img/**` | Current local image references |

## Import Ownership

Initial import maps the current public catalog to one author:

| Field | Value |
|---|---|
| Author handle | `bongdal-universe-comics` |
| Current author count | 1 |
| Series count | 3 |
| Episode count | 17 |

The importer must not infer additional authors unless catalog data explicitly contains them.

## Mapping

| Catalog concept | DB target | Notes |
|---|---|---|
| Author | `authors` | Upsert by stable handle or configured author ID |
| Series | `webtoon_series` | Upsert by stable series ID |
| Episode | `webtoon_episodes` | Upsert by stable episode ID |
| Panels | `episode_images` | Convert to ordered image rows |
| Thumbnail/Cover | Existing URL fields first; later `asset_objects` | Validate path exists before import |
| Published status | `publication_status = PUBLISHED` | Keep `draft_status = APPROVED` |
| Planned status | `publication_status = UNPUBLISHED` | Keep `draft_status = DRAFT` |

## Idempotency Rules

- Re-running the import must not duplicate authors, series, episodes, or images.
- Stable source IDs must be preserved.
- Existing manually edited draft rows must not be overwritten unless `--apply --overwrite` is explicitly supported later.
- Dry-run mode is required before apply mode.
- Dry-run output must include created, updated, skipped, and conflict counts.

## Verification Rules

| Check | Expected result |
|---|---|
| Baseline counts | Import dry-run count matches `reports/static-catalog-baseline.json` |
| Asset paths | `npm run validate:assets` reports no missing local references |
| Duplicate prevention | Second dry-run after import reports no duplicate creates |
| Public status | Only currently published catalog rows become public snapshot candidates |
| Draft preservation | Planned/unpublished rows remain unpublished |

## First Script Contract

Planned script:

```bash
npm run import:catalog -- --dry-run
```

Planned output:

```text
Static catalog import dry-run
Authors: create 0/1, update 1, conflict 0
Series: create 0/3, update 3, conflict 0
Episodes: create 0/17, update 17, conflict 0
Images: create 0/17, update 17, conflict 0
Missing assets: 0
Apply mode: not executed
```

The exact counts will depend on the target DB state. The dry-run must always state that no DB mutation was performed.

## Completion Criteria For This Import Baseline

- Import mapping is defined.
- Idempotency and dry-run requirements are explicit.
- Verification ties back to the static catalog baseline.
- No DB connection or mutation is required for this design step.

