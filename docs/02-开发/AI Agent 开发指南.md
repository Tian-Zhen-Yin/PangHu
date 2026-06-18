# AI Agent 开发指南

> **版本:** V3.0
> **更新时间:** 2026-06-14
> **适用对象:** 开发工程师

本文档描述 AI Agent 智能顾问系统的详细实现，包括目录结构、接口规范、前后端集成步骤和调试指南。

---

## 📁 项目结构

### 后端目录

```
backend/src/
├── agent/
│   ├── core/
│   │   ├── AgentRouter.ts      # 意图分类器
│   │   ├── AgentPlanner.ts     # 工具规划器
│   │   ├── AgentExecutor.ts    # 工具执行器
│   │   └── AgentReporter.ts    # 报告生成器
│   ├── tools/
│   │   ├── index.ts            # 工具注册表
│   │   ├── catInfo.tool.ts     # 猫咪档案工具
│   │   ├── healthCheck.tool.ts  # 健康评估工具
│   │   ├── weightTrend.tool.ts  # 体重趋势工具
│   │   ├── vaccineCheck.tool.ts # 疫苗检查工具
│   │   └── ragSearch.tool.ts   # 知识库检索工具
│   ├── types/
│   │   └── agent.ts            # 核心类型定义
│   └── index.ts                # CatAgent 导出
├── controllers/
│   └── chat.controller.ts       # 聊天控制器（SSE 事件输出）
├── services/
│   ├── ai.service.ts           # AI 服务（LLM 调用）
│   ├── rag.service.ts          # RAG 服务
│   ├── cat.service.ts          # 猫咪数据服务
│   └── knowledge.service.ts     # 知识库服务
└── routes/
    └── chat.routes.ts          # 聊天路由
```

### 前端目录

```
frontend/src/
├── api/
│   └── chat.ts                 # 聊天 API（含 sendAgentMessageStream）
├── components/
│   └── chat/
│       ├── ChatMessage.vue     # Agent 消息卡片组件
│       ├── ChatInput.vue       # 输入框组件
│       └── ConversationList.vue # 对话列表组件
├── stores/
│   └── chat.ts                 # 聊天状态管理（含 sendAgentMessage）
├── types/
│   └── chat.ts                 # 聊天相关类型定义
└── views/
    └── AIChat/
        └── index.vue           # AI 聊天主页面
```

---

## 🔧 后端实现

### 1. 类型定义

**文件：** `backend/src/agent/types/agent.ts`

```typescript
import { z } from 'zod'

export interface AgentContext {
  userId: string
  sessionId: string
  selectedCatId?: string
  traceId: string
  logger: Console
}

export interface PlanStep {
  toolName: string
  reason: string
  parameters: Record<string, any>
}

export interface ToolResult {
  toolName: string
  success: boolean
  output?: any
  error?: string
  reason?: string
}

export interface Tool<Input = any, Output = any> {
  name: string
  description: string
  schema: z.ZodType<Input>
  permissions: ('read' | 'write')[]
  call: (input: Input, ctx: AgentContext) => Promise<Output>
}

export interface AgentResponse {
  answer: string
  toolResults: ToolResult[]
  traceId: string
  confidence: number
}
```

### 2. 工具定义模式

每个工具遵循统一的定义模式：

```typescript
// 1. 定义输入 Schema（使用 Zod）
import { z } from 'zod'

const myToolSchema = z.object({
  catName: z.string().optional().describe('猫咪名字')
})

// 2. 定义输出类型（TypeScript Interface）
interface MyToolOutput {
  success: boolean
  message?: string
  cat?: { name: string; breed: string }
}

// 3. 实现工具
export const MyTool: Tool<z.infer<typeof myToolSchema>, MyToolOutput> = {
  name: 'my_tool',           // 唯一标识（snake_case）
  description: '工具功能描述（Agent 可读）',
  schema: myToolSchema,
  permissions: ['read'],     // 或 ['read', 'write']
  call: async (input, ctx: AgentContext) => {
    // 业务逻辑
    return { success: true, cat: { name: '奶糖', breed: '英短' } }
  }
}
```

### 3. 工具注册

**文件：** `backend/src/agent/tools/index.ts`

```typescript
import { CatInfoTool } from './catInfo.tool'
import { WeightTrendTool } from './weightTrend.tool'
import { HealthCheckTool } from './healthCheck.tool'
import { VaccineCheckTool } from './vaccineCheck.tool'
import { RagSearchTool } from './ragSearch.tool'

export const tools: Tool[] = [
  CatInfoTool,
  WeightTrendTool,
  HealthCheckTool,
  VaccineCheckTool,
  RagSearchTool,
]

// 工具注册表（按名称查找）
export const toolRegistry = new Map<string, Tool>()
tools.forEach((tool) => toolRegistry.set(tool.name, tool))

export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name)
}
```

### 4. Agent 核心流程

**文件：** `backend/src/agent/index.ts`

