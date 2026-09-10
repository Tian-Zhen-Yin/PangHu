# 哈吉咪养成计划 - Code Wiki

> 项目名称：哈吉咪养成计划 (PangHu)
> 描述：猫咪健康管理与AI智能顾问平台
> 最后更新：2026-06-11

---

## 1. 项目概述

### 1.1 项目简介

哈吉咪养成计划是一款面向猫主人的全方位猫咪健康管理与智能顾问平台，提供猫咪档案管理、体重追踪、疫苗记录、AI健康咨询、成长时间线等功能。

### 1.2 技术栈

**前端**
- Vue 3.5 + TypeScript
- Vite 7 (构建工具)
- Pinia 3 (状态管理)
- Vue Router 4 (路由)
- Element Plus 2 (UI组件库)
- ECharts 6 (图表可视化)
- Axios (HTTP客户端)
- Tailwind CSS (样式)

**后端**
- Node.js + Express 4
- TypeScript 5
- Prisma 6 (ORM)
- PostgreSQL + pgvector (数据库/向量检索)
- JWT (认证)
- bcryptjs (密码加密)
- node-cron (定时任务)

**外部服务**
- 智谱AI (glm-4-flash模型) - AI对话与RAG知识检索

---

## 2. 项目架构

```
PangHu/
├── backend/                    # 后端服务
│   ├── prisma/
│   │   └── schema.prisma       # 数据库模型定义
│   ├── public/                 # 静态资源
│   │   └── cats/               # 猫咪头像
│   ├── src/
│   │   ├── server.ts          # 应用入口
│   │   ├── config/             # 配置
│   │   ├── controllers/        # 控制器层
│   │   ├── routes/            # 路由定义
│   │   ├── services/         # 业务逻辑层
│   │   ├── middlewares/      # 中间件
│   │   ├── jobs/             # 定时任务
│   │   ├── seed/             # 数据初始化
│   │   ├── eval/             # 评估脚本
│   │   ├── utils/            # 工具函数
│   │   └── types/           # 类型定义
│   └── package.json
│
├── frontend/                   # 前端应用
│   ├── public/                # 静态资源
│   ├── src/
│   │   ├── main.ts           # 应用入口
│   │   ├── App.vue           # 根组件
│   │   ├── api/              # API接口封装
│   │   ├── assets/           # 资源文件
│   │   ├── components/       # Vue组件
│   │   ├── composables/      # 组合式函数
│   │   ├── layouts/          # 布局组件
│   │   ├── modules/          # 功能模块
│   │   ├── pages/            # 页面组件
│   │   ├── router/           # 路由配置
│   │   ├── stores/           # Pinia状态
│   │   ├── styles/           # 样式文件
│   │   ├── types/            # 类型定义
│   │   ├── utils/            # 工具函数
│   │   └── views/           # 页面视图
│   └── package.json
│
├── docs/                       # 项目文档
├── scripts/                    # 工具脚本
└── package.json               # 根包管理
```

---

## 3. 数据库模型

### 3.1 核心实体关系

```
User (用户)
├── Cat (猫咪档案) → PetRecord (成长记录)
│                      └── VaccineRecord (疫苗记录)
├── Conversation (AI对话)
│   └── Message (消息)
├── UserPlan (用户计划)
└── Notification (通知)
    └── UserNotificationPreference (通知偏好)

Stage (成长阶段)
├── Milestone (里程碑)
├── Task (任务)
└── Vaccine (疫苗接种表)

GuideCategory (指南分类)
└── Guide (知识指南)
    └── GuideChunk (知识块 - RAG向量化)

WeightStandard (体重健康标准库)
```

### 3.2 主要数据模型

#### User (用户)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| email | String | 邮箱(唯一) |
| username | String | 用户名(唯一) |
| password | String | 加密密码 |
| memberType | String | 会员类型(free/premium) |
| memberExpiredAt | DateTime | 会员过期时间 |

#### Cat (猫咪档案)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| userId | String | 所属用户 |
| name | String | 猫咪名字 |
| breed | String | 品种 |
| gender | String | 性别(male/female/unknown) |
| birthDate | DateTime | 出生日期 |
| weight | Float | 当前体重(kg) |
| isNeutered | Boolean | 是否绝育 |
| adoptStatus | String | 领养状态 |
| weightGoalTarget | Float | 目标体重 |
| weightGoalDate | DateTime | 目标日期 |

