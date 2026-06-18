# AI Agent 系统设计

> **版本:** V3.0 (Agent 框架)
> **更新时间:** 2026-06-14
> **功能状态:** 🚧 开发中

本文档描述 AI Agent 智能顾问系统的架构设计与技术方案。

---

## 📋 功能概述

AI Agent 系统是基于 ReAct（Reasoning + Acting）模式的智能助手，相比 V2.0 RAG 系统，具备以下核心能力提升：

| 能力 | V2.0 RAG | V3.0 Agent |
|------|-----------|------------|
| 意图理解 | 关键词匹配 | 意图分类 + 实体提取 |
| 工具调用 | 单一检索 | 多工具编排执行 |
| 数据融合 | 上下文注入 | 结构化工具输出 |
| 响应质量 | 通用建议 | 个性化猫咪档案建议 |
| 透明度 | 黑盒输出 | 可见的工具调用过程 |

### 核心能力

- **智能意图分类**：自动识别问题类型（问候、猫档案查询、健康咨询、知识问答等）
- **多工具编排**：根据问题动态选择并调用多个工具
- **结构化数据输出**：工具执行结果以结构化卡片形式呈现
- **流式响应**：实时展示 Agent 思考过程与工具调用状态
- **引用溯源**：结合知识库 RAG 提供可溯源的专业建议

---

## 🏗️ 系统架构

### 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                        前端层 (Vue 3 + Pinia)            │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │ AIChat     │  │ ChatStore  │  │ ChatMessage     │  │
│  │ (主页面)   │  │ (状态管理)  │  │ (Agent消息卡片) │  │
│  └────────────┘  └────────────┘  └────────────────┘  │
└────────────────────────────┬─────────────────────────────┘
                            │ SSE (meta / tool / content / done)
                            ↓
┌──────────────────────────────────────────────────────────┐
│                     后端层 (Express + TypeScript)         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              CatAgent.handleMessage()              │  │
│  │                                                     │  │
│  │  ┌────────────┐                                    │  │
│  │  │  Router     │ 意图分类                          │  │
│  │  │ (AgentRouter)                                    │  │
│  │  └─────┬──────┘                                    │  │
│  │        ↓                                           │  │
│  │  ┌────────────┐                                    │  │
│  │  │  Planner    │ 工具规划                          │  │
│  │  │ (AgentPlanner)                                  │  │
│  │  └─────┬──────┘                                    │  │
│  │        ↓                                           │  │
│  │  ┌────────────┐                                    │  │
│  │  │  Executor  │ 工具执行                          │  │
│  │  │ (AgentExecutor)                                 │  │
│  │  └─────┬──────┘                                    │  │
│  │        ↓                                           │  │
│  │  ┌────────────┐                                    │  │
│  │  │  Reporter  │ 报告生成                          │  │
│  │  │ (AgentReporter)                                  │  │
│  │  └─────┬──────┘                                    │  │
│  └────────┼────────────────────────────────────────────┘  │
│           ↓                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │              chat.controller.ts                    │  │
│  │         (SSE 流式输出: meta/tool/content/done)   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│                        工具层                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐  │
│  │ get_cat_info│ │check_health│ │ check_vaccine      │  │
│  └────────────┘ └────────────┘ └────────────────────┘  │
│  ┌────────────┐ ┌────────────┐                        │
│  │get_weight_ │ │ rag_search  │                        │
│  │   trend    │ │ (知识库检索) │                        │
│  └────────────┘ └────────────┘                        │
└──────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────┐
│                       数据层                             │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────┐  │
│  │ Prisma     │ │ 智谱 AI   │ │ 知识库向量检索      │  │
│  │ (猫咪数据)  │ │ GLM-4    │ │ (RAG)              │  │
│  └────────────┘ └────────────┘ └────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. AgentRouter（意图分类）

**职责：** 对用户输入进行意图分类，决定后续处理流程。

**输入：** 用户消息 + 对话历史

**输出：** IntentType 枚举值

```typescript
// 路径: backend/src/agent/core/AgentRouter.ts

type IntentType =
  | 'greeting'        // 问候语
  | 'cat_info_query' // 猫档案查询
  | 'health_consultation' // 健康咨询
  | 'general_knowledge'  // 通用知识
  | 'mixed'           // 混合意图
  | 'unknown'         // 未知
```

**分类策略：** 基于关键词 + 上下文的混合匹配

#### 2. AgentPlanner（工具规划）

**职责：** 根据意图类型生成工具调用计划。

**输入：** IntentType + 用户消息 + AgentState

**输出：** PlanStep[] 工具调用计划

```typescript
interface PlanStep {
  toolName: string      // 工具名称
  reason: string        // 调用原因
  parameters: Record<string, any>  // 工具参数
}
```

**规划策略：**