```typescript
export class CatAgent {
  async handleMessage(
    userMessage: string,
    userId: string,
    sessionId: string,
    selectedCatId?: string
  ): Promise<AgentResponse> {
    // 1. 构建上下文
    const ctx: AgentContext = {
      userId, sessionId, selectedCatId,
      traceId: generateTraceId(),
      logger: console,
    }

    // 2. 意图分类
    const intent = classifyIntent(state)

    // 3. 构建计划
    const plan: PlanStep[] = buildPlan(state, intent)

    // 4. 执行工具
    const toolResults: ToolResult[] = await executePlan(plan, ctx)

    // 5. 生成报告
    const report = generateReport(state, toolResults)

    return { answer: report, toolResults, traceId: ctx.traceId, confidence: ... }
  }
}
```

### 5. SSE 流式输出

**文件：** `backend/src/controllers/chat.controller.ts`

```typescript
async function handleAgentStreamingMessage(...) {
  const agentResponse = await catAgent.handleMessage(...)

  // 1. meta 事件：工具清单
  res.write('data: ' + JSON.stringify({
    type: 'meta',
    traceId: agentResponse.traceId,
    toolsCalled: toolNames,
    toolCount: agentResponse.toolResults.length,
  }) + '\n\n')

  // 2. tool 事件：每个工具的执行结果（关键！）
  for (const result of agentResponse.toolResults) {
    res.write('data: ' + JSON.stringify({
      type: 'tool',
      toolName: result.toolName,
      status: result.success ? 'success' : 'error',
      output: result.output,  // 结构化输出，前端渲染卡片用
    }) + '\n\n')
    await new Promise(r => setTimeout(r, 80))  // 模拟逐步展示
  }

  // 3. content 事件：文本流式输出
  const buffer = Buffer.from(agentResponse.answer, 'utf-8')
  const chunkSize = Math.max(40, Math.floor(buffer.length / 15))
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const slice = buffer.slice(i, i + chunkSize).toString('utf-8')
    res.write('data: ' + JSON.stringify({ type: 'content', text: slice }) + '\n\n')
    await new Promise(r => setTimeout(r, 20))
  }

  // 4. done 事件：完成
  res.write('data: ' + JSON.stringify({
    type: 'done',
    traceId: agentResponse.traceId,
    citations: [...],
  }) + '\n\n')
  res.end()
}
```

---

## 🎨 前端实现

### 1. 类型定义

**文件：** `frontend/src/types/chat.ts`

```typescript
export interface ToolCallInfo {
  name: string
  label?: string
  status: 'running' | 'done' | 'error'
  output?: any
  startTime?: number
  endTime?: number
  costMs?: number
}

export interface AgentMeta {
  traceId: string
  toolsCalled?: string[]
  toolCalls?: ToolCallInfo[]
  citations?: string[]
  confidence?: number
  totalTimeMs?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentMeta?: AgentMeta
  isStreaming?: boolean
  createdAt: string
}
```

### 2. API 层

**文件：** `frontend/src/api/chat.ts`

```typescript
export function sendAgentMessageStream(
  params: SendMessageParams,
  callbacks: {
    onConnected?: () => void
    onMeta?: (meta: any) => void      // 工具清单
    onMessage?: (text: string) => void // 文本片段
    onTool?: (toolData: any) => void  // 工具完成
    onDone?: (data?: any) => void     // 完成
    onError?: (error: string) => void
  }
): () => void {
  // fetch SSE 实现，返回取消函数
}
```

### 3. Store 层

**文件：** `frontend/src/stores/chat.ts`

关键回调处理：

```typescript
// onMeta：渲染工具列表（running 状态）
onMeta: (meta) => {
  messageRef.agentMeta = {
    ...existing,
    traceId: meta.traceId,
    toolCalls: meta.toolsCalled.map(name => ({
      name, label: getToolLabel(name).label,
      status: 'running', startTime: Date.now()
    }))
  }
},

// onTool：更新工具状态 + 存储 output（结构化卡片数据）
onTool: (toolData) => {
  const meta = messageRef.agentMeta
  if (!meta.toolCalls) meta.toolCalls = []
  const idx = meta.toolCalls.findIndex(t => t.name === toolData.toolName)
  if (idx >= 0) {
    meta.toolCalls[idx].status = toolData.status === 'error' ? 'error' : 'done'
    meta.toolCalls[idx].output = toolData.output  // ← 结构化卡片数据
  }
}

// onDone：显示耗时，合并引用来源
onDone: (data) => {
  messageRef.agentMeta.totalTimeMs = Date.now() - startAt
  messageRef.agentMeta.citations = data?.citations
}
```

### 4. 消息卡片组件

**文件：** `frontend/src/components/chat/ChatMessage.vue`

Agent 消息渲染逻辑：