#### GuideChunk (知识块 - RAG)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| guideId | String | 所属指南 |
| content | String | 切分后的内容 |
| chunkIndex | Int | 块索引 |
| category | String | 分类(如:健康医疗) |
| ageStage | String | 年龄阶段(幼猫期/成年期等) |
| headings | String | 标题路径(JSON) |
| embedding | Vector(2048) | 向量数据 |

---

## 4. 后端模块

### 4.1 目录结构

```
backend/src/
├── server.ts              # Express应用入口
├── config/
│   └── database.ts        # Prisma客户端配置
├── controllers/           # HTTP请求处理
│   ├── auth.controller.ts
│   ├── cat.controller.ts
│   ├── cats.controller.ts
│   ├── chat.controller.ts
│   ├── guide.controller.ts
│   ├── notification.controller.ts
│   ├── pet.controller.ts
│   ├── plan.controller.ts
│   ├── proactive.controller.ts
│   ├── template.controller.ts
│   └── weightStandard.controller.ts
├── routes/               # API路由定义
│   ├── index.ts          # 路由聚合导出
│   ├── auth.routes.ts
│   ├── cat.routes.ts
│   ├── cats.routes.ts
│   ├── chat.routes.ts
│   ├── guide.routes.ts
│   ├── knowledge.routes.ts
│   ├── notifications.routes.ts
│   ├── pet.routes.ts
│   ├── plan.routes.ts
│   ├── proactive.routes.ts
│   ├── template.routes.ts
│   ├── vaccine.routes.ts
│   └── weightStandards.routes.ts
├── services/             # 业务逻辑
│   ├── ai.service.ts     # 智谱AI集成
│   ├── cat.service.ts
│   ├── chunker.service.ts # 文档切分
│   ├── embedding.service.ts # 向量化
│   ├── knowledge.service.ts
│   ├── notification.service.ts
│   ├── rag.service.ts    # RAG检索
│   ├── vaccine.service.ts
│   └── weightStandard.service.ts
├── middlewares/           # 中间件
│   ├── auth.ts           # JWT认证
│   └── error.ts         # 错误处理
├── jobs/                 # 定时任务
│   └── reminderChecker.ts
├── seed/                 # 数据初始化
├── eval/                 # 评估脚本
├── utils/                # 工具函数
│   ├── jwt.ts           # JWT工具
│   ├── password.ts      # 密码加密
│   ├── response.ts      # 统一响应
│   ├── stream.ts        # SSE流式响应
│   └── upload.ts        # 文件上传
└── types/               # 类型声明
    └── express.d.ts
```

### 4.2 API路由

| 前缀 | 路由文件 | 功能 |
|------|---------|------|
| /api/auth | auth.routes | 用户认证 |
| /api/cats | cat.routes | 猫咪成长阶段 |
| /api/my-cats | cats.routes | 用户猫咪管理 |
| /api/vaccines | vaccine.routes | 疫苗接种表 |
| /api/guides | guide.routes | 知识指南 |
| /api/templates | template.routes | 计划模板 |
| /api/plans | plan.routes | 用户计划 |
| /api/pets | pet.routes | 宠物记录 |
| /api/chat | chat.routes | AI对话 |
| /api/knowledge | knowledge.routes | RAG知识库 |
| /api/weight-standards | weightStandards.routes | 体重标准 |
| /api/notifications | notifications.routes | 通知 |
| /api/proactive | proactive.routes | 主动建议 |

### 4.3 核心服务

#### ai.service.ts - AI服务

```typescript
// 核心功能
- sendMessage(userMessage, conversationHistory, catContext)
  // 发送消息到智谱AI，非流式

- sendMessageStream(userMessage, conversationHistory, res, catContext)
  // 流式发送消息，SSE响应

- buildMessages(history, knowledgeContext, useRAG, apiKey, catContext)
  // 构建消息列表，整合系统提示词、猫咪上下文、知识库片段

- buildCatContextPrompt(catContext: CatContext): string
  // 构建猫咪档案提示词

- generateProactiveAdvice(catId, userId, types)
  // 生成主动健康建议(体重/疫苗/年龄/综合)

- checkAvailability(): boolean
  // 检查AI服务是否可用
```

