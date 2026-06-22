# PangHu 项目 Vercel 部署复盘与指南

## 项目概述

PangHu（哈吉咪养成计划）是一个猫咪养护应用，技术栈为：

- **后端**: Express + Prisma ORM + PostgreSQL (Supabase) + ZhipuAI
- **前端**: Vue 3 + Vite + Element Plus + Pinia
- **部署目标**: Vercel Serverless Functions（前后端同仓库部署）

## 仓库结构

```
PangHu/
├── api/                        # Vercel Serverless Function 入口
│   ├── [[...path]].js          # catch-all 路由入口
│   └── _server.js              # esbuild 打包后的后端 bundle（构建生成）
├── backend/                    # Express 后端源码
│   ├── prisma/schema.prisma    # 数据库 Schema
│   ├── src/
│   │   ├── server.ts           # Express 应用入口
│   │   ├── config/database.ts  # Prisma 客户端
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/upload.ts     # 文件上传（multer）
│   └── package.json
├── frontend/                   # Vue 3 前端
│   ├── src/api/index.ts        # axios 配置（baseURL）
│   ├── vite.config.ts          # Vite 配置（本地代理）
│   └── package.json
├── scripts/
│   └── vercel-postinstall.js   # Prisma Client 复制脚本
├── vercel.json                 # Vercel 部署配置
└── package.json                # 根 package.json（构建入口）
```

## 部署架构

```
用户请求
  ↓
Vercel CDN / Edge Network
  ↓
vercel.json rewrites 路由分发
  ├── /api/*     → api/[[...path]].js (Serverless Function)
  │                 ↓ lazy load
  │               api/_server.js (esbuild bundle)
  │                 ↓
  │               Express app → Prisma → Supabase PostgreSQL
  │
  ├── /uploads/* → 同上（Serverless Function 处理）
  ├── /cats/*    → 同上
  └── /*         → frontend/dist/index.html (静态 SPA)
```

---

## 部署流程（按步骤）

### 1. Vercel 项目初始化

```bash
# 安装 Vercel CLI
npm i -g vercel@latest

# 登录
vercel login

# 关联项目（确保关联到正确的项目）
vercel link --project pang-hu

# 验证 .vercel/project.json 中的 projectId 正确
cat .vercel/project.json
```

**踩坑记录**: 曾关联到错误项目 `cc-flow`，导致所有环境变量设置在了错误的项目上。部署前务必检查 `.vercel/project.json` 中的 `projectId` 和 `projectName`。

### 2. 根 package.json 配置

根 `package.json` 是 Vercel 构建的入口，需要配置三个关键脚本：

```json
{
  "scripts": {
    "vercel-build": "cd backend && npm run build",
    "postinstall": "node scripts/vercel-postinstall.js || true",
    "deploy": "NODE_TLS_REJECT_UNAUTHORIZED=0 vercel",
    "deploy:prod": "NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod"
  },
  "dependencies": {
    "@prisma/client": "^6.19.2",
    "@prisma/adapter-pg": "^6.19.2",
    "pg": "^8.16.0"
  }
}
```

**要点**:
- `vercel-build`: 触发后端 esbuild 打包，生成 `api/_server.js`
- `postinstall`: 执行 Prisma Client 生成和复制（Vercel 构建阶段执行）
- 根依赖需包含 `@prisma/client`、`pg` 等，因为 Serverless Function 运行在根级 `node_modules`

### 3. 后端 esbuild 打包配置

`backend/package.json` 中的 build 脚本：

```json
{
  "scripts": {
    "build": "mkdir -p ../api && NODE_TLS_REJECT_UNAUTHORIZED=0 prisma generate && esbuild src/server.ts --bundle --platform=node --target=node20 --format=cjs --outfile=../api/_server.js --external:@prisma/client --external:@prisma/adapter-pg --external:pg"
  }
}
```

**关键决策**:
- `--external` 标记 Prisma 和 pg 相关包不打入 bundle，运行时从 `node_modules` 加载（Prisma 的原生引擎需要如此）
- `--format=cjs` 因为 Vercel Serverless Function 使用 CommonJS
- `--platform=node --target=node20` 匹配 Vercel 的 Node.js 运行时

### 4. Prisma Schema 配置

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "darwin-arm64", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**要点**:
- `binaryTargets` 必须包含 `rhel-openssl-3.0.x`，Vercel 的运行时基于 RHEL
- 同时保留 `native` 和 `darwin-arm64` 用于本地开发

### 5. Prisma Client 复制脚本

`scripts/vercel-postinstall.js`：

