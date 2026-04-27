# Fix PangHu Vercel Backend + Frontend Deployment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the PangHu backend and frontend to deploy successfully on Vercel.

**Architecture:** Keep the existing esbuild bundle approach but fix the output target, Prisma externalization, and Vercel config. The backend Express app bundles to `api/_server.js`, loaded by `api/[[...path]].js`. The frontend builds separately via Vite. Modern `vercel.json` replaces deprecated `builds`+`routes`.

**Tech Stack:** Express, Prisma, esbuild, Vue 3, Vite, Vercel Serverless Functions

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `backend/package.json` | Backend build script (esbuild) | Modify build script |
| `api/[[...path]].js` | Vercel catch-all function entry point | Rewrite to load `_server.js` |
| `api/_server.js` | Bundled Express app (generated) | Created by build, gitignored |
| `vercel.json` | Vercel deployment config | Full rewrite |
| `scripts/vercel-postinstall.js` | Prisma generation on Vercel | Simplify |
| `package.json` (root) | Root deps + postinstall | Update postinstall, keep deps |
| `api/package.json` | API function deps | Remove (merge into root) |
| `api/index.js` | Old redundant bundle | Delete |
| `api/server.js` | Old redundant bundle | Delete |
| `.gitignore` | Ignore generated files | Add `api/_server.js` |

---

### Task 1: Delete old redundant API bundles

**Files:**
- Delete: `api/index.js`
- Delete: `api/server.js`

- [ ] **Step 1: Delete the old bundles**

```bash
rm /Users/yintao/Documents/trae_projects/PangHu/api/index.js
rm /Users/yintao/Documents/trae_projects/PangHu/api/server.js
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add -A
git commit -m "chore: remove old redundant API bundles"
```

---

### Task 2: Update backend build script

**Files:**
- Modify: `backend/package.json`

The current build script bundles to `../api/index.js` with only `--external:@prisma/client`. We change the output to `../api/_server.js` and add `--external:pg` and `--external:@prisma/adapter-pg` so all Prisma-related packages resolve at runtime from `node_modules`.

- [ ] **Step 1: Update the build script in `backend/package.json`**

Change the `build` script from:

```
"build": "mkdir -p ../api && NODE_TLS_REJECT_UNAUTHORIZED=0 prisma generate && esbuild src/server.ts --bundle --platform=node --target=node20 --format=cjs --outfile=../api/index.js --external:@prisma/client"
```

To:

```
"build": "mkdir -p ../api && NODE_TLS_REJECT_UNAUTHORIZED=0 prisma generate && esbuild src/server.ts --bundle --platform=node --target=node20 --format=cjs --outfile=../api/_server.js --external:@prisma/client --external:@prisma/adapter-pg --external:pg"
```

- [ ] **Step 2: Run the build locally to verify it works**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu/backend
npm run build
```

Expected: Command succeeds, `api/_server.js` is created (file size ~2-3 MB), no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add backend/package.json
git commit -m "fix: update esbuild output to api/_server.js with proper externals"
```

---

### Task 3: Rewrite the API entry point

**Files:**
- Modify: `api/[[...path]].js`

The current file tries to load `./server.js` which we deleted. Rewrite it to load `./_server.js` and keep the diagnostic error wrapper.

- [ ] **Step 1: Replace the contents of `api/[[...path]].js`**

```js
const http = require('http')

module.exports = (req, res) => {
  try {
    const app = require('./_server.js').default
    return app(req, res)
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 10),
      env: {
        VERCEL: !!process.env.VERCEL,
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
      }
    }))
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add api/[[...path]].js
git commit -m "fix: update API entry point to load _server.js bundle"
```

---

### Task 4: Update .gitignore

**Files:**
- Modify: `.gitignore`

The `.gitignore` already has `api/server.js`. Replace that line with `api/_server.js` to ignore the new generated bundle.

- [ ] **Step 1: Update `.gitignore`**

Replace:

```
api/server.js
```

With:

```
api/_server.js
api/index.js
```

We ignore `api/index.js` too so any future local builds don't accidentally commit it.

- [ ] **Step 2: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add .gitignore
git commit -m "chore: update gitignore for new bundle filenames"
```

---

### Task 5: Simplify Prisma postinstall script

**Files:**
- Modify: `scripts/vercel-postinstall.js`

Remove the `--no-engine` flag. Prisma's default query engine (HTTP-based in recent versions) works fine on Vercel without special flags.

- [ ] **Step 1: Replace the contents of `scripts/vercel-postinstall.js`**

```js
const { execSync } = require('child_process')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma')