**CatContext 接口**
```typescript
interface CatContext {
  id: string
  name: string
  breed?: string | null
  gender: string
  ageMonths: number
  ageFormatted: string
  weight?: number | null
  isNeutered: boolean
  allergies?: string | null
  diseases?: string | null
  recentVaccines: Array<{ name: string; date: string; nextDueDate?: string | null }>
  lastRecord?: { date: string; weight?: number | null; notes?: string | null } | null
}
```

#### rag.service.ts - RAG知识检索

```typescript
// 核心功能
- ingestGuide(guideId, apiKey, options?)
  // 单个指南入库：切分→向量化→存储

- ingestAllGuides(apiKey)
  // 批量入库所有指南

- retrieveKnowledge(query, apiKey, options?)
  // 知识检索：向量化查询→向量相似度搜索→返回相关片段

- getKnowledgeStatus()
  // 获取知识库状态
```

#### chunker.service.ts - 文档切分

```typescript
// 核心功能
- chunkMarkdown(content, options?)
  // 按Markdown标题结构切分文档

- extractGuideMetadata(content)
  // 提取指南元数据(分类、年龄阶段)
```

#### embedding.service.ts - 向量化

```typescript
// 核心功能
- getEmbeddings(texts, apiKey)
  // 调用智谱AI获取文本向量

- findMostSimilar(queryVector, chunks, topK)
  // 计算余弦相似度找最相似片段

- serializeVector/deserializeVector
  // 向量序列化/反序列化
```

#### weightStandard.service.ts - 体重标准

```typescript
// 核心功能
- getWeightStandards(breed?, gender?, ageMonth?)
  // 获取体重标准

- analyzeWeight(catId, userId)
  // 分析猫咪体重状态(normal/overweight/thin)
```

### 4.4 中间件

#### auth.ts - 认证中间件

```typescript
- authMiddleware(req, res, next)
  // 强制认证，无token返回401

- optionalAuth(req, res, next)
  // 可选认证，有token则解析，无token继续
```

### 4.5 定时任务

#### reminderChecker.ts

```typescript
- startReminderScheduler()
  // 启动定时检查器，每小时检查一次通知
```

---

## 5. 前端模块

### 5.1 目录结构