```javascript
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const rootDir = path.join(__dirname, '..')
const schemaPath = path.join(rootDir, 'backend', 'prisma', 'schema.prisma')

// 生成 Prisma Client
execSync(
  `npx prisma generate --schema="${schemaPath}" --no-hints`,
  { stdio: 'inherit', cwd: rootDir }
)

// 将 backend/node_modules/.prisma 复制到根级 node_modules
const src = path.join(rootDir, 'backend', 'node_modules', '.prisma')
const dest = path.join(rootDir, 'node_modules', '.prisma')

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true })
  console.log('[postinstall] Copied .prisma/client to root node_modules')
}
```

**原因**: Prisma Client 生成在 `backend/node_modules/.prisma/client`，但 Serverless Function 从根目录加载 `@prisma/client`，需要复制到 `node_modules/.prisma/client`。

### 6. Vercel Serverless Function 入口

`api/[[...path]].js`：

```javascript
let _app = null

module.exports = async (req, res) => {
  // 快速健康检查（不加载整个 bundle）
  if (req.url === '/api/health') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      status: 'ok',
      env: {
        VERCEL: !!process.env.VERCEL,
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
      }
    }))
    return
  }

  try {
    if (!_app) {
      console.log('[entry] Loading _server.js bundle...')
      const mod = require('./_server.js')
      _app = mod.default || mod
      console.log('[entry] Bundle loaded, app type:', typeof _app)
    }
    return _app(req, res)
  } catch (err) {
    console.error('[entry] Fatal:', err.message, err.stack?.slice(0, 500))
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: err.message,
      code: err.code,
      stack: err.stack?.split('\n').slice(0, 5),
    }))
  }
}
```

**设计要点**:
- 懒加载：只在首次请求时加载 bundle，之后复用
- 独立健康检查：不需要加载整个 Express 应用就能响应
- 错误兜底：捕获 bundle 加载失败的情况

### 7. vercel.json 路由配置

