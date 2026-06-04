# Fix PangHu Backend + Frontend Vercel Deployment

**Date:** 2026-04-27
**Status:** Approved
**Approach:** Fix existing esbuild bundle + Prisma configuration (Approach A)

## Problem

The PangHu project fails to deploy on Vercel — the backend fails at build and runtime, and the frontend config needs updating alongside:

1. **esbuild bundle breaks Prisma** — `--external:@prisma/client` excludes Prisma from the bundle, but the generated client files (`node_modules/.prisma/client`) are not resolvable at runtime. The bundled `api/index.js` (2.9 MB) cannot find the Prisma engine.
2. **Two conflicting API entry points** — Both `api/index.js` and `api/[[...path]].js` exist, creating confusion about which Vercel function handles requests.
3. **Outdated Vercel config** — `vercel.json` uses deprecated Build API v2 (`builds` + `routes`), which affects both frontend and backend deployment.
4. **Frontend API base URL** — The frontend uses `VITE_API_BASE_URL` (defaults to `http://localhost:3000/api`). On Vercel, this must point to the deployed backend (relative `/api` path or the Vercel domain).

## Solution

### 1. Single API Entry Point

Keep `api/[[...path]].js` as the sole Vercel function entry point. Delete the redundant `api/index.js` and `api/server.js` bundles.

The `[[...path]].js` handler:
- `require()` the bundled Express app from `_server.js`
- Wraps runtime errors in a diagnostic JSON response

### 2. Fix esbuild Bundle Output

Change the build command to bundle into `api/_server.js` (sibling to the entry point):

```
esbuild src/server.ts --bundle --platform=node --target=node20 --format=cjs \
  --outfile=../api/_server.js \
  --external:@prisma/client --external:@prisma/adapter-pg --external:pg
```

The `[[...path]].js` loads the bundle via `require('./_server')`.

Externalized packages (`@prisma/client`, `@prisma/adapter-pg`, `pg`) resolve from `node_modules` at runtime.

### 3. Fix Prisma Generation

The `postinstall` script (`scripts/vercel-postinstall.js`) runs `prisma generate` using the backend schema. On Vercel:
- Prisma generates into `node_modules/.prisma/client` at the root level
- Remove the `--no-engine` flag — Prisma's default HTTP-based query engine works on Vercel
- Ensure the root `package.json` lists `@prisma/client`, `@prisma/adapter-pg`, and `pg` as dependencies so Vercel installs them

### 4. Modernize vercel.json

Replace the deprecated `builds` + `routes` with a cleaner config:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/uploads/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/cats/(.*)", "destination": "/api/[[...path]]" }
  ]
}
```

Use Vercel's file-system routing convention for the `api/` directory. The `api/[[...path]].js` file becomes a catch-all serverless function automatically.

For the frontend, add a build config that tells Vercel to build `frontend/` as a static site.

### 5. Frontend Deployment

The frontend is a Vue 3 + Vite app in `frontend/`. To deploy correctly on Vercel:

- The `vercel.json` must include a build configuration that runs `npm run build` in `frontend/` and serves `frontend/dist/` as static output
- Set the `VITE_API_BASE_URL` environment variable in Vercel to `/api` (relative path) so the frontend calls the backend on the same domain, avoiding CORS issues
- The frontend output directory is `frontend/dist` (default Vite output)
- All non-API routes should fall through to `frontend/dist/index.html` for Vue Router's history mode

### 6. Root Dependencies

Keep `@prisma/client`, `@prisma/adapter-pg`, and `pg` as root-level dependencies so Vercel installs them and the bundle can resolve them at runtime.

## Files Changed

| File | Change |
|------|--------|
| `backend/package.json` | Update `build` script output to `../api/_server.js`, add `--external:pg` |
| `api/[[...path]].js` | Update to `require('./_server')` |
| `vercel.json` | Replace `builds`+`routes` with `rewrites`, add frontend + backend build config |
| `scripts/vercel-postinstall.js` | Remove `--no-engine` flag |
| Vercel environment | Set `VITE_API_BASE_URL=/api` for the frontend |
| `api/index.js` | Delete (replaced by `[[...path]].js` + `_server.js`) |
| `api/server.js` | Delete (replaced by `_server.js`) |
| `package.json` | Keep root deps, ensure postinstall script is correct |

## Out of Scope

- Database schema or Prisma model changes
- Environment variable changes (other than `VITE_API_BASE_URL`)
- Backend code refactoring
- Security hardening beyond deployment fix