execSync(
  `npx prisma generate --schema=${schemaPath} --no-hints`,
  { stdio: 'inherit' }
)
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add scripts/vercel-postinstall.js
git commit -m "fix: remove --no-engine from Prisma generation for Vercel compat"
```

---

### Task 6: Update root package.json

**Files:**
- Modify: `package.json` (root)

The root `package.json` currently has a `postinstall` script that runs `scripts/vercel-postinstall.js`. Update it to be cleaner. Also ensure the root dependencies include all packages the bundled server needs at runtime.

- [ ] **Step 1: Update `package.json` postinstall and dependencies**

The current root `package.json`:

```json
{
  "name": "panghu",
  "private": true,
  "dependencies": {
    "@prisma/client": "^6.19.2",
    "@prisma/adapter-pg": "^6.19.2",
    "pg": "^8.16.0"
  },
  "devDependencies": {
    "prisma": "^6.19.2"
  },
  "scripts": {
    "postinstall": "node scripts/vercel-postinstall.js || true",
    "deploy": "NODE_TLS_REJECT_UNAUTHORIZED=0 vercel",
    "deploy:prod": "NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod"
  }
}
```

Replace with:

```json
{
  "name": "panghu",
  "private": true,
  "dependencies": {
    "@prisma/client": "^6.19.2",
    "@prisma/adapter-pg": "^6.19.2",
    "pg": "^8.16.0"
  },
  "devDependencies": {
    "prisma": "^6.19.2"
  },
  "scripts": {
    "vercel-build": "cd backend && npm run build",
    "postinstall": "node scripts/vercel-postinstall.js || true",
    "deploy": "NODE_TLS_REJECT_UNAUTHORIZED=0 vercel",
    "deploy:prod": "NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod"
  }
}
```

The key addition is `vercel-build` — this is the command Vercel runs during build. It changes into the backend directory and runs the esbuild bundle.

- [ ] **Step 2: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add package.json
git commit -m "fix: add vercel-build script to root package.json"
```

---

### Task 7: Delete api/package.json

**Files:**
- Delete: `api/package.json`

The `api/package.json` duplicates the root dependencies and has its own `postinstall`. This causes confusion on Vercel — the API function should resolve packages from the root `node_modules`. Remove it so there is a single source of truth for dependencies.

- [ ] **Step 1: Delete the file**

```bash
rm /Users/yintao/Documents/trae_projects/PangHu/api/package.json
```

- [ ] **Step 2: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add -A
git commit -m "chore: remove duplicate api/package.json"
```

---

### Task 8: Rewrite vercel.json

**Files:**
- Modify: `vercel.json`

Replace the deprecated `builds` + `routes` with modern config. The `api/[[...path]].js` file is automatically detected as a catch-all serverless function by Vercel. The frontend builds from `frontend/` directory.

- [ ] **Step 1: Replace the contents of `vercel.json`**

```json
{
  "buildCommand": "npm run vercel-build && cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install && cd frontend && npm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/uploads/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/cats/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Notes:
- `buildCommand` runs the backend esbuild bundle AND the frontend Vite build
- `outputDirectory` tells Vercel where the frontend static output lives (`frontend/dist`)
- `installCommand` installs both root and frontend dependencies
- Rewrites route `/api/*`, `/uploads/*`, `/cats/*` to the serverless function
- The catch-all `/(.*)  -> /index.html` serves the Vue SPA for all non-API, non-static-file routes (Vue Router history mode)
- The `api/[[...path]].js` file is auto-detected as a Vercel function (no `builds` needed)

- [ ] **Step 2: Commit**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git add vercel.json
git commit -m "fix: modernize vercel.json config for backend + frontend deploy"
```

---

### Task 9: Deploy and verify

**Files:**
- None (deployment step)

- [ ] **Step 1: Push all changes to the remote branch**

```bash
cd /Users/yintao/Documents/trae_projects/PangHu
git push
```

- [ ] **Step 2: Set Vercel environment variables**

In the Vercel dashboard (https://vercel.com), ensure these environment variables are set for the PangHu project:

- `DATABASE_URL` = `postgresql://postgres:...@db.ggdmzbbfzcetinydgrds.supabase.co:5432/postgres`
- `JWT_SECRET` = (the current secret)
- `VITE_API_BASE_URL` = `/api`
- `ZHIPUAI_API_KEY` = (if using AI features)
- `ZHIPUAI_MODEL` = `glm-4-flash`

- [ ] **Step 3: Trigger a Vercel deployment**

Either via `git push` (auto-deploy) or manually from the Vercel dashboard. Monitor the build logs for errors.

- [ ] **Step 4: Verify the deployment**

```bash
curl https://pang-hu-9z4h.vercel.app/api/debug
```

Expected: JSON response with `env.VERCEL: true`, `env.DATABASE_URL: true`, `env.JWT_SECRET: true`.

```bash
curl https://pang-hu-9z4h.vercel.app/
```

Expected: HTML response (the Vue frontend).

- [ ] **Step 5: Commit any hotfixes if needed**