| Intent | 调用的工具组合 |
|--------|---------------|
| `cat_info_query` | get_cat_info |
| `health_consultation` | get_cat_info + check_health + check_vaccine |
| `mixed`（含体重关键词） | get_cat_info + get_weight_trend + check_health |
| `general_knowledge` | rag_search (+ 可选 cat_info） |
| `greeting` | 无（直接回复） |

#### 3. AgentExecutor（工具执行）

**职责：** 按计划顺序/并行执行工具调用。

**输入：** PlanStep[] + AgentContext

**输出：** ToolResult[]

```typescript
interface ToolResult {
  toolName: string
  success: boolean
  output?: any      // 工具返回的原始结构化数据
  error?: string
  reason?: string
}
```

**执行策略：** 优先读取数据类工具（如 get_cat_info），然后执行分析类工具（如 check_health）。

#### 4. AgentReporter（报告生成）

**职责：** 将工具执行结果汇总为面向用户的自然语言回答。

**输入：** AgentState + ToolResult[]

**输出：** 自然语言报告字符串

---

## 🔧 工具设计

### 工具清单

| 工具名称 | 功能描述 | 权限 | 输出关键字段 |
|---------|---------|------|------------|
| `get_cat_info` | 获取猫咪档案（品种、年龄、体重、绝育状态等） | 只读 | `output.cat` |
| `get_weight_trend` | 分析体重变化趋势 | 只读 | `output.analysis` |
| `check_health` | 基于体重标准评估健康状况 | 只读 | `output.weightAnalysis` |
| `check_vaccine` | 检查疫苗接种状态与下次到期 | 只读 | `output.needsAttention` |
| `rag_search` | 知识库向量检索 | 只读 | `output.guideTitles` |

### 工具接口规范

每个工具遵循统一的 Zod Schema + Tool 接口模式：

```typescript
interface Tool<Input, Output> {
  name: string              // 工具唯一标识（snake_case）
  description: string       // 工具描述（Agent 可读）
  schema: z.ZodType<Input>  // 输入参数 Schema
  permissions: ('read' | 'write')[]
  call: (input: Input, ctx: AgentContext) => Promise<Output>
}
```

### 关键工具输出示例

#### get_cat_info

```json
{
  "success": true,
  "cat": {
    "id": "cat_xxx",
    "name": "奶糖",
    "breed": "英短",
    "gender": "公猫",
    "age": "2岁3个月",
    "weight": "4.52 kg",
    "isNeutered": true,
    "diseases": null
  }
}
```

#### check_health

```json
{
  "success": true,
  "catName": "奶糖",
  "weightAnalysis": {
    "status": "正常",
    "message": "当前体重在品种标准范围内",
    "currentWeight": "4.52 kg",
    "standardRange": "3.50 - 5.50 kg",
    "deviation": "+0.12 kg"
  },
  "generalAdvice": [
    "体重正常，请继续保持当前的喂养方式",
    "定期（每月 1 次）监测体重变化"
  ]
}
```

---

## 📡 SSE 流式协议

### 事件流

```
客户端请求 POST /api/chat/messages
                                    ┌─────────────────────────┐
                                    │ meta                   │
                                    │ { type: 'meta',        │
                                    │   toolsCalled: [...],  │
                                    │   toolCount: N }       │
                                    └───────────┬─────────────┘
                                                ↓
                                    ┌─────────────────────────┐
                                    │ tool (×N)               │
                                    │ { type: 'tool',         │
                                    │   toolName, status,     │
                                    │   output: {...} }       │
                                    └───────────┬─────────────┘
                                                ↓
                                    ┌─────────────────────────┐
                                    │ content (×N)            │
                                    │ { type: 'content',      │
                                    │   text: '...' }         │
                                    └───────────┬─────────────┘
                                                ↓
                                    ┌─────────────────────────┐
                                    │ done                    │
                                    │ { type: 'done',         │
                                    │   traceId, citations }  │
                                    └─────────────────────────┘
```

### 事件类型

| 事件类型 | 触发时机 | 数据结构 | 前端用途 |
|---------|---------|---------|---------|
| `meta` | Agent 完成意图分类和工具规划后 | `{ type, traceId, toolsCalled[], toolCount }` | 显示将调用的工具列表 |
| `tool` | 每个工具完成执行后 | `{ type, toolName, status, output }` | 渲染结构化卡片 |
| `content` | LLM 输出文本片段 | `{ type, text }` | 流式渲染 Markdown 文本 |
| `done` | 全部完成后 | `{ type, traceId, citations[] }` | 显示耗时，绑定引用来源 |
| `error` | 出错时 | `{ type, message }` | 显示错误提示 |

---

## 🎨 前端 UI 设计

### 消息卡片结构

```
┌─────────────────────────────────────────────────────────────┐
│ [头像] 喵喵医生                                             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 工具调用进度条 (agent-tool-stack)                        ││
│ │  🐱 猫咪档案          ✓ 完成 · 45ms                    ││
│ │  ✅ 健康评估          ✓ 完成 · 120ms                   ││
│ │  📚 知识库检索        ✓ 完成 · 230ms                   ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌──────────────────────┐ ┌──────────────────────────────┐  │
│ │ 🐱 奶糖              │ │ ✅ 健康评估：正常              │  │
│ │ 品种：英短 · 2岁3个月 │ │ 当前 4.52 kg，偏差 +0.12 kg  │  │
│ └──────────────────────┘ └──────────────────────────────┘  │
│                                                             │
│ 喵喵医生的回复文本内容...（Markdown 渲染）                    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📚 知识参考                                              ││
│ │  《幼猫养护完全指南》  《猫咪疫苗接种指南》              ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Agent 气泡设计要点

1. **工具调用进度条**：动画逐个展开，每项显示 emoji 图标、工具名称、执行状态
2. **结构化摘要卡片**：2 列网格布局，基于 `tool.output` 动态渲染
3. **Markdown 内容区**：流式追加，支持代码块、列表、引用等格式
4. **引用来源**：卡片底部展示知识库引用，点击可跳转指南详情
5. **消息底部**：显示时间戳、总耗时（ms）、复制按钮

### 模式切换

- **智能模式（默认）**：Agent 驱动，展示工具调用过程与结构化卡片
- **普通模式**：传统 RAG 方式，简洁的对话气泡输出

---

## 🔄 数据流

### 完整交互时序

```
用户: "奶糖最近体重有变化吗？"
  │
  ▼
前端 POST /api/chat/messages
  │
  ▼
后端 handleAgentStreamingMessage()
  │
  ├─→ catAgent.handleMessage()
  │     │
  │     ├─→ AgentRouter.classifyIntent()  → 'mixed'
  │     │
  │     ├─→ AgentPlanner.buildPlan()     → [get_cat_info, get_weight_trend, check_health]
  │     │
  │     ├─→ AgentExecutor.executePlan()
  │     │     │ get_cat_info → { cat: { name: "奶糖", ... } }
  │     │     │ get_weight_trend → { analysis: { trend: "上升", ... } }
  │     │     │ check_health → { weightAnalysis: { status: "正常", ... } }
  │     │     │
  │     └─→ AgentReporter.generateReport() → 自然语言回答
  │
  ├─ SSE: { type: 'meta', toolsCalled: [...], toolCount: 3 }
  ├─ SSE: { type: 'tool', toolName: 'get_cat_info', status: 'success', output: {...} }
  ├─ SSE: { type: 'tool', toolName: 'get_weight_trend', status: 'success', output: {...} }
  ├─ SSE: { type: 'tool', toolName: 'check_health', status: 'success', output: {...} }
  ├─ SSE: { type: 'content', text: '...' } (多次)
  └─ SSE: { type: 'done', citations: [...], traceId: '...' }

前端 ChatStore:
  │ onMeta() → 渲染工具列表（running 状态）
  │ onTool() → 更新工具状态（done）+ 存储 output
  │ onMessage() → 流式追加文本
  │ onDone() → 显示耗时，绑定引用
  ▼
前端 ChatMessage:
  │ 工具进度条动画 → 结构化卡片渲染 → Markdown 文本展示
  ▼
用户看到: "奶糖最近体重呈上升趋势...（带工具调用可视化）"
```

---

## 📊 类型定义

### 后端类型

```typescript
// backend/src/agent/types/agent.ts

interface AgentContext {
  userId: string
  sessionId: string
  selectedCatId?: string
  traceId: string
  logger: Console
}

interface ToolResult {
  toolName: string
  success: boolean
  output?: any
  error?: string
  reason?: string
}

interface AgentResponse {
  answer: string
  toolResults: ToolResult[]
  traceId: string
  confidence: number
}
```

### 前端类型

```typescript
// frontend/src/types/chat.ts

interface ToolCallInfo {
  name: string           // 工具名（英文）
  label?: string         // 中文标签
  reason?: string        // 调用原因
  status: 'running' | 'done' | 'error'
  output?: any           // 工具执行返回的原始数据
  startTime?: number
  endTime?: number
  costMs?: number
}

interface AgentMeta {
  traceId: string
  toolsCalled?: string[]
  toolCalls?: ToolCallInfo[]
  citations?: string[]
  confidence?: number
  totalTimeMs?: number
}

interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  markdownContent?: string
  agentMeta?: AgentMeta
  createdAt: string
}
```

---

## 🔮 技术选型

| 组件 | 技术 | 说明 |
|------|------|------|
| 语言模型 | 智谱 AI GLM-4-flash | 流式输出，高性价比 |
| 意图分类 | 规则 + 关键词匹配 | 低延迟，可控性强 |
| 知识检索 | RAG 向量检索 | 支持知识库引用 |
| 前端状态 | Pinia | 响应式状态管理 |
| 流式传输 | Server-Sent Events (SSE) | 单向实时推送 |
| 工具编排 | ReAct 模式 | 意图→规划→执行→报告 |

---

## 📝 相关文档

- [AI顾问系统.md](./AI顾问系统.md) - 功能概述与 V2.0 文档
- [AI Agent 开发指南.md](./AI%20Agent%20开发指南.md) - 详细开发实现文档
- [AI顾问UI优化.md](../03-设计/ai顾问UI优化.md) - UI 设计规范

---

## 🔄 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| V1.0 | 2024-09 | 基础聊天功能 |
| V2.0 | 2026-02 | RAG 增强版上线 |
| V3.0 | 2026-06 | Agent 框架重构，支持多工具编排 |

---

_AI Agent 系统设计文档最后更新：2026-06-14_
