# Creator Studio Performance Plan

Date: 2026-07-24
Status: Updated to current screen-scoped API design

## Goal

Improve creator studio perceived speed by loading only the data needed for the current screen. The current implementation avoids the former all-in-one workspace payload during normal navigation and uses route-specific read APIs instead.

## Previous Bottleneck

The earlier creator studio first screen performed broad loading and, in some flows, loaded episode lists for every series. This made the first screen grow with the creator's total content count.

```text
/creator-studio
├─ /api/me
├─ /api/creator/summary
├─ /api/creator/series
├─ /api/creator/profile
└─ repeated /api/creator/series/:seriesId/episodes
```

That shape repeated session checks and author record preparation across several calls, and it fetched detail data before the user selected a work or episode.

## Current API Shape

The UI now uses screen-scoped read models. `/api/creator/workspace` remains a compatibility endpoint, but the default client path does not call it.

| Screen | Route | Primary API calls | Growth behavior |
|---|---|---|---|
| Dashboard | `/creator-studio/dashboard` | `/api/me`, `/api/creator/dashboard` | Fixed-size dashboard summary and recent feedback |
| Works list | `/creator-studio/works` | `/api/me`, `/api/creator/series` | Grows with series list only |
| Work detail | `/creator-studio/works/:seriesId` | `/api/me`, `/api/creator/series/:id`, `/api/creator/series/:id/episodes` | Grows with selected work's episodes only |
| Episode detail | `/creator-studio/episodes/:episodeId` | `/api/me`, `/api/creator/episodes/:id`, `/api/creator/episodes/:id/images` | Grows with selected episode's images only |
| Feedback | `/creator-studio/feedback` | `/api/me`, `/api/creator/feedback` | Grows with feedback page result only |
| Settings | `/creator-studio/settings` | `/api/me`, `/api/creator/profile` | Fixed-size profile payload |

## Performance Boundary

| Concern | Current decision |
|---|---|
| First screen payload | Do not include every episode or image |
| Selected work payload | Include only selected series and its episode list |
| Selected episode payload | Include only selected episode and image list |
| Publication state | Return `draftStatus` and `publicationStatus`; keep `status` for compatibility |
| Static catalog seed | Login-time auto attach is disabled by default and requires explicit opt-in |
| Public reader data | Public pages use generated static catalog artifacts, not creator APIs |

## Measurement Plan

Run this in staging or a local seeded DB with representative author content.

| Step | Measurement | Expected result |
|---:|---|---|
| 1 | Capture `/creator-studio/dashboard` network calls | No request to `/api/creator/workspace` |
| 2 | Capture dashboard response size | Independent of total episode/image count except recent feedback |
| 3 | Open one work detail route directly | Only selected work and its episodes are loaded |
| 4 | Open one episode detail route directly | Only selected episode and its images are loaded |
| 5 | Compare with legacy workspace route if enabled | New normal navigation has lower detail payload on first screen |

## Local Verification

The repeatable local readiness script checks the implementation boundary:

```bash
npm run readiness:creator-studio
```

Relevant checks:

| Check | Expected |
|---|---|
| `workspaceDependencyRemovedFromClient` | `true` |
| `clientRoutesAndApis` | `true` |
| `staticGeneratorRoutes` | `true` |
| `vercelNestedRouteRewrite` | `true` |

## Remaining Optimization Candidates

| Candidate | Reason |
|---|---|
| Session/auth cache for adjacent creator API calls | Reduce repeated auth verification on direct detail screens |
| Pagination for large feedback and episode lists | Bound payload size for high-volume creators |
| Dashboard count refresh policy | Avoid synchronous recomputation on write-heavy accounts |
| Object-storage image metadata cache | Prepare for uploaded assets and thumbnail generation |
