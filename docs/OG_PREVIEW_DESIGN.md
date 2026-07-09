# OG Preview Design

## Goal

WCAMPER Webtoon shared links must show page-specific titles, descriptions, URLs, and preview images for home, author, series, and episode pages.

## Problem

The site is a static SPA. The visual page is rendered by `assets/js/app.js`, but social preview crawlers usually read the initial HTML without running the app. Client-side meta tag changes alone are not enough for reliable KakaoTalk, Facebook, X, Slack, and messenger previews.

## Approach

Use `data/catalog.js` as the single content source and generate one static `index.html` per route. Each generated file keeps the same body and scripts as the SPA, but receives route-specific `<head>` metadata.

Generated route groups:

- `/index.html`
- `/@{authorId}/index.html`
- `/@{authorId}/works/{seriesId}/index.html`
- `/@{authorId}/works/{seriesId}/episodes/{episodeNo}/index.html`
- `/404.html`

## Meta Rules

Home:

- `title`: `WCAMPER Webtoon`
- `description`: platform summary
- `image`: site default WebP thumbnail
- `type`: `website`

Author:

- `title`: `{author.name} | WCAMPER Webtoon`
- `description`: author bio
- `image`: author image when available, otherwise site default WebP thumbnail
- `type`: `profile`

Series:

- `title`: `{series.title} | WCAMPER Webtoon`
- `description`: series summary
- `image`: `series.thumbnail || series.cover || default`
- `type`: `website`

Episode:

- `title`: `{series.title} {episode.number}화. {episode.title} | WCAMPER Webtoon`
- `description`: episode summary
- `image`: `episode.thumbnail || first panel image || series.thumbnail || series.cover || default`
- `type`: `article`

## URL Policy

Preview metadata uses absolute production URLs:

- `og:url`: `https://webtoon.wcamper.com/...`
- `og:image`: `https://webtoon.wcamper.com/assets/...`
- `twitter:card`: `summary_large_image`

Static page links and app assets remain root-relative so the local dev server and production server use the same HTML body.

## Build Policy

`npm run build` runs `scripts/generate-static-pages.js`.

The generator must:

- load `data/catalog.js` in Node without duplicating content data
- escape HTML attribute values
- create missing route directories
- overwrite generated HTML route files deterministically
- keep body markup consistent across all routes

## Future Improvement

Current episode thumbnails are vertical webtoon thumbnails. They work as previews, but some platforms crop wide cards. A later improvement should generate `1200x630` share images under `assets/img/og/` for each series and episode.