```
frontend/src/
├── main.ts                 # 应用入口
├── App.vue                 # 根组件
├── api/                    # API封装
│   ├── index.ts           # API实例
│   ├── auth.ts            # 认证接口
│   ├── cat.ts             # 猫咪阶段接口
│   ├── chat.ts            # AI对话接口
│   ├── guide.ts           # 指南接口
│   ├── notification.ts
│   ├── pet.ts
│   ├── plan.ts
│   ├── proactive.ts
│   ├── template.ts
│   ├── vaccine.ts
│   ├── weightStandard.ts
│   └── myCat.ts           # 用户猫咪接口
├── assets/
│   ├── cats/              # 猫咪头像
│   ├── generated_images/  # 吉祥物表情
│   ├── mascot/            # 吉祥物状态图
│   └── styles/            # 全局样式
├── components/
│   ├── cat/               # 猫咪相关组件
│   │   ├── AIHealthAdvice.vue
│   │   ├── AiHealthCard.vue
│   │   ├── CatInfoComparisonTable.vue
│   │   ├── CatMultiSelector.vue
│   │   ├── CatSelector.vue
│   │   ├── HealthComparisonCards.vue
│   │   ├── WeightTrend.vue
│   │   └── WeightTrendComparison.vue
│   ├── charts/            # 图表组件
│   │   ├── MiniSparkline.vue
│   │   └── WeightGauge.vue
│   ├── chat/              # AI聊天组件
│   │   ├── ChatInput.vue
│   │   ├── ChatMessage.vue
│   │   └── ConversationList.vue
│   ├── common/            # 通用组件
│   │   ├── AppFooter.vue
│   │   ├── AppHeader.vue
│   │   ├── Breadcrumb.vue
│   │   ├── EmptyState.vue
│   │   ├── ErrorHandler.vue
│   │   ├── ImageLoader.vue
│   │   ├── LazyImage.vue
│   │   ├── LoadingSpinner.vue
│   │   ├── MascotLoading.vue
│   │   ├── NotificationCenter.vue
│   │   ├── ReminderExamples.vue
│   │   ├── ScenarioReminder.vue
│   │   ├── SearchBar.vue
│   │   ├── SkeletonLoader.vue
│   │   ├── Toast.vue
│   │   ├── TrendChart.vue
│   │   └── ...
│   ├── growth/            # 成长记录组件
│   │   ├── HorizontalStageTimeline.vue
│   │   ├── MilestoneCard.vue
│   │   ├── SegmentedTabs.vue
│   │   └── StageTimeline.vue
│   ├── guide/             # 指南组件
│   │   └── CategoryIcons.vue
│   ├── guides/            # 指南列表
│   │   └── GuideOverview.vue
│   ├── home/              # 首页组件
│   │   └── RecentRecordGroup.vue
│   ├── mascot/            # 吉祥物组件
│   │   ├── ActionGrid.vue
│   │   ├── HealthAdviceCard.vue
│   │   ├── MascotCharacter.vue
│   │   └── MascotProvider.vue
│   ├── record/            # 记录组件
│   │   ├── RecordTypeBadge.vue
│   │   ├── WeightChangeIndicator.vue
│   │   └── WeightSparkline.vue
│   └── shared/            # 共享组件
│       └── SectionHeader.vue
├── composables/            # 组合式函数
│   ├── useBreakpoints.ts
│   ├── useChartColors.ts
│   ├── useMember.ts
│   ├── useTheme.ts
│   └── useToast.ts
├── layouts/               # 布局组件
│   ├── AppShell.vue
│   ├── DefaultLayout.vue
│   ├── DesktopLayout.vue
│   ├── MobileLayout.vue
│   └── components/
│       ├── AppHeader.vue
│       ├── AppSidebar.vue
│       └── AppTabbar.vue
├── modules/               # 功能模块
│   └── dashboard/
│       ├── components/
│       │   ├── CatsOverview.vue
│       │   ├── DailyQuote.vue
│       │   ├── QuickActions.vue
│       │   ├── RecentRecords.vue
│       │   ├── RemindersCard.vue
│       │   ├── StatusPill.vue
│       │   └── TimelineItem.vue
│       ├── pages/
│       │   └── DashboardPage.vue
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           ├── formatters.ts
│           └── recordHelpers.ts
├── pages/                 # 页面组件(TSX)
│   └── CatConsultation.tsx
├── router/
│   └── index.ts          # 路由配置
├── stores/               # Pinia状态管理
│   ├── auth.ts           # 认证状态
│   ├── cat.ts            # 猫咪阶段状态
│   ├── chat.ts           # 对话状态
│   ├── guide.ts          # 指南状态
│   ├── myCat.ts          # 用户猫咪状态
│   ├── notification.ts
│   ├── pet.ts
│   ├── plan.ts
│   └── template.ts
├── styles/               # Tailwind样式
│   ├── color.css
│   ├── radius.css
│   ├── shadow.css
│   ├── spacing.css
│   ├── tokens.css
│   ├── transitions.css
│   └── typography.css
├── types/               # TypeScript类型
│   ├── cat.ts
│   ├── chat.ts
│   ├── common.ts
│   ├── guide.ts
│   ├── notification.ts
│   ├── proactive.ts
│   └── weight.ts
├── utils/               # 工具函数
│   ├── errorHandler.ts  # 全局错误处理
│   ├── format.ts        # 格式化工具
│   ├── markdown.ts      # Markdown渲染
│   └── pwa.ts           # PWA配置
└── views/              # 页面视图
    ├── AIChat/index.vue
    ├── About/index.vue
    ├── Auth/
    │   ├── Login.vue
    │   └── Register.vue
    ├── Guides/
    │   ├── Detail.vue
    │   └── index.vue
    ├── Home/index.vue
    ├── MyCats/
    │   ├── Compare.vue
    │   ├── Detail.vue
    │   ├── Form.vue
    │   ├── Vaccines.vue
    │   └── index.vue
    ├── Search/index.vue
    ├── Templates/
    │   ├── Detail.vue
    │   └── index.vue
    ├── Timeline/
    │   ├── GrowthRecords.vue
    │   ├── OverviewTab.vue
    │   ├── TasksTab.vue
    │   ├── TimelineLayout.vue
    │   ├── VaccinesTab.vue
    │   ├── composables/
    │   │   ├── sectionIcons.ts
    │   │   └── useTimelineState.ts
    │   └── index.vue
    └── User/
        └── Profile.vue
```

