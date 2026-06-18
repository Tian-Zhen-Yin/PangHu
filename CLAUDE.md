# PangHu / 哈吉咪养成计划

> **本 CLAUDE.md 自 2026-06-18 起生效**。之前的 `feature/agent-framework` mega-branch 不追溯本契约；后续所有新分支必须遵守。
>
> 配套：[docs/02-开发/PangHu-AI协作工作流设计.md](docs/02-开发/PangHu-AI协作工作流设计.md)

## 一句话定位

喵咪养成 + 陪玩推荐的全栈应用：Express + Prisma + Vue 3 + LLM Agent。

## Monorepo 结构

- `backend/` : Express + Prisma + Agent
  - `src/agent/`     : LLM Agent（Planner / Loop / Tools）
  - `src/services/`  : 业务服务层
  - `src/controllers/` + `src/routes/` : HTTP 入口
  - `prisma/`        : schema + migrations
  - `src/__tests__/` : vitest 测试（按层分目录：api / services / agent / middlewares / utils）
- `frontend/` : Vue 3 + Vite + Element Plus + Pinia
- `docs/`     : `01-产品/` `02-开发/` `03-设计/` `04-复盘/`

## 启动 / 测试 / 校验（Windows PowerShell）

```powershell
# 后端开发
cd backend ; npm run dev

# 前端开发
cd frontend ; npm run dev

# 后端单测
cd backend ; npm run test:unit

# 后端 API 测试
cd backend ; npm run test:api

# 前端 typecheck
cd frontend ; npm run typecheck

# DB 迁移
cd backend ; npm run db:migrate
```

## 编码约定

- 所有 public 函数有 type hint
- 业务进 `service`，`controller` 只做参数校验和组装
- 新增 / 修改函数必须配测试（vitest）
- 禁止 `console.log`；用 logger
- 密钥从 `process.env` 读，禁止硬编码
- 测试**新文件**优先用 `backend/src/__tests__/_setup.ts` 提供的全局默认值（环境变量等）；**已有 17 个 beforeEach/beforeAll 文件不强制迁移**

## 🔒 禁止改动清单（违反 = 必须先获 supervisor 批准）

> **优先级规则**：当前活跃分支的 Branch Contracts 若**显式包含**禁区路径，则视为豁免（例：`feat/play-data` 可改 `prisma/schema.prisma`）。除此之外一律拦截。

- `backend/prisma/schema.prisma`        # 数据契约，跨分支必经协商
- `backend/prisma/migrations/**`        # migration 同上
- `backend/src/routes/index.ts`         # 路由总入口
- `backend/src/agent/index.ts`          # Agent 总入口
- `backend/src/config/featureFlags.ts`  # 特性开关
- `vitest.*.config.ts`                  # 测试配置（项目根）
- `.claude/**`                          # Hook 配置归 master 管
- `frontend/auto-imports.d.ts`          # 自动生成
- `frontend/components.d.ts`            # 自动生成

## Branch Contracts（当前 sprint）

> **当前无活跃 sprint**——`feature/agent-framework` mega-branch 处于收尾阶段，按"接受现状 → 整体合 master"路线处理（详见设计文档 §11 附录 B.1）。
>
> **下一个 feature 启动前**，在本节追加该 feature 的 Branch Contracts，格式参考下方注释模板。

<!--
模板示例（启动新 feature 时取消注释并填实）：

- feat/<name>-data         : 编辑 backend/prisma/schema.prisma + backend/prisma/migrations/**
- feat/<name>-services     : 编辑 backend/src/services/<name>.service.ts
                              + backend/src/__tests__/services/<name>.service.test.ts
                            只读：backend/prisma/schema.prisma, backend/src/types/**
- feat/<name>-agent-tools  : 编辑 backend/src/agent/tools/<name>.tool.ts
                              + backend/src/__tests__/agent/tools/<name>.tool.test.ts
                            只读：backend/src/services/**, backend/prisma/schema.prisma
- feat/<name>-api          : 编辑 backend/src/controllers/<name>.controller.ts
                              + backend/src/routes/<name>.routes.ts
                              + backend/src/__tests__/api/<name>.api.test.ts
                            只读：backend/src/services/**
- feat/<name>-frontend     : 编辑 frontend/src/views/<name>/**
                              + frontend/src/components/<name>/**
                              + frontend/src/stores/<name>.ts
                            只读：backend 类型快照 / OpenAPI（合并 tools+api 后冻结）

合并顺序：data → services → (agent-tools ∥ api) → frontend
tools/api 合并完后由 backend 一次性产出 TS 类型快照供 frontend 消费。
-->

> **读 ≠ 写**：每个分支允许**只读引用**任何路径（包括禁区，用于理解类型/契约）；上面列的是**允许编辑**的路径。

## Windows 平台注意（给 Claude 看）

- 平台：**Windows + PowerShell**（不是 bash / zsh）
- 命令分隔统一用 `;`（PS 5.1 / 7 都支持）
- `&&` / `||` 是 PS 7.0+ 才引入的管道链运算符；为兼容 PS 5.1，**约定不用**
- 文件路径在脚本里用正斜杠或 `path.join`
- 跑 `npm` 命令前先 `cd backend` 或 `cd frontend`
- 路径里有空格要加引号（PowerShell 比 bash 更挑剔）

## LLM 工作约定

- **Plan-then-act**：复杂任务先输出方案（涉及哪些文件、新增什么、风险点），用户确认后再动手
- **不主动加 npm 依赖**：必须先报告并获批准
- **不主动改 Prisma schema**：必须先报告并获批准（除非分支契约已显式允许）
- **测试是必须的**：新增功能必须配 vitest 单测；改 service 不更新测试视为越界

## 复盘节奏

每个 feature 收尾时在 `docs/04-复盘/<feature>-retro.md` 写 RETRO，模板见设计文档 §7。Action Items 反复出现 ≥2 次的，反哺回本 CLAUDE.md。
