# Public Catalog Artifact Contract v0.8

Date: 2026-07-15
Status: Approved local dry-run contract

## Purpose

Define the generated public catalog artifact shape before replacing the browser runtime dependency on `/data/catalog.js`.

This contract keeps the current runtime unchanged. It only produces and verifies a local dry-run artifact candidate.

## Artifact Candidate

| Field | Value |
|---|---|
| Dry-run report | `reports/public-catalog-artifact-dry-run.json` |
| Candidate runtime path | `public/data/catalog.generated.js` |
| Current runtime path | `/data/catalog.js` |
| Runtime global | `window.WCAMPER_WEBTOON` |
| Media type | `application/javascript` |
| Version | `public-catalog-artifact.v0.8` |

## Payload Rules

- Payload is catalog-compatible with the current browser runtime.
- Payload includes only published series and published episodes.
- Author rows are limited to authors referenced by published series.
- Series `episodes` arrays are filtered to published episode IDs only.
- Episode rows must resolve from every series episode reference.
- Dry-run generation must report `mutationPerformed: false`.
- The artifact must match the approved published baseline before any runtime path switch is considered.

## Current Expected Counts

| Metric | Value |
|---|---:|
| Authors | 1 |
| Published series | 2 |
| Published episodes | 16 |
| Image rows | 17 |

## Verification

```bash
npm run snapshot:catalog
```

Expected report invariants:

| Invariant | Expected |
|---|---|
| `publishedOnlySeries` | `true` |
| `publishedOnlyEpisodes` | `true` |
| `seriesEpisodeRefsResolve` | `true` |
| `matchesPublishedBaseline` | `true` |
| `mutationPerformed` | `false` |

## Non-Goals

- Do not publish or serve `public/data/catalog.generated.js` in this phase.
- Do not replace `<script src="/data/catalog.js">` in generated pages in this phase.
- Do not connect to production DB or execute a DB-backed export in this phase.