```json
{
  "buildCommand": "npm run vercel-build && cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install && cd backend && npm install && cd ../frontend && npm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/uploads/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/cats/(.*)", "destination": "/api/[[...path]]" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**路由逻辑**:
- `/api/*` → Serverless Function
- `/uploads/*`、`/cats/*` → 同样路由到 Serverless Function（Express 处理）
- 其余所有路径 → 前端 SPA 的 `index.html`（客户端路由）

### 8. 后端代码适配

#### 8a. 信任 Vercel 代理（必需）

`backend/src/server.ts`：

```typescript
if (process.env.VERCEL) app.set('trust proxy', 1)
```

**原因**: Vercel 使用反向代理，`express-rate-limit` 需要读取 `X-Forwarded-For` 头来识别真实 IP。不加此设置会报 `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` 错误。

#### 8b. 上传目录适配

`backend/src/utils/upload.ts`：

```typescript
const isVercel = !!process.env.VERCEL
const baseUploadDir = isVercel ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads')
```

**原因**: Vercel 的函数运行时文件系统是只读的，只有 `/tmp` 可写。原代码使用 `process.cwd()` 下的 `uploads` 目录会导致 `mkdirSync` 崩溃。

#### 8c. Prisma 客户端简化

`backend/src/config/database.ts`：

```typescript
import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: undefined | PrismaClient
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const prisma = globalThis.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
export default prisma
```

**经验**: 初次尝试使用 `@prisma/adapter-pg`（PrismaPg 适配器）来直连数据库，但在 Vercel Serverless 环境下适配器未能正确激活。最终简化为标准 PrismaClient，配合 Supabase 的连接池模式。

#### 8d. 服务启动条件

`backend/src/server.ts` 尾部：

```typescript
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
    startReminderScheduler()
  })
}
```

**原因**: Vercel 环境下 Express 不需要 `app.listen()`，它由 Serverless Function handler 直接调用。`node-cron` 定时任务在 Serverless 环境下也不适用。

### 9. 环境变量配置

在 Vercel Dashboard 或 CLI 中配置：

```bash
# 必需变量
vercel env add DATABASE_URL          # Supabase 连接池 URL
vercel env add JWT_SECRET            # JWT 签名密钥
vercel env add ZHIPUAI_API_KEY       # 智谱 AI API Key

# 可选变量
vercel env add ZHIPUAI_MODEL         # 默认 glm-4-flash
vercel env add CORS_ORIGINS          # 允许的前端域名
```

**关键**: 设置环境变量时使用 `--value` 标志，避免 `echo` 管道引入尾部换行符：

```bash
# 错误方式（可能引入换行符）
echo "your-key" | vercel env add ZHIPUAI_API_KEY

# 正确方式
vercel env add ZHIPUAI_API_KEY --value "your-key"
```

### 10. 数据库连接字符串

Supabase 提供两种连接方式：

| 方式 | 地址格式 | 端口 | 用途 |
|------|----------|------|------|
| 直连 | `db.xxx.supabase.co` | 5432 | 本地开发、长连接 |
| 连接池 | `aws-1-xxx.pooler.supabase.com` | 6543 | Serverless / 短连接 |

**Vercel 部署必须使用连接池模式**，并添加 `?pgbouncer=true` 参数：

```
postgresql://postgres.xxx:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**原因**: Serverless Functions 频繁创建/销毁连接，直连会耗尽数据库连接数。PgBouncer 作为连接池管理复用连接。

### 11. 前端 API 地址

`frontend/src/api/index.ts`：

```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
})
```

Vercel 部署时，前端和后端同域，API 请求走 `/api/*` 路径，由 `vercel.json` rewrite 到 Serverless Function。不需要设置 `VITE_API_BASE_URL` 环境变量。

---

## 完整踩坑清单

### 1. 项目关联错误

| 症状 | 原因 | 解决 |
|------|------|------|
| 环境变量不生效 | `.vercel/project.json` 指向了 `cc-flow` 项目 | `vercel link --project pang-hu` 重新关联 |

### 2. 函数启动超时（API 504/超时）

| 症状 | 原因 | 解决 |
|------|------|------|
| curl 超时 exit 28 | `mkdirSync('/var/task/uploads/pets')` 在只读文件系统崩溃 | 上传目录改为 `/tmp/uploads` |

### 3. 数据库连接失败（P1001）

| 症状 | 原因 | 解决 |
|------|------|------|
| Can't reach database server | (a) 环境变量在错误项目 (b) 使用直连而非连接池 | 重新关联项目 + 使用 pooler URL + `?pgbouncer=true` |

### 4. 限流中间件报错

| 症状 | 原因 | 解决 |
|------|------|------|
| ERR_ERL_UNEXPECTED_X_FORWARDED_FOR | Vercel 反向代理发送 X-Forwarded-For，但 Express 未配置 trust proxy | `app.set('trust proxy', 1)` |

### 5. ZhipuAI API Key 格式错误

| 症状 | 原因 | 解决 |
|------|------|------|
| Invalid API key format | `echo` 管道设置环境变量时引入了尾部换行 | 使用 `vercel env add --value` 设置 |

### 6. 注册验证失败

| 症状 | 原因 | 解决 |
|------|------|------|
| 请求数据验证失败 | 用户名 2 个中文字符，验证规则 `min: 3` | 改为 `min: 2`，更新错误消息 |

### 7. TLS 证书错误

| 症状 | 原因 | 解决 |
|------|------|------|
| unable to get local issuer certificate | 本地网络环境（代理/VPN）SSL 证书不被信任 | `NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod` |

---

## 部署命令速查

```bash
# 日常部署
npm run deploy:prod

# 等同于
NODE_TLS_REJECT_UNAUTHORIZED=0 vercel --prod

# 查看环境变量
vercel env ls

# 查看部署日志
vercel logs [deployment-url]

# 查看运行时日志（通过 Vercel CLI）
vercel logs [deployment-url] --follow
```

## 经验总结

1. **Serverless 不等于传统服务器**: 文件系统只读、无持久进程、短生命周期。任何依赖本地文件写入或后台任务（cron）的代码都需要适配。

2. **Prisma 在 Serverless 下的关键步骤**: `binaryTargets` 必须包含 Vercel 的平台（`rhel-openssl-3.0.x`），生成产物必须复制到 Serverless Function 能找到的位置（根 `node_modules`）。

3. **数据库连接池是必需品**: Serverless 环境下每次请求可能创建新连接，不使用连接池会快速耗尽数据库连接数。Supabase 的 Transaction Mode（端口 6543）+ `pgbouncer=true` 是正确配置。

4. **环境变量是第一大坑**: 项目关联错误、值包含换行符、在错误的 Vercel 项目上配置——这类问题占了调试时间的很大比例。部署前务必用 `/api/health` 端点验证。

5. **esbuild bundle + external 是平衡点**: 把 Express 应用打包成单文件（快速加载），同时将 Prisma/pg 等需要原生二进制的包排除（运行时解析）。这个模式适合大多数 Express + Prisma 的 Vercel 部署场景。

6. **验证规则要考虑国际化**: 用户名最小长度 `min: 3` 对中文用户不友好（2 个汉字是常见需求）。验证规则应考虑目标用户群的实际使用习惯。