### 5.2 路由结构

| 路径 | 页面 | 说明 |
|------|------|------|
| / | DashboardPage | 首页仪表盘 |
| /home | Home | 关于我们 |
| /timeline | TimelineLayout | 养成时间线 |
| /timeline/overview | OverviewTab | 概览 |
| /timeline/tasks | TasksTab | 任务清单 |
| /timeline/vaccines | VaccinesTab | 疫苗接种 |
| /timeline/growth | GrowthRecords | 成长记录 |
| /ai-chat | AIChat | AI医师咨询 |
| /my-cats | MyCats | 我的猫咪列表 |
| /my-cats/new | Form | 添加猫咪 |
| /my-cats/:id | Detail | 猫咪详情 |
| /my-cats/:id/edit | Form | 编辑猫咪 |
| /my-cats/:id/vaccines | Vaccines | 疫苗记录 |
| /my-cats/compare | Compare | 多猫对比 |
| /guides | Guides | 知识指南列表 |
| /guides/:id | Detail | 指南详情 |
| /templates | Templates | 计划模板列表 |
| /templates/:id | Detail | 模板详情 |
| /search | Search | 搜索页 |
| /profile | Profile | 个人中心 |
| /about | About | 关于 |
| /login | Login | 登录 |
| /register | Register | 注册 |

### 5.3 状态管理 (Pinia Stores)

#### auth.ts - 认证状态
```typescript
- user: User | null
- token: string | null
- isAuthenticated: boolean
- initAuth() // 从localStorage恢复登录状态
- login(credentials)
- register(data)
- logout()
```

#### myCat.ts - 用户猫咪状态
```typescript
- cats: Cat[]
- currentCat: Cat | null
- loading: boolean
- fetchCats()
- fetchCatById(id)
- createCat(data)
- updateCat(id, data)
- deleteCat(id)
```

#### chat.ts - AI对话状态
```typescript
- conversations: Conversation[]
- currentConversation: Conversation | null
- messages: Message[]
- loading: boolean
- fetchConversations()
- fetchMessages(conversationId)
- sendMessage(content, catId?)
- createConversation(catId?)
```

#### cat.ts - 猫咪阶段状态
```typescript
- stages: Stage[]
- loading: boolean
- fetchStages()
- sortedStages: Stage[] // 按order排序
```

---

## 6. 依赖关系

### 6.1 前端依赖

```
vue
├── vue-router
├── pinia
├── axios
├── element-plus
│   └── @element-plus/icons-vue
├── echarts
├── marked (Markdown渲染)
├── highlight.js
└── vue-markdown-render

开发依赖:
├── vite
├── @vitejs/plugin-vue
├── typescript
├── tailwindcss
├── autoprefixer
├── postcss
├── vite-plugin-pwa
├── unplugin-auto-import
├── unplugin-vue-components
└── vue-tsc
```

### 6.2 后端依赖

```
express
├── cors
├── helmet (安全头)
├── express-rate-limit (限流)
├── express-validator (输入验证)
├── jsonwebtoken (JWT)
├── bcryptjs (密码加密)
├── multer (文件上传)
├── node-cron (定时任务)
├── node-fetch
├── zhipuai (智谱AI SDK)
└── pg (PostgreSQL驱动)

开发依赖:
├── typescript
├── ts-node
├── nodemon (热重载)
├── prisma
├── @prisma/client
└── esbuild (打包)
```

---

## 7. 项目运行

### 7.1 环境要求

- Node.js 18+
- PostgreSQL 15+ (生产环境)
- npm 或 yarn