```vue
<div v-if="isAgentMessage" class="agent-bubble">
  <!-- 工具调用进度条 -->
  <div class="agent-tool-stack">
    <div
      v-for="tool in message.agentMeta.toolCalls"
      :key="tool.name"
      :class="['agent-tool-item', tool.status]"
    >
      <span class="agent-tool-emoji">{{ toolIcon(tool.name) }}</span>
      <span class="agent-tool-name">{{ tool.label }}</span>
      <span class="agent-tool-status">{{ toolStatusText(tool) }}</span>
    </div>
  </div>

  <!-- 结构化数据卡片（全部完成时渲染） -->
  <div v-if="toolDoneCount === toolCount" class="agent-summary-cards">
    <div v-if="healthSummary()" class="agent-summary-card">
      <span class="agent-summary-icon">{{ healthSummary().icon }}</span>
      <div class="agent-summary-body">
        <div class="agent-summary-title">健康评估：{{ healthSummary().status }}</div>
        <div class="agent-summary-text">{{ healthSummary().message }}</div>
      </div>
    </div>
    <!-- 其他卡片：catSummary / weightSummary / vaccineSummary -->
  </div>

  <!-- Markdown 文本内容 -->
  <div class="markdown-content" v-html="renderedContent"></div>
</div>
```

#### 卡片数据提取函数

```typescript
// 从工具 output 中提取渲染数据
function healthSummary() {
  const tool = props.message.agentMeta?.toolCalls?.find(t => t.name === 'check_health')
  const wa = tool?.output?.weightAnalysis
  if (!wa) return null
  // 兼容中英文状态
  const isOverweight = wa.status === 'overweight' || wa.status === '超重'
  const isThin = wa.status === 'thin' || wa.status === '偏瘦'
  return {
    status: isOverweight ? '超重' : isThin ? '偏瘦' : '正常',
    message: wa.message,
    value: `${wa.currentWeight}${wa.deviation ? ` (偏差 ${wa.deviation})` : ''}`,
    icon: isOverweight ? '⚠️' : isThin ? '⚖️' : '✅',
  }
}
```

### 5. 模式切换

```typescript
// chatStore 中
const useAgentMode = ref(true)

async function sendMessage(params) {
  if (useAgentMode.value) {
    return sendAgentMessage(params)  // Agent 模式
  }
  return sendAgentMessageLegacy(params)  // 普通模式
}
```

---

## 📡 API 接口

### 发送消息

```
POST /api/chat/messages
Authorization: Bearer <token>
Content-Type: application/json
Accept: text/event-stream
```

**请求体：**

```json
{
  "conversationId": "conv_xxx",    // 可选，新建对话时省略
  "content": "奶糖最近体重怎么样？",
  "catId": "cat_xxx",              // 可选
  "useAgent": true                 // 可选，默认 true
}
```

**响应（SSE 流）：**

```
event: connected
data: connected

data: {"type":"meta","traceId":"agent-xxx","toolsCalled":["get_cat_info","get_weight_trend","check_health"],"toolCount":3}

data: {"type":"tool","toolName":"get_cat_info","status":"success","output":{"success":true,"cat":{"name":"奶糖","breed":"英短"}}}}
data: {"type":"tool","toolName":"get_weight_trend","status":"success","output":{"success":true,"analysis":{"trend":"上升","totalRecords":12}}}
data: {"type":"tool","toolName":"check_health","status":"success","output":{"success":true,"weightAnalysis":{"status":"正常","message":"..."}}}}

data: {"type":"content","text":"根据奶糖的体重记录分析"}
data: {"type":"content","text":"，最近三个月体重呈上升趋势"}
...

data: {"type":"done","traceId":"agent-xxx","citations":["幼猫养护完全指南","疫苗接种指南"]}
```

---

## 🔧 开发调试

### 1. 后端测试

```bash
# 启动后端
cd backend && npm run dev

# 测试 Agent 端点（curl）
curl -X POST http://localhost:3000/api/chat/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream" \
  -d '{"content":"奶糖最近体重怎么样？"}'
```

### 2. 前端调试

打开浏览器控制台，过滤 `[Agent]` 标签查看日志：

```
[Agent] meta 事件: { traceId, toolsCalled, toolCount }
[Agent] tool 事件: { toolName, status, output }
[Agent API] 解析后数据: ...
```

### 3. 前端类型检查

```bash
cd frontend && npm run typecheck
```

### 4. 添加新工具

1. 在 `backend/src/agent/tools/` 创建 `*.tool.ts` 文件
2. 定义 Schema、接口和 Tool 对象
3. 在 `backend/src/agent/tools/index.ts` 中注册
4. 在 `frontend/src/stores/chat.ts` 的 `TOOL_LABELS` 中添加标签
5. 在 `ChatMessage.vue` 中添加对应的卡片渲染函数
6. 在 `AgentPlanner.ts` 中添加对应的规划规则

---

## 📚 相关文档

- [AI Agent 系统设计.md](./AI%20Agent%20系统设计.md) - 架构设计与技术方案
- [AI顾问系统.md](./AI顾问系统.md) - 功能概述
- [API文档.md](./API文档.md) - 接口说明

---

## 🔄 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| V3.0 | 2026-06-14 | 初始版本，Agent 框架 + 前端改造 |

---

_AI Agent 开发指南最后更新：2026-06-14_
