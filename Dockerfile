# PangHu 一键部署镜像
# 多阶段构建:前端 vite build → 后端 esbuild bundle(与 Vercel 部署同路径)→ 轻量运行时
# 用法见 docker-compose.yml / README「快速开始」

# ---------- 阶段 1: 前端构建 ----------
FROM node:20-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
RUN npm run build

# ---------- 阶段 2: 后端打包 ----------
FROM node:20-alpine AS backend-build
WORKDIR /build/backend
# schema 先于 npm ci 就位(postinstall 会执行 prisma generate)
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci --no-audit --no-fund
COPY backend/ .
# prisma generate(生成 client) + esbuild 打包服务(与 vercel-build 一致)
RUN npx prisma generate && npm run build
# 同样打包 seed(可选 SEED_ON_START=1 时使用)
RUN npx esbuild src/seed/index.ts --bundle --platform=node --target=node20 \
    --format=cjs --outfile=/build/api/_seed.js --external:@prisma/client

# ---------- 阶段 3: 运行时 ----------
FROM node:20-alpine AS runtime
WORKDIR /app/backend

# 生产依赖(@prisma/client 引擎 + pg);postinstall 会执行 prisma generate,故先放 schema
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm install --omit=dev --no-audit --no-fund

# 服务 bundle 与 seed bundle
COPY --from=backend-build /build/api/_server.js ./api/_server.js
COPY --from=backend-build /build/api/_seed.js ./api/_seed.js

# 静态资源(公共头像等)与前端产物(Express 内置 SPA 托管,同源 /api)
COPY backend/public ./public
RUN mkdir -p uploads
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