### 7.2 后端启动

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写必要的环境变量:
# - DATABASE_URL: PostgreSQL连接字符串
# - JWT_SECRET: JWT签名密钥
# - ZHIPUAI_API_KEY: 智谱AI API密钥
# - PORT: 服务端口(默认3000)

# 生成Prisma客户端
npm run db:generate

# 推送数据库 schema
npm run db:push

# 初始化种子数据(可选)
npm run db:seed

# 开发模式启动
npm run dev

# 生产构建
npm run build
```

### 7.3 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.production .env
# 或创建 .env.development

# 开发模式启动
npm run dev

# 类型检查
npm run typecheck

# 生产构建
npm run build
```

### 7.4 环境变量

**后端 (.env)**
```bash
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/panghu?schema=public"

# 认证
JWT_SECRET="your-secret-key"

# AI服务
ZHIPUAI_API_KEY="your-api-key"
ZHIPUAI_MODEL="glm-4-flash"

# CORS
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# 端口
PORT=3000
```

**前端 (.env)**
```bash
VITE_API_BASE_URL="http://localhost:3000/api"
```

---

## 8. 主要功能模块

### 8.1 猫咪档案管理
- 创建/编辑/删除猫咪档案
- 记录品种、性别、出生日期、体重等信息
- 领养状态追踪
- 多猫管理

### 8.2 体重追踪
- 记录体重数据
- 体重趋势图表展示
- 与品种标准对比
- 目标体重设定与追踪

### 8.3 疫苗管理
- 疫苗接种记录
- 下次接种提醒
- 疫苗到期通知

### 8.4 AI健康顾问
- 基于RAG的知识检索
- 个性化猫咪上下文
- 流式对话响应
- 紧急情况判断与就医建议

### 8.5 成长时间线
- 成长阶段展示
- 里程碑追踪
- 任务清单管理
- 成长记录照片

### 8.6 知识指南
- 分类浏览
- 全文搜索
- Markdown渲染
- 年龄阶段筛选

---

## 9. API接口

### 9.1 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |

### 9.2 猫咪接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/my-cats | 获取用户猫咪列表 |
| POST | /api/my-cats | 创建猫咪档案 |
| GET | /api/my-cats/:id | 获取猫咪详情 |
| PUT | /api/my-cats/:id | 更新猫咪档案 |
| DELETE | /api/my-cats/:id | 删除猫咪 |
| GET | /api/my-cats/:id/weight-history | 获取体重历史 |

### 9.3 AI对话接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/chat/conversations | 获取对话列表 |
| POST | /api/chat/conversations | 创建新对话 |
| GET | /api/chat/conversations/:id | 获取对话消息 |
| POST | /api/chat/stream | 流式发送消息 |
| DELETE | /api/chat/conversations/:id | 删除对话 |

### 9.4 RAG知识接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/knowledge/ingest | 入库单个指南 |
| POST | /api/knowledge/ingest-all | 批量入库所有指南 |
| GET | /api/knowledge/retrieve | 检索知识 |
| GET | /api/knowledge/status | 获取知识库状态 |

---

## 10. 部署

### 10.1 Vercel部署

项目支持Vercel Serverless部署:

**后端 (api/)**
- 使用Vercel Serverless Functions
- 配合PostgreSQL数据库

**前端 (frontend/)**
- 静态部署到Vercel
- 环境变量配置 `VITE_API_BASE_URL`

### 10.2 目录结构

```
/
├── api/                    # 后端Serverless函数
│   └── _server.js         # 编译后的后端代码
├── frontend/               # 前端静态文件
│   └── dist/              # 构建输出
└── vercel.json            # Vercel配置
```

---

## 11. 相关文档

- [产品手册](../docs/01-产品/产品手册.md)
- [PRD](../docs/01-产品/PRD.md)
- [技术架构](../docs/02-开发/技术架构.md)
- [API文档](../docs/02-开发/API文档.md)
- [数据模型](../docs/02-开发/数据模型.md)
- [RAG模块设计](../docs/02-开发/RAG模块设计.md)
- [部署指南](../docs/02-开发/部署指南.md)
- [UI设计规范](../docs/03-设计/UI设计规范.md)
- [品牌视觉语言手册](../docs/03-设计/品牌视觉语言手册.md)

---

_Code Wiki - 最后更新：2026-06-11_
