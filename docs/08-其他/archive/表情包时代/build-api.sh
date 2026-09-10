#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo "📦 Bundling backend for Vercel..."

cd backend
npx prisma generate --no-hints 2>/dev/null || true

npx esbuild src/server.ts \
  --bundle \
  --platform=node \
  --target=node20 \
  --format=cjs \
  --outfile=../api/server.js \
  --external:@prisma/client \
  --external:@prisma/adapter-pg \
  --external:pg

echo "✅ Bundle created at api/server.js"
