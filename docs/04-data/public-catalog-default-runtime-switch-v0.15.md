# Public Catalog Default Runtime Switch v0.15

Date: 2026-07-15
Status: Applied locally; not deployed

## Goal

Make the generated public catalog artifact the default static reader runtime:

```text
Default build script: /data/catalog.generated.js
Generated artifact: public/data/catalog.generated.js
Legacy rollback script: /data/catalog.js
```

This change applies only to local repository output. It does not deploy, push, run a DB migration, or change production state.

## Build Contract

`npm run build` now:

1. Generates static pages.
2. Copies static assets and `data/catalog.js` into `public/`.
3. Builds `public/data/catalog.generated.js` from the public catalog artifact boundary.
4. Emits HTML that references `/data/catalog.generated.js`.
5. Fails if the generated artifact does not match the published baseline or is not published-only.

`npm run build:legacy-catalog` is the local rollback build path. It emits HTML that references `/data/catalog.js` and does not leave `public/data/catalog.generated.js` in `public/`.

## Verification Commands

| Command | Purpose |
|---|---|
| `npm run readiness:public-artifact-switch` | Verifies default generated runtime, legacy rollback build, and restored default generated runtime |
| `npm run readiness:public-artifact` | Compares legacy `/data/catalog.js` output against current default generated output |
| `npm run verify:public-artifact` | Verifies `public/data/catalog.generated.js` payload hash |
| `npm run smoke:public-artifact-browser` | Executes representative public reader routes against the generated artifact |
| `npm run build:legacy-catalog` | Local rollback rehearsal path |

## Rollback

If the generated artifact default runtime must be rolled back locally:

```bash
npm run build:legacy-catalog
```

For code rollback, restore `scripts/generate-static-pages.js` so the default runtime script is `/data/catalog.js` and remove default artifact writing from `npm run build`.

## Non-Goals

- No production deployment.
- No remote push or merge request.
- No DB migration.
- No secret, token, or environment variable change.
- No change to the long-term goal that DB/API becomes the operational source of truth.

