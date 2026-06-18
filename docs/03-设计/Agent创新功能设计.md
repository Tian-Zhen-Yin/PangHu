# Agent 创新功能设计文档

> **版本:** V2.0
> **更新时间:** 2026-06-14
> **设计对象:** 哈吉咪养成计划 - AI Agent 智能顾问

> **V2.0 修订说明**
> 本版本基于架构评审反馈对 V1.0 进行全面修订，主要变更：
> 1. 功能一由"思维链展示"重新定位为"执行轨迹可视化"，避免对 LLM 推理能力的过度承诺
> 2. 功能二补充首个写入工具所需的权限中间件、多轮确认流程与审计字段
> 3. 功能三标注活动量数据缺口，精简字段并分期交付
> 4. 收窄过敏/周报意图的关键词匹配，降低误触发
> 5. 新增架构前置依赖、组件拆分方案、分期实施路线、测试覆盖计划四个章节

---

## 📋 功能概述

在现有 Agent 架构基础上，新增三项创新功能，提升宠物健康管理的智能化和可视化水平：

| 功能模块 | 功能等级 | 触发方式 | 核心价值 | 实施阶段 |
|---------|---------|---------|---------|---------|
| **执行轨迹可视化** | 中 | Agent 执行过程中自动输出 | 让用户看到 Agent 的执行流程，增强透明度（注意：非 LLM 推理过程） | P3 |
| **过敏历史追踪** | 高 | 用户主动询问 / Agent 健康评估时附带 | 结构化管理宠物过敏信息，辅助诊疗；同时验证首个写入工具链路 | P1（只读）/ P3（写入） |
| **可视化健康周报** | 高 | Agent 主动识别用户意图并生成 | 以图表形式展示宠物一周健康状况，提升数据可读性 | P2（核心）/ P4（增强） |

---

## 🏗️ 整体架构设计

### 功能融合方式

```
┌─────────────────────────────────────────────────────────────────────┐
│                        前端对话流                                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Agent 消息卡片                              │  │
│  │                                                               │  │
│  │ ┌─────────────────────────────────────────────────────────┐ │ │
│  │ │  🛰️  执行轨迹（折叠面板）                                   │ │ │
│  │ │  [展开] 1. 识别意图 → 健康咨询                            │ │ │
│  │ │          2. 规划工具 → 获取猫咪档案                        │ │ │
│  │ │                        + 健康评估                         │ │ │
│  │ │                        + 疫苗状态                         │ │ │
│  │ │                        + 过敏信息查询                     │ │ │
│  │ │          3. 整合数据 → 生成健康建议 + 周报                 │ │ │
│  │ └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │ │
│  │ ┌─────────────────────────────────────────────────────────┐ │ │
│  │ │  🔧 工具调用进度（流式展示）                              │ │ │
│  │ │                                                          │ │ │
│  │ │  🐱 猫咪档案         ✓ 完成                              │ │ │
│  │ │  ✅ 健康评估         ✓ 完成                              │ │ │
│  │ │  💉 疫苗状态         ✓ 完成                              │ │ │
│  │ │  🤒 过敏信息         ✓ 完成  ←（新工具）                 │ │ │
│  │ │  📊 健康周报         ✓ 完成  ←（新工具）                 │ │ │
│  │ └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │ │
│  │ ┌─────────────────────────────────────────────────────────┐ │ │
│  │ │  📊 可视化健康周报卡片（Agent 主动嵌入）                     │ │ │
│  │ │                                                          │ │ │
│  │ │  📅 奶糖的健康周报（2026/06/07 - 2026/06/14）            │ │ │
│  │ │                                                          │ │ │
│  │ │  📈 体重趋势图（纯CSS实现）                               │ │ │
│  │ │  [4.58 kg 当前] [稳定↑ +1.32%]                           │ │ │
│  │ │                                                          │ │ │
│  │ │  ┌─────────────┐  ┌─────────────────┐                    │ │ │
│  │ │  │ ✅ 健康评分│  │ 🏃 运动量      │                    │ │ │
│  │ │  │  92/100   │ │  ★★★★☆ 4.5/5  │                    │ │ │
│  │ │  │  【优秀】  │ │  正常          │                    │ │ │
│  │ │  └─────────────┘  └─────────────────┘                    │ │ │
│  │ │                                                          │ │ │
│  │ │  🔔 本周亮点                                             │ │ │
│  │ │  • 体重保持稳定，无需调整饮食                            │ │ │
│  │ │  • 疫苗接种记录完整                                      │ │ │
│  │ │  • ⚠️  注意：皮肤过敏症状需持续观察                       │ │ │
│  │ └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │ │
│  │ ┌─────────────────────────────────────────────────────────┐ │ │
│  │ │  🤒 过敏信息卡片（结构化展示）                             │ │ │
│  │ │                                                          │ │ │
│  │ │  过敏原：鸡肝 / 鱼粮 / 跳蚤                               │ │ │
│  │ │  🕒 时间轴：2026-06 ─●──●──●─●────→                       │ │ │
│  │ └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │ │
│  │  "根据奶糖的健康数据分析，本周体重保持稳定..."（自然语言）    │ │ │
│  └─────────────────────────────────────────────────────────────┘ │ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent 工具链扩展

```
现有工具（5个）：
  ├─ get_cat_info       猫咪档案
  ├─ get_weight_trend   体重趋势
  ├─ check_health       健康评估
  ├─ check_vaccine      疫苗状态
  └─ rag_search         知识库检索

新增工具（3个）：
  ├─ GET_allergy_records    过敏信息查询（只读） ← 过敏追踪
  ├─ ADD_allergy_record    过敏信息录入（可写） ← 过敏追踪
  └─ GENERATE_health_report  健康周报生成      ← 可视化周报
```

---

## 功能一：执行轨迹可视化（Execution Trace Visualization）

> **V2.0 命名变更说明**
> V1.0 将此功能命名为"动态思维链展示（Chain of Thought）"。经评审，该命名存在概念混淆：
> 当前 Agent 是**规则驱动的 ReAct 简化版**，Router 基于关键词匹配、Planner 基于 switch-case 映射，
> 这些是**确定性管道步骤**，并非 LLM 的真实推理过程。将其包装为"思维链"展示给用户，
> 会造成对 AI 能力的过度承诺。
>
> V2.0 重新定位为"执行轨迹可视化"，准确反映其本质：**Agent 执行流水线的可视化日志**。
> 若未来接入支持 reasoning token 的模型（如 GLM-4 with thinking），可在此基础上扩展为真实推理展示。

### 🎯 设计目标

让用户能够**看到 Agent 的执行流程**——从意图识别到工具选择，再到数据整合，全程透明，增强用户对 Agent 决策的可追溯性。

**适用场景**：
- 用户想了解"Agent 为什么调用这些工具"
- 调试与透明度需求（默认折叠，不干扰正常对话）
- 内部用户/早期采用者的可观测性窗口

**不适用场景**（避免过度承诺）：
- 不等同于 LLM 的推理过程
- 不展示模型的内部思考 token
- 不作为"AI 智能程度"的证明

### 🔧 技术实现

#### 后端：执行轨迹追踪器（Agent Execution Tracer）

**新增类型定义** — `backend/src/agent/types/agent.ts`

```typescript
// 执行轨迹步骤（注意：这是 Agent 管道执行日志，不是 LLM 推理 token）
export interface TraceStep {
  stepId: number             // 步骤序号
  type: 'intent' | 'plan' | 'execute' | 'integrate' | 'report'
  title: string              // 步骤标题
  content: string            // 步骤说明（自然语言描述）
  timestamp: number          // 时间戳
  durationMs?: number        // 该步骤实际耗时（真实测量值，非模拟）
  data?: Record<string, unknown> // 相关数据（脱敏后）
}

// 扩展 AgentResponse，新增执行轨迹字段
export interface AgentResponse {
  answer: string
  toolResults: ToolResult[]
  traceId: string
  confidence: number
  executionTrace: TraceStep[] // ← 新增：完整的执行轨迹
}
```

**新增核心组件** — `backend/src/agent/core/AgentExecutionTracer.ts`

```typescript
/**
 * Agent 执行轨迹追踪器
 * 在 Agent 执行过程中记录管道各阶段的执行情况
 *
 * 注意：本组件记录的是 Router/Planner/Executor/Reporter 的确定性执行流程，
 * 不等同于 LLM 的推理过程。如需展示真实 reasoning，应在 ai.service.ts
 * 层捕获模型的 thinking token（需模型支持）。
 */
class ExecutionTracer {
  private steps: TraceStep[] = []
  private stepCounter = 0
  private timers: Map<number, number> = new Map() // stepId → startTimestamp

  private begin(): number {
    return Date.now()
  }

  private finish(startedAt: number, step: Omit<TraceStep, 'durationMs'>): TraceStep {
    return { ...step, durationMs: Date.now() - startedAt }
  }

  recordIntent(message: string, intent: IntentType, confidence: number) {
    const startedAt = this.begin()
    this.stepCounter++
    const step: TraceStep = this.finish(startedAt, {
      stepId: this.stepCounter,
      type: 'intent',
      title: '意图识别',
      content: `用户输入："${message}" → 命中【${intentLabel(intent)}】`,
      timestamp: startedAt,
      data: { intent, confidence },
    })
    this.steps.push(step)
  }

  recordPlan(planSteps: PlanStep[]) {
    const startedAt = this.begin()
    this.stepCounter++
    const step: TraceStep = this.finish(startedAt, {
      stepId: this.stepCounter,
      type: 'plan',
      title: '工具规划',
      content: `规划调用：${planSteps.map(s => toolNameLabel(s.toolName)).join(' + ')}`,
      timestamp: startedAt,
      data: { planSteps },
    })
    this.steps.push(step)
  }

  recordExecute(toolName: string, status: 'start' | 'success' | 'error', data: unknown) {
    const startedAt = this.begin()
    this.stepCounter++
    const step: TraceStep = this.finish(startedAt, {
      stepId: this.stepCounter,
      type: 'execute',
      title: `执行工具：${toolNameLabel(toolName)}`,
      content: status === 'start'
        ? `调用 ${toolNameLabel(toolName)}`
        : status === 'success'
          ? `✅ 返回数据`
          : `❌ 失败：${(data as { error?: string })?.error || '未知错误'}`,
      timestamp: startedAt,
      data: { toolName, status, data },
    })
    this.steps.push(step)
  }

  recordIntegrate(integrationSummary: string, processedData: unknown) {
    const startedAt = this.begin()
    this.stepCounter++
    const step: TraceStep = this.finish(startedAt, {
      stepId: this.stepCounter,
      type: 'integrate',
      title: '数据整合',
      content: integrationSummary, // 如："整合猫咪档案、健康评估和疫苗状态数据"
      timestamp: startedAt,
      data: { processedData },
    })
    this.steps.push(step)
  }

  recordReport(summary: string, keyPoints: string[]) {
    const startedAt = this.begin()
    this.stepCounter++
    const step: TraceStep = this.finish(startedAt, {
      stepId: this.stepCounter,
      type: 'report',
      title: '生成回复',
      content: summary, // 如："结合体重数据 + 知识库建议，生成健康建议"
      timestamp: startedAt,
      data: { keyPoints },
    })
    this.steps.push(step)
  }

  getTrace(): TraceStep[] {
    return this.steps
  }
}
```

**在 Agent 主流程中集成** — `backend/src/agent/index.ts`

```typescript
const tracer = new ExecutionTracer()

// 1. 意图识别（Router）
tracer.recordIntent(userMessage, intent, confidence)

// 2. 工具规划（Planner）
tracer.recordPlan(planSteps)

// 3. 执行每个工具（Executor）
for (const step of planSteps) {
  tracer.recordExecute(step.toolName, 'start', null)
  // ... 执行工具 ...
  tracer.recordExecute(step.toolName, result.success ? 'success' : 'error', result.output)
}

// 4. 数据整合（Executor 内部）
tracer.recordIntegrate('整合所有工具返回的健康数据', processedData)

// 5. 生成回复（Reporter）
tracer.recordReport('生成针对性的健康建议', keyPoints)

// 6. 将执行轨迹加入 response
response.executionTrace = tracer.getTrace()
```

#### SSE 协议扩展

**新增 `trace` 事件类型** — 在现有事件流中插入执行轨迹事件

> **V2.0 变更说明**
> V1.0 在 SSE 推送时使用 `setTimeout(r, 80)` 人为延迟以"模拟思考过程"。
> 该做法为可感知延迟，且与"执行轨迹"语义不符（执行日志应如实反映耗时）。
> V2.0 移除人为延迟，改为按实际执行顺序即时推送；视觉上的"逐步出现"效果
> 由前端 CSS 动画（错峰淡入）实现，不增加网络延迟。

```typescript
// backend/src/controllers/chat.controller.ts

// 完整事件流：
// meta → trace(intent) → trace(plan) → trace(execute) → tool
// → trace(integrate) → trace(report) → content → done

// TRACE 事件数据格式
interface TraceEvent {
  type: 'trace'
  step: TraceStep  // 当前执行步骤（含真实 durationMs）
}

// 在 SSE 中按实际发生顺序推送执行轨迹：
// 注意：trace 事件应在对应阶段执行完成后立即推送，不引入额外延迟
const trace = agentResponse.executionTrace || []
for (const step of trace) {
  res.write('data: ' + JSON.stringify({
    type: 'trace',
    step,
  }) + '\n\n')
  // 不再使用 setTimeout 制造人为延迟
}
```

#### 前端类型扩展

**文件**：`frontend/src/types/chat.ts`

```typescript
// 执行轨迹步骤类型（与后端 TraceStep 对齐）
export interface TraceStep {
  stepId: number
  type: 'intent' | 'plan' | 'execute' | 'integrate' | 'report'
  title: string
  content: string
  timestamp: number
  durationMs?: number
  data?: Record<string, unknown>
}

// 扩展 AgentMeta
export interface AgentMeta {
  traceId: string
  toolsCalled?: string[]
  toolCalls?: ToolCallInfo[]
  citations?: string[]
  confidence?: number
  totalTimeMs?: number
  executionTrace?: TraceStep[]  // ← 新增：执行轨迹数据
}
```

#### 前端状态管理

**文件**：`frontend/src/stores/chat.ts`

```typescript
// onTrace 事件回调（处理 SSE trace 事件）
onTrace: (traceStep: TraceStep) => {
  const messageRef = messages.value[aiMessageIndex]
  if (!messageRef) return

  if (!messageRef.agentMeta) {
    messageRef.agentMeta = {
      traceId: 'agent-' + Date.now(),
      toolsCalled: [],
      toolCalls: [],
      citations: [],
      executionTrace: [], // ← 初始化执行轨迹
    }
  }

  if (!messageRef.agentMeta.executionTrace) {
    messageRef.agentMeta.executionTrace = []
  }

  // 追加新的执行步骤（响应式更新）
  messageRef.agentMeta.executionTrace.push(traceStep)
  messageRef.agentMeta = { ...messageRef.agentMeta }
}
```

### 🎨 前端 UI 设计

#### 组件：执行轨迹折叠面板（Execution Trace Panel）

**文件**：`frontend/src/components/chat/ExecutionTracePanel.vue`（新增）

```
┌──────────────────────────────────────────────────────────────────┐
│  🛰️  执行流程（点击展开查看）  [展开/收起按钮]                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [折叠状态]（默认折叠，不占空间）                                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [展开状态]：                                             │  │
│  │                                                          │  │
│  │  1️⃣  意图识别                                  ⏱ 2ms      │  │
│  │  ─────────────────────────────────────                   │  │
│  │  用户输入："奶糖最近健康怎么样？"                          │  │
│  │  → 命中【健康咨询】（关键词匹配）                          │  │
│  │                                                          │  │
│  │  2️⃣  工具规划                                  ⏱ 1ms      │  │
│  │  ─────────────────────────────────────                   │  │
│  │  规划调用：                                              │  │
│  │    • 🐱 猫咪档案                                         │  │
│  │    • ✅ 健康评估                                         │  │
│  │    • 💉 疫苗状态                                         │  │
│  │                                                          │  │
│  │  3️⃣  数据整合                                 ⏱ 5ms      │  │
│  │  ─────────────────────────────────────                   │  │
│  │  整合猫咪档案、健康评估、疫苗状态三组数据                  │  │
│  │                                                          │  │
│  │  4️⃣  生成回复                                 ⏱ 120ms    │  │
│  │  ─────────────────────────────────────                   │  │
│  │  生成回复摘要（基于规则 + LLM 调用）                      │  │
│  │                                                          │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

> **UI 文案变更说明**
> V1.0 使用"思考过程""推理决策"等措辞，V2.0 改为"执行流程""生成回复"，
> 避免暗示这是 AI 的内在思考。每步显示真实 `durationMs`，让用户理解这是可测量的执行耗时。

**动画效果**（纯 CSS 实现，不依赖网络延迟）：
- **折叠/展开**：平滑高度过渡（300ms）
- **错峰淡入**：步骤展开后，每项以 80ms 间隔依次淡入（`transition-delay: idx * 80ms`）
- **进行中状态**：最新一步显示脉冲指示器，完成后变为耗时标签

#### 在 ChatMessage.vue 中集成

```vue
<!-- frontend/src/components/chat/ChatMessage.vue -->

<script setup lang="ts">
import ExecutionTracePanel from './ExecutionTracePanel.vue'
import { ref } from 'vue'

const showExecutionTrace = ref(false)  // 用户可手动切换
</script>

<template>
  <div v-if="isAgentMessage" class="agent-bubble">
    <!-- 执行轨迹折叠面板（位于工具进度条上方，默认为折叠状态） -->
    <ExecutionTracePanel
      v-if="message.agentMeta?.executionTrace?.length > 0"
      :trace-steps="message.agentMeta.executionTrace"
      v-model:expanded="showExecutionTrace"
    />

    <!-- 原有工具调用进度条 -->
    <div class="agent-tool-stack">...</div>

    <!-- 结构化数据卡片 -->
    <div class="agent-summary-cards">...</div>
  </div>
</template>
```

#### 特性开关

**文件**：`backend/src/config/featureFlags.ts`（扩展现有配置）

> **V2.0 命名变更说明**
> V1.0 的 `AGENT_COT_DISPLAY` 暗示"Chain of Thought"，与实际语义不符。
> V2.0 重命名为 `AGENT_EXECUTION_TRACE`。若代码中已存在 `AGENT_COT_DISPLAY`，
> 应作为别名保留一个过渡版本，避免存量调用断裂。

```typescript
AGENT_EXECUTION_TRACE: {
  key: 'AGENT_EXECUTION_TRACE',
  enabledByDefault: false,   // 默认关闭（实验性功能）
  description: '展示 Agent 执行轨迹（Router/Planner/Executor/Reporter 流水线日志）',
  rollout: {
    environment: {
      development: true,
      staging: true,
      production: false,
    },
    userSegment: 'internal',   // 仅内部用户可访问
    percentage: 100,
  },
  dependencies: ['AGENT_MODE', 'AGENT_TOOL_VISUALIZATION'],
}
```

### 🔑 设计要点

| 维度 | 设计决策 | 原因 |
|------|---------|------|
| **默认状态** | 折叠（不展开） | 避免干扰正常对话流，仅关心执行细节的用户会主动查看 |
| **位置** | 消息卡片顶部（工具进度条上方） | 符合"规划 → 执行"的逻辑顺序 |
| **动画** | 前端 CSS 错峰淡入 | 视觉上的"逐步出现"由前端实现，后端不引入人为延迟 |
| **权限** | 实验性功能（默认关） | 先面向内部用户收集反馈，验证信息密度是否合适 |
| **数据粒度** | 粗粒度摘要（不暴露敏感数据） | 平衡透明度与隐私安全 |
| **语义准确性** | 文案使用"执行流程"而非"思考过程" | 避免对 LLM 推理能力的过度承诺 |
| **真实耗时** | 展示每步实际 `durationMs` | 让用户理解这是可测量的执行日志，而非模拟效果 |

---

## 功能二：过敏历史追踪（Allergy History Tracking）

### 🎯 设计目标

让用户能够**查询和记录宠物过敏信息**，Agent 可在健康咨询时自动关联过敏数据，提供更精准的健康建议。

### 🔧 技术实现

#### 数据库 Schema 扩展

**文件**：`prisma/schema.prisma`

> **V2.0 字段变更说明**
> 1. `severity` 由 `String` 改为 Prisma `enum`，避免脏数据写入
> 2. 新增 `createdBy`（写入者 userId）与 `source`（数据来源）审计字段
> 3. 新增 `confirmedAt`，用于追踪多轮确认流程的完成时刻
> 4. 新增 `@@index([catId, allergen])` 支持按过敏原聚合查询

```prisma
// 新增枚举：严重程度（受控词汇，避免脏数据）
enum AllergySeverity {
  mild
  moderate
  severe
}

// 新增枚举：数据来源（用于审计与回溯）
enum AllergyRecordSource {
  agent         // 由 Agent 写入工具创建
  manual        // 用户在表单/UI 手动录入
  imported      // 数据迁移导入
}

model AllergyRecord {
  id             String              @id @default(cuid())
  catId          String
  allergen       String              // 过敏原：鸡肝、鱼粮、跳蚤、花粉等
  symptoms       String              // 症状描述：皮肤红斑、呕吐、抓挠等
  severity       AllergySeverity     // 严重程度（枚举约束）
  occurrenceDate DateTime            // 发作日期/时间
  treatment      String?             // 处理方式/用药
  notes          String?             // 额外备注

  // 审计字段（V2.0 新增）
  createdBy      String              // 写入者 userId（与 Cat.userId 一致或经授权）
  source         AllergyRecordSource @default(agent) // 数据来源
  confirmedAt    DateTime?           // 用户确认写入的时刻（仅 agent 来源）
  createdAt      DateTime            @default(now())

  cat            Cat                 @relation(fields: [catId], references: [id], onDelete: Cascade)

  @@index([catId, occurrenceDate])
  @@index([catId, allergen])         // 支持按过敏原聚合查询
}
```

#### 后端：新增工具（过敏查询 + 过敏录入）

**工具一：查询过敏信息（GET_allergy_records）**

**文件**：`backend/src/agent/tools/allergyQuery.tool.ts`

```typescript
/**
 * 宠物过敏信息查询工具
 * 读取猫咪的过敏历史记录
 */
export const AllergyQueryTool: Tool<
  z.infer<typeof AllergyQuerySchema>,
  AllergyRecordOutput
> = {
  name: 'GET_allergy_records',
  description: '获取猫咪的过敏信息记录，包括过敏原、症状、发作时间、处理方式等',
  schema: AllergyQuerySchema,
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    // 1. 查询数据库
    const records = await prisma.allergyRecord.findMany({
      where: { catId: input.catId },
      orderBy: { occurrenceDate: 'desc' },
      take: input.limit || 20,
    })

    // 2. 统计分析
    const analysis = analyzeAllergyPatterns(records)

    // 3. 返回结构化输出
    return {
      success: records.length > 0,
      catId: input.catId,
      totalRecords: records.length,
      records: records.map(r => ({
        id: r.id,
        allergen: r.allergen,
        symptoms: r.symptoms,
        severity: r.severity,
        occurrenceDate: r.occurrenceDate.toISOString(),
        treatment: r.treatment,
        notes: r.notes,
      })),
      allergens: analysis.uniqueAllergens,     // 所有过敏原列表
      patternAnalysis: analysis,                // 模式分析
      lastOccurrence: records[0]?.occurrenceDate?.toISOString() || null,
    }
  },
}
```

**工具二：录入过敏信息（ADD_allergy_record）**

**文件**：`backend/src/agent/tools/allergyRecord.tool.ts`

> **V2.0 安全变更说明**
> 1. `permissions: ['write']` 是系统首个写入工具。Executor 必须在调用前完成
>    所有权校验（见 [架构前置依赖](#架构前置依赖) 章节）。
> 2. 写入操作需经用户二次确认。本工具不应在首次 Agent 流程中直接执行，
>    而是通过 `pending_confirmation` SSE 事件挂起，等待用户确认后再触发。
> 3. `createdBy`、`source`、`confirmedAt` 审计字段强制写入，便于回溯。

```typescript
/**
 * 宠物过敏信息录入工具
 * 用户可在对话中主动记录新的过敏事件
 *
 * 安全要求：
 * - permissions: ['write'] → Executor 须先调用 requireConfirmation 中间件
 * - 写入前必须校验猫归属（cat.userId === ctx.userId）
 * - 所有写入操作必须带审计字段（createdBy / source / confirmedAt）
 */
export const AllergyRecordTool: Tool<
  z.infer<typeof AllergyRecordSchema>,
  AllergyRecordCreateOutput
> = {
  name: 'ADD_allergy_record',
  description: '记录新的过敏事件，用于完善猫咪健康档案',
  schema: AllergyRecordSchema,
  permissions: ['write'],  // ← 写入权限（系统首个 write 工具）
  call: async (input, ctx: AgentContext) => {
    // 1. 所有权校验（双重保险，Executor 层已做一次）
    const cat = await prisma.cat.findFirst({
      where: { id: input.catId, userId: ctx.userId },
      select: { id: true, name: true },
    })
    if (!cat) {
      return { success: false, error: '无权访问该猫咪信息' }
    }

    // 2. 校验确认令牌（确保用户已通过 pending_confirmation 流程确认）
    if (!ctx.confirmationToken || !ctx.confirmationToken.verified) {
      return {
        success: false,
        error: '写入操作需用户确认后方可执行',
        requiresConfirmation: true,
        draft: { allergen: input.allergen, symptoms: input.symptoms, severity: input.severity },
      }
    }

    // 3. 创建记录（含审计字段）
    const record = await prisma.allergyRecord.create({
      data: {
        catId: input.catId,
        allergen: input.allergen,
        symptoms: input.symptoms,
        severity: input.severity,
        occurrenceDate: input.occurrenceDate ? new Date(input.occurrenceDate) : new Date(),
        treatment: input.treatment,
        notes: input.notes,
        // 审计字段（V2.0 新增）
        createdBy: ctx.userId,
        source: 'agent',
        confirmedAt: ctx.confirmationToken.confirmedAt,
      },
    })

    // 4. 返回操作结果
    return {
      success: true,
      message: '过敏记录已保存',
      recordId: record.id,
      record: {
        id: record.id,
        allergen: record.allergen,
        symptoms: record.symptoms,
        severity: record.severity,
        occurrenceDate: record.occurrenceDate.toISOString(),
        source: record.source,
      },
    }
  },
}
```

**工具注册** — `backend/src/agent/tools/index.ts`

```typescript
import { AllergyQueryTool } from './allergyQuery.tool'
import { AllergyRecordTool } from './allergyRecord.tool'

export const tools: Tool[] = [
  CatInfoTool,
  HealthCheckTool,
  WeightTrendTool,
  VaccineCheckTool,
  RagSearchTool,
  AllergyQueryTool,   // ← 新增
  AllergyRecordTool,  // ← 新增
]
```

#### AgentRouter 更新 — 意图分类新增

**文件**：`backend/src/agent/core/AgentRouter.ts`

```typescript
export type IntentType =
  | 'greeting'
  | 'cat_info_query'
  | 'health_consultation'
  | 'general_knowledge'
  | 'allergy_query'       // ← 新增：过敏信息查询意图
  | 'allergy_record'      // ← 新增：过敏信息录入意图
  | 'health_report_request' // ← 预留：健康周报请求
  | 'mixed'
  | 'unknown'

function classifyIntent(userMessage: string): IntentType {
  const msg = userMessage.toLowerCase()

  // V2.0 关键词策略变更：
  // V1.0 把"皮肤""呕吐""拉肚子""敏感"等高频症状词纳入过敏触发条件，
  // 这些词在普通健康咨询中频繁出现（"奶糖最近皮肤怎么样""吃了东西呕吐了怎么办"），
  // 会导致大量 health_consultation 被误判为 allergy_*。
  //
  // V2.0 改为"过敏本体词 + 动作词"的组合匹配：
  // - 必须命中过敏本体词（过敏/过敏史/过敏原/食物过敏）
  // - 症状词不再单独触发过敏意图，只在已命中本体词时用于辅助分类
  const ALLERGY_BODY_KEYWORDS = ['过敏', '过敏史', '过敏原', '食物过敏']
  const RECORD_ACTION_KEYWORDS = ['记录', '新增', '添加', '记住', '录入', '记一下', '帮他记', '帮她记']
  const QUERY_ACTION_KEYWORDS = ['有哪些', '都有什么', '查询', '看看', '显示', '历史', '之前', '以前']

  const hasAllergyBody = ALLERGY_BODY_KEYWORDS.some(kw => msg.includes(kw))

  if (hasAllergyBody) {
    // 已确认是过敏相关，再按动作词细分
    if (RECORD_ACTION_KEYWORDS.some(kw => msg.includes(kw))) {
      return 'allergy_record'
    }
    return 'allergy_query'
  }

  // 症状词单独出现时归入 health_consultation（而非误判为过敏）
  // 例："奶糖皮肤有点红" → health_consultation（可能附带查询过敏，由 Planner 决定）
  // ... 原有其他意图识别
}
```

> **误触发测试用例（必须在测试中覆盖）**
>
> | 用户输入 | V1.0 结果 | V2.0 结果 | 期望 |
> |---------|----------|----------|------|
> | "奶糖最近皮肤有点红" | `allergy_query` | `health_consultation` | health_consultation |
> | "奶糖吃了东西呕吐了" | `allergy_query` | `health_consultation` | health_consultation |
> | "奶糖有哪些过敏" | `allergy_query` | `allergy_query` | allergy_query |
> | "帮奶糖记一下鸡肝过敏" | `allergy_record` | `allergy_record` | allergy_record |
> | "奶糖最近老挠，是不是过敏了" | `allergy_query` | `health_consultation`（带过敏暗示） | 待定，建议 health_consultation |
>
> 注：第五例的"是不是过敏了"是询问而非陈述，V2.0 不直接归类为 allergy_query，
> 而是走 health_consultation 让 Planner 决定是否附带查询过敏工具。

#### AgentPlanner 更新 — 工具规划

**文件**：`backend/src/agent/core/AgentPlanner.ts`

```typescript
function buildPlan(intent: IntentType, ctx: AgentContext): PlanStep[] {
  switch (intent) {
    case 'allergy_query':
      return [
        { toolName: 'get_cat_info', reason: '获取猫咪基本信息' },
        { toolName: 'GET_allergy_records', reason: '获取过敏记录' },
      ]

    case 'allergy_record':
      return [
        { toolName: 'get_cat_info', reason: '获取猫咪基本信息' },
        {
          toolName: 'ADD_allergy_record',
          reason: '创建过敏记录（需用户确认）',
          requiresConfirmation: true,  // V2.0 新增：写入工具标记
        },
      ]

    case 'health_consultation':
      return [
        { toolName: 'get_cat_info', reason: '获取猫咪档案' },
        { toolName: 'check_health', reason: '健康分析' },
        { toolName: 'check_vaccine', reason: '疫苗状态' },
        { toolName: 'GET_allergy_records', reason: '过敏信息' }, // ← 健康咨询附带查询过敏（只读）
      ]

    // ... 其他意图
  }
}
```

#### 多轮确认流程（V2.0 新增）

> **为什么需要这个流程**
> V1.0 假设 Agent 是一次性管道（sendMessage → 单次 SSE 流 → done）。
> 但 `ADD_allergy_record` 是写入操作，必须给用户**确认或修改**的机会，
> 这就要求 Agent 能够**挂起执行、等待用户响应、再恢复执行**。
>
> 本节定义最小的多轮确认协议，不引入完整的对话状态机，仅服务于写入工具。

**SSE 事件扩展** — 新增 `pending_confirmation` 事件类型

```typescript
// 当 Executor 遇到 requiresConfirmation: true 的工具时，不直接执行，
// 而是向客户端推送 pending_confirmation 事件，并挂起当前 SSE 流。

interface PendingConfirmationEvent {
  type: 'pending_confirmation'
  confirmationId: string          // 确认令牌 ID（UUID）
  toolName: string                // 待执行的工具名
  draft: Record<string, unknown>  // 预填草稿（供用户检视/修改）
  message: string                 // 给用户的提示语
  expiresAt: number               // 过期时间戳（默认 5 分钟）
}

// 完整事件流（含确认分支）：
// meta → tool(get_cat_info) → pending_confirmation → [流挂起]
//   ↓ （用户确认）
//   POST /api/chat/confirm  { confirmationId, action: 'confirm' | 'cancel' | 'edit', edits? }
//   ↓
//   tool(ADD_allergy_record) → content → done
```

**后端确认端点** — `POST /api/chat/confirm`

```typescript
// backend/src/controllers/chat.controller.ts

interface ConfirmRequest {
  confirmationId: string
  action: 'confirm' | 'cancel' | 'edit'
  edits?: Record<string, unknown>  // action='edit' 时用户提供修改后的字段
}

// 端点逻辑：
// 1. 查找 confirmationId 对应的挂起会话（Redis 或内存 Map，TTL 5 分钟）
// 2. 校验请求者 userId 与挂起会话的 userId 一致
// 3. 根据 action：
//    - confirm → 用原 draft 调用工具
//    - edit    → 合并 edits 后调用工具
//    - cancel  → 终止流程，返回取消消息
// 4. 工具执行完成后，恢复之前的 SSE 流（推送 tool → content → done）
```

**AgentContext 扩展**

```typescript
// backend/src/agent/types/agent.ts

interface AgentContext {
  userId: string
  sessionId: string
  selectedCatId?: string
  traceId: string
  logger: Console
  // V2.0 新增：确认令牌（仅写入工具需要）
  confirmationToken?: {
    verified: boolean
    confirmedAt: Date
    confirmationId: string
  }
}
```

**前端确认交互** — 在 ChatMessage.vue 中渲染确认卡片

```vue
<!-- 确认卡片：Agent 推送 pending_confirmation 后渲染 -->
<AllergyConfirmCard
  v-if="message.agentMeta?.pendingConfirmation"
  :confirmation="message.agentMeta.pendingConfirmation"
  @confirm="onConfirm"
  @edit="onEdit"
  @cancel="onCancel"
/>
```

```typescript
// 前端调用确认端点
async function onConfirm(confirmationId: string) {
  await api.post('/api/chat/confirm', {
    confirmationId,
    action: 'confirm',
  })
  // 后端恢复 SSE 流，前端继续接收 tool/content/done 事件
}
```

#### 前端类型扩展

**文件**：`frontend/src/types/chat.ts`

```typescript
// 过敏记录类型
export interface AllergyRecord {
  id: string
  allergen: string          // 过敏原
  symptoms: string          // 症状描述
  severity: 'mild' | 'moderate' | 'severe'  // 严重程度（与后端 enum 对齐）
  occurrenceDate: string    // ISO 日期字符串
  treatment?: string        // 处理方式
  notes?: string            // 备注
  // V2.0 审计字段
  source?: 'agent' | 'manual' | 'imported'  // 数据来源
  confirmedAt?: string | null               // 用户确认时刻（仅 agent 来源）
}

export interface AllergyToolOutput {
  success: boolean
  totalRecords: number
  records: AllergyRecord[]
  allergens: string[]              // 所有过敏原列表
  lastOccurrence: string | null
  patternAnalysis?: {              // 模式分析（可选）
    topAllergens: string[]           // 主要过敏原
    seasonalPattern?: string         // 季节性模式描述
    recentCount: number              // 近期发作次数
  }
}
```

### 🎨 前端 UI 设计

#### 组件：过敏信息卡片（Allergy Card）

**文件**：`frontend/src/components/chat/AllergyCard.vue`（新增）

```
┌────────────────────────────────────────────────────────────┐
│  🤒 过敏信息追踪（结构化卡片）                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  【猫咪信息】 🐱 奶糖（英短 · 2岁3个月）                       │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🔴 过敏原列表：                                        │ │
│  │                                                         │ │
│  │  • 🥩 鸡肝          [最近：3天前] [症状：皮肤红斑]       │ │
│  │  • 🐟 鱼粮          [最近：1周前] [症状：呕吐]           │ │
│  │  • 🦗 跳蚤          [最近：2周前] [症状：抓挠]           │ │
│  │  • 🌸 花粉          [最近：2个月前] [症状：打喷嚏]        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  🕒 过敏记录时间轴（最近30天）                           │ │
│  │                                                         │ │
│  │  2026/06                                               │ │
│  │  01 ──02──03──04──05──●──07──08──09──10──11──●──13──14 │ │
│  │              🥩 鸡肝                              🐟 鱼粮│ │
│  │  [中等]                                           [轻微]│ │
│  │                                                         │ │
│  │  💡 建议：近期过敏频次有所增加，建议控制饮食中蛋白质来源    │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  总计：4 条记录 · 最近发作：3天前 · 主要过敏原：鸡肝         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**交互设计**：
- 点击过敏原 → 查看该过敏原的所有历史记录
- 点击时间轴上的节点 → 查看具体事件详情
- "记录新过敏"按钮 → 打开对话式录入表单

#### 过敏信息录入流程

```
用户：奶糖吃了鸡肝又过敏了

  ↓
Agent：（识别意图：allergy_record）

  ↓
Agent 卡片提示：
┌─────────────────────────────────────────┐
│ 📝 为您记录这次过敏事件                    │
│                                           │
│  确认信息：                                │
│  • 猫咪：奶糖                              │
│  • 过敏原：鸡肝                            │
│  • 症状：皮肤红斑（已自动识别）             │
│  • 严重程度：中等                           │
│  • 日期：今天（2026/06/14）                 │
│                                           │
│  [确认记录]  [修改信息]                    │
└─────────────────────────────────────────┘

  ↓
用户点击【确认记录】

  ↓
（后端执行 ADD_allergy_record）

  ↓
Agent：✅ 已为奶糖记录新的过敏信息
       共记录 4 条过敏事件
       （展示更新后的过敏卡片）
```

#### 在 ChatMessage.vue 中集成过敏卡片

```vue
<!-- frontend/src/components/chat/ChatMessage.vue -->

<script setup lang="ts">
import AllergyCard from './AllergyCard.vue'

const allergyInfo = computed(() => {
  const tool = props.message.agentMeta?.toolCalls?.find(
    t => t.name === 'GET_allergy_records'
  )
  return tool?.output as AllergyToolOutput | undefined
})
</script>

<template>
  <div v-if="isAgentMessage" class="agent-bubble">
    <!-- 执行轨迹折叠面板 -->
    <ExecutionTracePanel v-if="showExecutionTrace" />

    <!-- 工具调用进度条 -->
    <div class="agent-tool-stack">...</div>

    <!-- 结构化数据卡片区域 -->
    <div v-if="toolDoneCount === toolCount" class="agent-summary-cards">
      <!-- 原有的健康评估卡片、体重趋势卡片等 -->
      <HealthSummaryCard v-if="healthSummary()" />

      <!-- 新增：过敏信息卡片 -->
      <AllergyCard
        v-if="allergyInfo"
        :allergy-info="allergyInfo"
        @record="onAllergyRecord"
      />
    </div>
  </div>
</template>
```

### 🔑 设计要点

| 维度 | 设计决策 | 原因 |
|------|---------|------|
| **数据结构** | 独立表（allergy_records） | 可扩展，支持多维度查询（过敏原/时间/严重程度） |
| **读写分离** | 查询工具 / 录入工具分开 | 明确权限边界，避免误操作 |
| **触发方式** | 用户主动询问 / 健康咨询时附带 | 不强制推送，保持对话流自然 |
| **时间轴设计** | 横向时间轴（30天视图） | 直观展示发作频次和模式 |
| **录入体验** | Agent 主动确认信息后再写入 | 降低用户输入成本，提高数据准确性 |

---

## 功能三：可视化宠物健康周报（Visual Health Weekly Report）

> **V2.0 分期交付说明**
> 本功能字段较多，V2.0 拆分为两期：
> - **P2（核心周报）**：weightTrend + healthScore（不含 activity）+ highlights
> - **P4（增强）**：activityLevel + suggestions + toDoList
>
> 必须先解决"活动量数据源"缺口（见下方警告），才能交付完整版。

### ⚠️ 数据缺口警告（V2.0 新增）

**当前系统不存在活动量数据源。** Prisma schema 中没有 ActivityRecord 或类似表，
后端也没有 `getActivityData()` 的实现。如果直接按 V1.0 设计实施，会出现以下问题：

1. `activityLevel` 字段无数据可填，要么返回 null（评分引擎的 20 分 activity 项变成假数据），要么硬编码默认值（误导用户）
2. 健康评分引擎中 `calculateActivityScore()` 无法计算，总分失真

**V2.0 应对方案（三选一，建议方案 A）**：

| 方案 | 做法 | 代价 |
|------|------|------|
| **A（推荐）** | 砍掉 activityLevel 维度，评分改为 weight 35 + vaccine 30 + allergy 35 | 周报不含活动量，但数据真实 |
| B | 先建活动量采集功能（独立大功能，需智能设备对接或手动录入） | 周期大幅拉长 |
| C | activityLevel 返回 null + UI 显示"暂无数据" | 用户体验差，评分仍失真 |

下文以**方案 A** 为基准展示字段结构；如选方案 B/C，activityLevel 相关字段保留但标注为可选。

### 🎯 设计目标

让 Agent **主动识别用户对"健康状况总结"的意图**，生成图文并茂的健康周报，以可视化图表替代纯文本描述，提升信息传达效率。

### ✨ 核心亮点

- **Agent 主动触发**：不依赖固定入口，用户问"奶糖这周健康状况总结"时自动生成
- **内嵌对话流**：周报卡片直接嵌入对话消息流，不占用导航位置
- **数据真实**：整合体重趋势、健康评分、疫苗状态、过敏记录（活动量待数据源就绪后纳入）
- **交互友好**：可折叠查看详细数据，支持点击查看具体指标详情
- **分期交付**：核心周报（P2）先上线，建议与待办（P4）后续增强

### 🔧 后端实现

#### 后端工具：健康周报生成（GENERATE_health_report）

**文件**：`backend/src/agent/tools/healthReport.tool.ts`

```typescript
/**
 * 宠物健康周报生成工具
 * 聚合多维度数据（体重、健康、疫苗、过敏、活动量等）生成结构化周报
 */
export const HealthReportTool: Tool<
  z.infer<typeof HealthReportSchema>,
  HealthReportOutput
> = {
  name: 'GENERATE_health_report',
  description: '生成宠物健康周报，整合体重趋势、健康评分、疫苗状态、过敏记录等多维度数据',
  schema: HealthReportSchema,
  permissions: ['read'],
  call: async (input, ctx: AgentContext) => {
    // 1. 确定时间范围（默认最近7天）
    const days = input.days || 7
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)

    // 2. 并行获取多维度数据
    // V2.0 变更：
    // - 使用 Promise.allSettled 替代 Promise.all，单个数据源失败不影响整份周报
    // - activityData 标注为可选：当前系统无活动量数据源（见"数据缺口警告"），
    //   方案 A 下该查询返回 null，评分引擎跳过 activity 维度
    const [catInfoR, weightR, healthR, vaccineR, allergyR, activityR] =
      await Promise.allSettled([
        prisma.cat.findUnique({ where: { id: input.catId } }),
        getWeightTrendData(input.catId, startDate, endDate),
        getHealthCheckData(input.catId, startDate, endDate),
        getVaccineStatusData(input.catId, startDate, endDate),
        getAllergyRecords(input.catId, startDate, endDate),
        getActivityData?.(input.catId, startDate, endDate) ?? Promise.resolve(null),
      ])

    // 工具函数：从 allSettled 结果中取值，失败时返回 null 并记录告警
    const unwrap = <T>(r: PromiseSettledResult<T>): T | null =>
      r.status === 'fulfilled' ? r.value : null

    const catInfo = unwrap(catInfoR)
    const weightData = unwrap(weightR)
    const healthData = unwrap(healthR)
    const vaccineData = unwrap(vaccineR)
    const allergyData = unwrap(allergyR)
    const activityData = unwrap(activityR)  // 当前始终为 null（数据源未实现）

    // 3. 数据聚合与分析（计算健康评分、趋势判断）
    // 评分引擎应根据 activityData 是否为 null 动态调整权重：
    // - 有 activityData：weight 30 + vaccine 25 + allergy 25 + activity 20
    // - 无 activityData：weight 35 + vaccine 30 + allergy 35（方案 A）
    const report = aggregateHealthReport({
      catId: input.catId,
      startDate,
      endDate,
      catInfo,
      weightData,
      healthData,
      vaccineData,
      allergyData,
      activityData,
    })

    // 4. 生成建议（P4 阶段实现，P2 返回空数组）
    const suggestions = featureFlags.HEALTH_REPORT_SUGGESTIONS
      ? generateHealthSuggestions(report)
      : []

    // 5. 生成待办事项（P4 阶段实现，P2 返回空数组）
    const toDoList = featureFlags.HEALTH_REPORT_TODO
      ? generateToDoList(report)
      : []

    // 6. 返回结构化输出（供前端渲染图表和卡片）
    return {
      success: true,
      reportType: 'weekly',
      timeRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        durationDays: days,
      },
      catInfo: {
        id: catInfo?.id,
        name: catInfo?.name,
        breed: catInfo?.breed,
        age: catInfo?.age,
        gender: catInfo?.gender,
      },

      // 体重趋势（前端渲染折线图）
      weightTrend: report.weightTrend,
      // {
      //   currentWeight: 4.58,
      //   previousWeight: 4.52,
      //   changePercent: +1.32,
      //   trend: 'stable',   // 'up' | 'down' | 'stable'
      //   dailyRecords: [
      //     { date: '2026-06-07', weight: 4.52 },
      //     { date: '2026-06-09', weight: 4.54 },
      //     { date: '2026-06-11', weight: 4.56 },
      //     { date: '2026-06-14', weight: 4.58 },
      //   ],
      //   standardRange: { min: 4.0, max: 5.5 },
      //   unit: 'kg',
      // }

      // 健康评分（0-100）
      healthScore: report.healthScore,
      // {
      //   total: 92,
      //   level: 'excellent',   // 'excellent' | 'good' | 'fair' | 'poor'
      //   breakdown: {
      //     weight:   { score: 28, maxScore: 30 },  // 体重指标
      //     vaccine:  { score: 25, maxScore: 25 },  // 疫苗指标
      //     allergy:  { score: 22, maxScore: 25 },  // 过敏指标
      //     activity: { score: 17, maxScore: 20 },  // 活动指标
      //   },
      //   previousWeekScore: 90,
      //   change: +2,
      // }

      // 疫苗状态
      vaccineStatus: report.vaccineStatus,
      // {
      //   upToDate: true,
      //   totalVaccines: 8,
      //   recentVaccinations: [],   // 本周内接种的疫苗
      //   nextDueDate: '2026-08-15',  // 下次到期日期
      //   nextDueVaccine: '狂犬病疫苗',
      // }

      // 过敏摘要
      allergySummary: report.allergySummary,
      // {
      //   totalRecords: 4,
      //   recentOccurrences: 2,    // 本周发作次数
      //   topAllergens: ['鸡肝', '鱼粮'],
      //   alert: '近期过敏频次有所增加', // null | string
      // }

      // 活动量（可选）
      activityLevel: report.activityLevel,
      // {
      //   score: 4.5,             // 0-5
      //   level: 'normal',        // 'high' | 'normal' | 'low'
      //   trend: 'stable',
      //   notes: '活动量正常',
      // }

      // 关键发现亮点（按 positive/neutral/warning 分类）
      highlights: report.highlights,
      // [
      //   {
      //     type: 'positive',
      //     title: '体重保持稳定',
      //     detail: '本周体重波动在正常范围内（4.52kg → 4.58kg）',
      //   },
      //   {
      //     type: 'positive',
      //     title: '疫苗状态完整',
      //     detail: '所有疫苗均在有效期内，下一次接种在 2 个月后',
      //   },
      //   {
      //     type: 'warning',
      //     title: '过敏频次增加',
      //     detail: '本周发作2次，主要过敏原为鸡肝，建议控制饮食',
      //   },
      // ]

      // 针对本周的健康建议（按优先级排序）
      suggestions: suggestions,
      // [
      //   {
      //     priority: 'high',
      //     category: 'diet',
      //     title: '控制鸡肝摄入',
      //     content: '最近两次过敏均与食用鸡肝有关，建议暂停鸡肝作为主食或零食，替换为低过敏蛋白源如鸭肉或羊肉',
      //     icon: '🥩',
      //   },
      //   {
      //     priority: 'medium',
      //     category: 'monitor',
      //     title: '继续监测体重',
      //     content: '建议每周记录一次体重，观察长期趋势变化，当前体重处于正常范围',
      //     icon: '📊',
      //   },
      //   {
      //     priority: 'medium',
      //     category: 'vaccine',
      //     title: '提前安排疫苗接种',
      //     content: '狂犬病疫苗将于8月15日到期，建议提前1周预约接种，确保免疫连续性',
      //     icon: '💉',
      //   },
      // ]

      // 下周待办事项（可交互，用户可标记完成）
      toDoList: toDoList,
      // [
      //   { dueDate: '2026-06-21', task: '记录体重数据', completed: false },
      //   { dueDate: '2026-06-28', task: '健康状态检查',   completed: false },
      //   { dueDate: '2026-08-15', task: '狂犬病疫苗接种', completed: false },
      // ]
    }
  },
}
```

#### 健康评分规则引擎

> **V2.0 动态权重说明**
> V1.0 使用固定权重（weight 30 + vaccine 25 + allergy 25 + activity 20）。
> 当 activityData 为 null（当前系统无数据源）时，20 分的 activity 项无法计算，
> 导致总分上限只有 80 分，评分失真。
>
> V2.0 改为动态权重：
> - 有 activityData：weight 30 + vaccine 25 + allergy 25 + activity 20（满分 100）
> - 无 activityData：weight 35 + vaccine 30 + allergy 35（满分 100，等比放大）

```typescript
// backend/src/agent/tools/healthReport.tool.ts

/**
 * 根据多维度指标计算综合健康评分
 * 支持动态权重：activityData 缺失时自动调整其他维度权重
 */
function calculateHealthScore(data: HealthData): {
  total: number
  level: string
  breakdown: ScoreBreakdown
  change: number
  weightingMode: 'full' | 'without_activity'  // V2.0 新增：标记权重模式
} {
  const hasActivity = data.activityData != null

  // 根据是否有活动量数据选择权重表
  const weights = hasActivity
    ? { weight: 30, vaccine: 25, allergy: 25, activity: 20 }
    : { weight: 35, vaccine: 30, allergy: 35, activity: 0 }  // 方案 A

  const breakdown = {
    weight: { ...calculateWeightScore(data.weightData), maxScore: weights.weight },
    vaccine: { ...calculateVaccineScore(data.vaccineData), maxScore: weights.vaccine },
    allergy: { ...calculateAllergyScore(data.allergyData), maxScore: weights.allergy },
    ...(hasActivity
      ? { activity: { ...calculateActivityScore(data.activityData), maxScore: weights.activity } }
      : {}),
  }

  const total = Object.values(breakdown).reduce((sum, b) => sum + b.score, 0)

  return {
    total,
    level: total >= 90 ? 'excellent' : total >= 75 ? 'good' : total >= 60 ? 'fair' : 'poor',
    breakdown,
    change: total - (data.previousWeekScore ?? 0),
    weightingMode: hasActivity ? 'full' : 'without_activity',
  }
}
```

#### AgentRouter 和 AgentPlanner 更新

```typescript
// 新增意图
type IntentType =
  // ... 原有意图
  | 'health_report_request'   // 请求健康总结/周报
  | 'mixed'
  | 'unknown'

function classifyIntent(userMessage: string): IntentType {
  // ... 原有逻辑

  // V2.0 关键词策略变更：
  // V1.0 把"总结""这周""本周""状况""近况"等高频词纳入周报触发条件，
  // 这些词在非周报场景频繁出现：
  // - "这周猫粮还剩多少" → 误触发周报
  // - "总结一下猫咪的品种信息" → 误触发周报
  // - "本周天气怎么样" → 误触发周报
  //
  // V2.0 改为"时间范围词 + 健康词"的组合匹配：
  const TIME_KEYWORDS = ['这周', '本周', '最近一周', '上周', '近一周', '周报']
  const HEALTH_KEYWORDS = ['健康', '健康状况', '健康总结', '健康报告', '整体健康']

  const hasTime = TIME_KEYWORDS.some(kw => userMessage.includes(kw))
  const hasHealth = HEALTH_KEYWORDS.some(kw => userMessage.includes(kw))

  // 必须同时命中时间词和健康词，才触发周报意图
  // 例外：直接说"健康周报""健康报告"等明确词时单独触发
  const EXPLICIT_REPORT_KEYWORDS = ['健康周报', '健康报告', '健康状况总结']
  const isExplicit = EXPLICIT_REPORT_KEYWORDS.some(kw => userMessage.includes(kw))

  if (isExplicit || (hasTime && hasHealth)) {
    return 'health_report_request'
  }
}

// 工具规划
function buildPlan(intent: IntentType, ctx: AgentContext): PlanStep[] {
  switch (intent) {
    case 'health_report_request':
      return [
        { toolName: 'get_cat_info', reason: '获取猫咪档案' },
        { toolName: 'GENERATE_health_report', reason: '生成健康周报' },
        { toolName: 'rag_search', reason: '获取知识库建议' },
      ]

    // ... 其他意图
  }
}
```

### 前端实现

#### 前端类型扩展

```typescript
// frontend/src/types/chat.ts

// 健康周报类型
export interface HealthWeeklyReport {
  reportType: 'weekly' | 'monthly' | 'summary'
  timeRange: {
    startDate: string
    endDate: string
    durationDays: number
  }
  catInfo: {
    id: string
    name: string
    breed: string
    age: string
    gender: string
  }

  // 体重趋势（供前端绘制折线图）
  weightTrend: {
    currentWeight: number
    previousWeight: number
    changePercent: number
    trend: 'up' | 'down' | 'stable'
    dailyRecords: Array<{
      date: string
      weight: number
    }>
    standardRange: { min: number; max: number }
    unit: string
  }

  // 健康评分（供前端绘制环形进度图）
  healthScore: {
    total: number
    level: 'excellent' | 'good' | 'fair' | 'poor'
    breakdown: {
      weight: { score: number; maxScore: number }
      vaccine: { score: number; maxScore: number }
      allergy: { score: number; maxScore: number }
      activity: { score: number; maxScore: number }
    }
    previousWeekScore: number
    change: number
  }

  // 疫苗状态
  vaccineStatus: {
    upToDate: boolean
    totalVaccines: number
    recentVaccinations: Array<{ name: string; date: string }>
    nextDueDate?: string
    nextDueVaccine?: string
  }

  // 过敏摘要
  allergySummary: {
    totalRecords: number
    recentOccurrences: number
    topAllergens: string[]
    alert?: string | null
  }

  // 活动量
  activityLevel: {
    score: number
    level: 'high' | 'normal' | 'low'
    trend: 'up' | 'down' | 'stable'
    notes?: string
  }

  // 关键发现（前端分类渲染）
  highlights: Array<{
    type: 'positive' | 'neutral' | 'warning'
    title: string
    detail: string
  }>

  // 健康建议
  suggestions: Array<{
    priority: 'high' | 'medium' | 'low'
    category: 'diet' | 'exercise' | 'vaccine' | 'allergy' | 'general'
    title: string
    content: string
    icon?: string
  }>

  // 待办事项（前端支持点击标记完成）
  toDoList: Array<{
    dueDate: string
    task: string
    completed: boolean
  }>
}
```

#### 前端组件：健康周报卡片（HealthReportCard.vue）

```vue
<!-- frontend/src/components/chat/HealthReportCard.vue -->
<template>
  <div class="health-report-card">
    <!-- 顶部：猫咪信息 + 时间范围 -->
    <div class="report-header">
      <div class="report-title">
        <span class="report-icon">📊</span>
        <span>{{ report.catInfo.name }}的健康周报</span>
      </div>
      <div class="report-date">
        {{ formatDateRange(report.timeRange.startDate, report.timeRange.endDate) }}
      </div>
    </div>

    <!-- 核心：体重趋势图 -->
    <div class="weight-trend-section">
      <div class="section-title">📈 体重趋势</div>
      <div class="weight-chart">
        <!-- 纯 SVG 折线图（不依赖图表库） -->
        <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`">
          <!-- 标准范围背景 -->
          <rect
            :x="0"
            :y="standardMinY"
            :width="chartWidth"
            :height="standardMaxY - standardMinY"
            fill="rgba(255, 228, 181, 0.2)"
            stroke="#FFD8A8"
            stroke-dasharray="4,4"
          />
          <!-- 折线 -->
          <polyline
            :points="weightPoints"
            fill="none"
            stroke="#E8924A"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <!-- 数据点 -->
          <circle
            v-for="(point, idx) in report.weightTrend.dailyRecords"
            :key="idx"
            :cx="getX(idx)"
            :cy="getY(point.weight)"
            r="4"
            fill="#E8924A"
          />
        </svg>
        <!-- X轴日期标签 -->
        <div class="weight-x-labels">
          <span
            v-for="(point, idx) in report.weightTrend.dailyRecords"
            :key="idx"
            :style="{ left: `${(idx / (report.weightTrend.dailyRecords.length - 1)) * 100}%` }"
          >
            {{ formatShortDate(point.date) }}
          </span>
        </div>
      </div>
      <div class="weight-summary">
        当前：{{ report.weightTrend.currentWeight }}{{ report.weightTrend.unit }}
        <span :class="trendClass">
          {{ trendSign }}{{ Math.abs(report.weightTrend.changePercent).toFixed(2) }}%
        </span>
        · 较上周{{ report.weightTrend.trend === 'up' ? '上升' : report.weightTrend.trend === 'down' ? '下降' : '稳定' }}
      </div>
      <div class="weight-standard">
        标准范围：{{ report.weightTrend.standardRange.min }} - {{ report.weightTrend.standardRange.max }}{{ report.weightTrend.unit }}
      </div>
    </div>

    <!-- 双栏：健康评分 + 活动量 -->
    <div class="score-row">
      <!-- 健康评分（SVG 环形图） -->
      <div class="score-card">
        <div class="score-title">🎯 健康评分</div>
        <div class="score-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#F8E8D8" stroke-width="10" />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              :stroke="scoreColor"
              stroke-width="10"
              :stroke-dasharray="`${scoreDashLength} 314`"
              stroke-linecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div class="score-text">
            <span class="score-value">{{ report.healthScore.total }}</span>
            <span class="score-divider">/</span>
            <span class="score-max">100</span>
            <span class="score-level">{{ scoreLevelText }}</span>
          </div>
        </div>
        <div class="score-change" :class="report.healthScore.change >= 0 ? 'positive' : 'negative'">
          {{ report.healthScore.change >= 0 ? '↑' : '↓' }} 较上周 {{ Math.abs(report.healthScore.change) }}
        </div>
        <!-- 分项评分明细 -->
        <div class="score-breakdown">
          <div v-for="(item, key) in report.healthScore.breakdown" :key="key" class="breakdown-item">
            <span class="breakdown-label">{{ scoreItemLabel(key) }}</span>
            <div class="breakdown-bar">
              <div class="bar-bg">
                <div class="bar-fill" :style="{ width: `${(item.score / item.maxScore) * 100}%` }"></div>
              </div>
              <span class="breakdown-score">{{ item.score }}/{{ item.maxScore }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 活动量（星级展示） -->
      <div class="activity-card">
        <div class="score-title">🏃 活动量</div>
        <div class="activity-stars">
          <span
            v-for="i in 5"
            :key="i"
            :class="i <= Math.floor(report.activityLevel.score) ? 'star-filled' : 'star-empty'"
          >★</span>
          <span class="activity-score">{{ report.activityLevel.score.toFixed(1) }}/5.0</span>
        </div>
        <div class="activity-level">{{ activityLevelText }}</div>
        <div class="activity-trend">
          趋势：{{ report.activityLevel.trend === 'up' ? '上升' : report.activityLevel.trend === 'down' ? '下降' : '稳定' }}
        </div>
        <div v-if="report.activityLevel.notes" class="activity-notes">
          💡 {{ report.activityLevel.notes }}
        </div>
      </div>
    </div>

    <!-- 本周亮点（可折叠） -->
    <div class="highlights-section">
      <div class="section-title" @click="showHighlights = !showHighlights">
        🔔 本周亮点 <span class="toggle-icon">{{ showHighlights ? '▼' : '▶' }}</span>
      </div>
      <div v-show="showHighlights" class="highlights-list">
        <div
          v-for="(item, idx) in report.highlights"
          :key="idx"
          :class="['highlight-item', item.type]"
        >
          <span class="highlight-icon">
            {{ item.type === 'positive' ? '✅' : item.type === 'warning' ? '⚠️' : 'ℹ️' }}
          </span>
          <div class="highlight-content">
            <div class="highlight-title">{{ item.title }}</div>
            <div class="highlight-detail">{{ item.detail }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 健康建议（按优先级排序，高优先级置顶） -->
    <div class="suggestions-section">
      <div class="section-title">💡 本周健康建议</div>
      <div class="suggestions-list">
        <div
          v-for="(item, idx) in sortedSuggestions"
          :key="idx"
          :class="['suggestion-item', `priority-${item.priority}`]"
        >
          <div class="suggestion-header">
            <span class="suggestion-icon">{{ item.icon || '📝' }}</span>
            <div class="suggestion-title-row">
              <span class="suggestion-title">{{ item.title }}</span>
              <span :class="['priority-badge', item.priority]">{{ priorityText(item.priority) }}</span>
            </div>
          </div>
          <div class="suggestion-content">{{ item.content }}</div>
        </div>
      </div>
    </div>

    <!-- 下周待办事项（V2.0：通过 todoCompleted() 读取状态，不直接 mutate props） -->
    <div v-if="report.toDoList && report.toDoList.length > 0" class="todo-section">
      <div class="section-title">📋 待办事项</div>
      <div class="todo-list">
        <label
          v-for="(item, idx) in report.toDoList"
          :key="idx"
          :class="['todo-item', todoCompleted(idx) ? 'completed' : '']"
          @click="toggleTodo(idx)"
        >
          <span class="todo-checkbox">{{ todoCompleted(idx) ? '✓' : '' }}</span>
          <span class="todo-text">{{ item.task }}</span>
          <span class="todo-date">{{ formatShortDate(item.dueDate) }}</span>
        </label>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="report-footer">
      <div class="footer-hint">
        🤔 想了解更多？可询问"{{ report.catInfo.name }}的详细体重变化"或"过敏记录"
      </div>
      <button class="share-btn" @click="$emit('export', report)">📥 导出报告</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HealthWeeklyReport } from '../../types/chat'

const props = defineProps<{
  report: HealthWeeklyReport
}>()

const emit = defineEmits<{
  (e: 'expand'): void
  (e: 'export', data: HealthWeeklyReport): void
  // V2.0 变更：todo 事件携带完整 payload，便于父组件直接调用后端持久化
  (e: 'todo', payload: { index: number; completed: boolean }): void
}>()

const showHighlights = ref(true)

// 图表计算
const chartWidth = 280
const chartHeight = 120
const weightPoints = computed(() => {
  const records = props.report.weightTrend.dailyRecords
  return records.map((r, idx) => `${getX(idx)},${getY(r.weight)}`).join(' ')
})

function getX(idx: number): number {
  const total = props.report.weightTrend.dailyRecords.length
  return (idx / (total - 1)) * chartWidth
}

function getY(weight: number): number {
  const range = props.report.weightTrend.standardRange
  const padding = 10
  const normalizedY = chartHeight - padding -
    ((weight - range.min) / (range.max - range.min)) * (chartHeight - 2 * padding)
  return normalizedY
}

// 健康评分样式
const scoreColor = computed(() => {
  const score = props.report.healthScore.total
  if (score >= 90) return '#4CAF50'
  if (score >= 75) return '#FFA726'
  if (score >= 60) return '#FF7043'
  return '#E53935'
})

const scoreDashLength = computed(() => {
  return (props.report.healthScore.total / 100) * 314  // 圆周长 ≈ 2 * π * 50
})

const scoreLevelText = computed(() => {
  switch (props.report.healthScore.level) {
    case 'excellent': return '优秀'
    case 'good': return '良好'
    case 'fair': return '一般'
    case 'poor': return '需关注'
    default: return ''
  }
})

// 活动量文本
const activityLevelText = computed(() => {
  switch (props.report.activityLevel.level) {
    case 'high': return '活跃'
    case 'normal': return '正常'
    case 'low': return '偏少'
    default: return '正常'
  }
})

// 体重趋势样式
const trendClass = computed(() => {
  return 'trend-' + props.report.weightTrend.trend
})
const trendSign = computed(() => {
  return props.report.weightTrend.changePercent >= 0 ? '+' : ''
})

// 建议排序（高优先级 → 中 → 低）
const sortedSuggestions = computed(() => {
  const order = { high: 0, medium: 1, low: 2 }
  return [...props.report.suggestions].sort((a, b) => order[a.priority] - order[b.priority])
})

// 优先级文本
function priorityText(priority: string): string {
  return priority === 'high' ? '高优先' : priority === 'medium' ? '中优先' : '低优先'
}

// 待办切换（V2.0 修正：不直接 mutate props）
// V1.0 直接修改 props.report.toDoList[idx].completed，违反 Vue 单向数据流，
// 且没有后端持久化——刷新页面后状态丢失。
// V2.0 改为：仅向父组件发出事件，由父组件决定是否调用后端持久化接口。
// 本地乐观更新通过 ref 维护的本地副本实现，不污染 props。
const localTodoState = ref<Record<number, boolean>>({})

function toggleTodo(idx: number) {
  if (!props.report.toDoList) return
  // 本地乐观切换（不修改 props）
  const current = localTodoState.value[idx] ?? props.report.toDoList[idx].completed
  localTodoState.value[idx] = !current
  // 通知父组件，由父组件调用后端持久化（POST /api/chat/todo/toggle 等）
  emit('todo', { index: idx, completed: !current })
}

// 模板中读取待办状态时优先用 localTodoState
function todoCompleted(idx: number): boolean {
  if (!props.report.toDoList) return false
  return localTodoState.value[idx] ?? props.report.toDoList[idx].completed
}

// 日期格式化
function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`
}
function formatShortDate(date: string): string {
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// 评分项标签
function scoreItemLabel(key: string): string {
  const labels: Record<string, string> = {
    weight: '体重指标',
    vaccine: '疫苗状态',
    allergy: '过敏状况',
    activity: '活动量',
  }
  return labels[key] || key
}
</script>

<style scoped>
/* 奶油色系风格 */
.health-report-card {
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  border: 1.5px solid #FFE8D6;
  box-shadow: 0 4px 12px rgba(255, 200, 150, 0.15);
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #8B7355;
  margin: 16px 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.weight-trend-section {
  background: rgba(255, 255, 255, 0.6);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.score-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.score-card, .activity-card {
  background: rgba(255, 255, 255, 0.6);
  padding: 16px;
  border-radius: 12px;
}

/* 环形图居中 */
.score-ring {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 8px 0;
}
.score-text {
  position: absolute;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.score-value { font-size: 28px; font-weight: 700; color: #5D4E37; }
.score-max { font-size: 14px; color: #BC8F6F; }
.score-level { font-size: 12px; color: #8B7355; margin-top: 4px; }

/* 星级评分 */
.star-filled { color: #FFA726; font-size: 20px; }
.star-empty { color: #D7CCC8; font-size: 20px; }

/* 建议项（高优先级更醒目） */
.suggestion-item.priority-high {
  border-left: 4px solid #E53935;
  background: rgba(229, 57, 53, 0.05);
}
.suggestion-item.priority-medium {
  border-left: 4px solid #FFA726;
  background: rgba(255, 167, 38, 0.05);
}
.suggestion-item.priority-low {
  border-left: 4px solid #66BB6A;
  background: rgba(102, 187, 106, 0.05);
}

/* 待办列表 */
.todo-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.todo-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(4px);
}
.todo-item.completed {
  opacity: 0.6;
  text-decoration: line-through;
}
.todo-checkbox {
  width: 20px; height: 20px;
  border: 2px solid #D7CCC8;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  color: #4CAF50;
  font-weight: 700;
}
.todo-item.completed .todo-checkbox {
  border-color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

/* 响应式：移动端 → 单列布局 */
@media (max-width: 640px) {
  .score-row { grid-template-columns: 1fr; }
}
</style>
```

#### 在 ChatMessage.vue 中集成周报卡片

```vue
<!-- frontend/src/components/chat/ChatMessage.vue -->

<script setup lang="ts">
import HealthReportCard from './HealthReportCard.vue'
import type { HealthWeeklyReport } from '../../types/chat'

const reportData = computed(() => {
  const tool = props.message.agentMeta?.toolCalls?.find(
    t => t.name === 'GENERATE_health_report'
  )
  return tool?.output as HealthWeeklyReport | undefined
})
</script>

<template>
  <div v-if="isAgentMessage" class="agent-bubble">
    <!-- 执行轨迹折叠面板 -->
    <ExecutionTracePanel v-if="showExecutionTrace" />

    <!-- 工具调用进度条 -->
    <div class="agent-tool-stack">...</div>

    <!-- 结构化数据卡片区域 -->
    <div v-if="toolDoneCount === toolCount" class="agent-summary-cards">
      <!-- 新增：健康周报卡片（最显眼，位于最上方） -->
      <HealthReportCard
        v-if="reportData"
        :report="reportData"
        @export="onReportExport"
        @todo="onTodoAction"
      />

      <!-- 原有卡片：健康评估 / 体重趋势 / 过敏信息 -->
      <HealthSummaryCard v-if="healthSummary()" />
      <WeightTrendCard v-if="weightTrend()" />
      <AllergyCard v-if="allergyInfo" />
    </div>

    <!-- Markdown 文本内容 -->
    <div class="markdown-content" v-html="renderedContent"></div>
  </div>
</template>
```

### 🎨 前端 UI 设计概览

```
┌───────────────────────────────────────────────────────────────┐
│  📊 奶糖的健康周报（2026/06/07 - 2026/06/14）                   │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  📈 体重趋势图（SVG 折线图）                                   │
│  [4.58 kg 当前] [↑ +1.32% · 稳定]                             │
│  标准范围：4.00 - 5.50 kg                                      │
│                                                               │
│  ┌─────────────────────┐   ┌───────────────────────────────┐  │
│  │ 🎯 健康评分 92/100  │   │ 🏃 活动量 ★★★★☆ 4.5/5.0      │  │
│  │ [   ████████   ] 优秀│   │ 正常 · 趋势稳定                │  │
│  │ 体重  28/30 ███████│ │   │ 💡建议：保持现有运动量        │  │
│  │ 疫苗  25/25 ███████│ │   │                               │  │
│  │ 过敏  22/25 █████  │ │   │                               │  │
│  │ 活动  17/20 ██████ │ │   │                               │  │
│  │ ↑ 较上周 +2          │   │                               │  │
│  └─────────────────────┘   └───────────────────────────────┘  │
│                                                               │
│  🔔 本周亮点 [可折叠]                                         │
│  ✅ 体重保持稳定，波动在正常范围内                             │
│  ✅ 疫苗状态完整，所有疫苗均在有效期内                         │
│  ⚠️ 过敏频次增加，本周发作2次，主要过敏原鸡肝                  │
│                                                               │
│  💡 本周健康建议（按优先级）                                   │
│  🥩 [高]控制鸡肝摄入：最近两次过敏均与食用鸡肝相关             │
│  📊 [中]继续监测体重：建议每周记录一次体重                    │
│  💉 [中]提前安排疫苗接种：狂犬病疫苗8月15日到期               │
│  🏃 [低]保持运动量：保持每日互动时间                          │
│                                                               │
│  📋 待办事项 [可勾选]                                         │
│  [ ] 06/21 记录体重数据                                       │
│  [ ] 06/28 健康状态检查                                       │
│  [ ] 08/15 狂犬病疫苗接种                                     │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 🔑 设计要点

| 维度 | 设计决策 | 原因 |
|------|---------|------|
| **触发方式** | Agent 主动识别意图 | 用户无需找功能入口，对话即可获得 |
| **位置** | 卡片位于消息流中（导航无入口） | 不占用固定导航，保持界面简洁 |
| **内容聚合** | 单一工具完成数据聚合（内部并行查询） | 前端无需处理多工具数据合并 |
| **图表实现** | 纯 CSS + SVG 折线图 + 环形进度图 | 无第三方图表库依赖；加载快；风格统一 |
| **信息层级** | 概览 → 详情（可展开） | 首屏展示关键点；按需查看详情 |
| **建议排序** | 高/中/低优先级 三色标记（红/橙/绿） | 帮助用户聚焦最关键的健康问题 |
| **可操作性** | 待办事项 + 建议（用户可勾选完成） | 周报不仅展示信息，还可行动 |
| **响应式** | 桌面双栏 → 移动单栏 | 适配不同屏幕尺寸 |

---

## 🏗️ 架构前置依赖（V2.0 新增）

> 本节列出三项功能落地前**必须先解决的基础设施缺口**。
> 这些缺口与具体功能解耦，是整个 Agent 框架下一阶段演进的地基。

### 前置依赖一：AgentExecutor 权限中间件

**问题**：现有 5 个工具全部是 `permissions: ['read']`，[AgentExecutor.ts](backend/src/agent/core/AgentExecutor.ts) 没有写入权限的门控逻辑。`ADD_allergy_record` 是系统首个 write 工具，若直接执行会绕过用户确认。

**解决方案**：在 Executor 调用工具前插入权限中间件链。

```typescript
// backend/src/agent/core/AgentExecutor.ts（扩展）

interface ExecutionMiddleware {
  beforeToolCall?(tool: Tool, input: unknown, ctx: AgentContext): Promise<void | AbortSignal>
  afterToolCall?(tool: Tool, result: unknown, ctx: AgentContext): Promise<void>
}

// 写入工具的确认中间件
const requireConfirmationMiddleware: ExecutionMiddleware = {
  async beforeToolCall(tool, input, ctx) {
    if (!tool.permissions.includes('write')) return
    // 已携带有效 confirmationToken 则放行
    if (ctx.confirmationToken?.verified) return
    // 否则触发 pending_confirmation 流程，挂起执行
    throw new ConfirmationRequiredError({
      toolName: tool.name,
      draft: input,
    })
  },
}
```

**影响范围**：[AgentExecutor.ts](backend/src/agent/core/AgentExecutor.ts)、[AgentContext](backend/src/agent/types/agent.ts)、[chat.controller.ts](backend/src/controllers/chat.controller.ts)

### 前置依赖二：多轮确认状态机

**问题**：当前 chat 管道是**单次 SSE 流**（sendMessage → done），不支持"挂起 → 等待用户输入 → 恢复"。过敏录入需要这个能力。

**解决方案**：新增 `POST /api/chat/confirm` 端点 + 挂起会话存储。

| 存储选项 | 适用场景 | TTL |
|---------|---------|-----|
| 内存 Map（`Map<confirmationId, SuspendedSession>`） | 单实例部署、开发环境 | 进程级 |
| Redis | 多实例部署、生产环境 | 5 分钟（可配置） |

**协议设计**：详见 [功能二 · 多轮确认流程](#多轮确认流程v20-新增) 小节。

**影响范围**：新增 `backend/src/services/confirmation.service.ts`、[chat.controller.ts](backend/src/controllers/chat.controller.ts)、[chat.routes.ts](backend/src/routes/chat.routes.ts)

### 前置依赖三：活动量数据源

**问题**：健康周报的 `activityLevel` 维度无数据支撑。详见 [功能三 · 数据缺口警告](#️-数据缺口警告v20-新增)。

**解决方案**：分期决策

- **短期（P2）**：采用方案 A，砍掉 activity 维度，评分改为 weight 35 + vaccine 30 + allergy 35
- **长期（P5+）**：建设活动量采集能力（智能设备对接或手动录入），再纳入周报

### 前置依赖四：ChatMessage 组件拆分

**问题**：[ChatMessage.vue](frontend/src/components/chat/ChatMessage.vue) 已是复杂组件，集成三项新功能后单条 Agent 消息包含 7 个区块（执行轨迹 + 工具进度 + 周报 + 档案 + 健康 + 过敏 + 文本），会导致首屏渲染慢、视觉过载、维护困难。

**解决方案**：引入 AgentCardRenderer 策略模式，按 toolName 分发到独立卡片组件。

---

## 🧩 组件拆分方案（V2.0 新增）

### 现状与问题

V1.0 的 [ChatMessage.vue](frontend/src/components/chat/ChatMessage.vue) 通过 computed 属性（`healthSummary()`、`catSummary()`、`weightSummary()` 等）直接在主组件内渲染所有卡片。新增三项功能后：

- 主组件 import 数量激增
- 每个卡片的渲染条件散落在 template 各处
- 新增工具时必须修改 ChatMessage.vue（违反开闭原则）

### 目标架构：AgentCardRenderer

```
ChatMessage.vue
  └─ <AgentCardRenderer :tool-calls="message.agentMeta.toolCalls" />
        │
        ├─ 按 toolName 查找对应卡片组件
        ├─ 未注册的 toolName → 不渲染（降级）
        └─ 渲染顺序 = toolCalls 数组顺序

卡片组件注册表（cardRegistry.ts）:
  ┌──────────────────────────┬─────────────────────────┐
  │ toolName                 │ 卡片组件                 │
  ├──────────────────────────┼─────────────────────────┤
  │ get_cat_info             │ CatInfoCard.vue         │
  │ check_health             │ HealthSummaryCard.vue   │
  │ get_weight_trend         │ WeightTrendCard.vue     │
  │ check_vaccine            │ VaccineStatusCard.vue   │
  │ rag_search               │ CitationsCard.vue       │
  │ GET_allergy_records      │ AllergyCard.vue (新)    │
  │ GENERATE_health_report   │ HealthReportCard.vue(新)│
  └──────────────────────────┴─────────────────────────┘
```

### 实现示例

```typescript
// frontend/src/components/chat/cardRegistry.ts
import type { Component } from 'vue'
import CatInfoCard from './CatInfoCard.vue'
import HealthSummaryCard from './HealthSummaryCard.vue'
import WeightTrendCard from './WeightTrendCard.vue'
import VaccineStatusCard from './VaccineStatusCard.vue'
import AllergyCard from './AllergyCard.vue'
import HealthReportCard from './HealthReportCard.vue'
import CitationsCard from './CitationsCard.vue'

export const cardRegistry: Record<string, Component> = {
  get_cat_info: CatInfoCard,
  check_health: HealthSummaryCard,
  get_weight_trend: WeightTrendCard,
  check_vaccine: VaccineStatusCard,
  GET_allergy_records: AllergyCard,
  GENERATE_health_report: HealthReportCard,
  rag_search: CitationsCard,
}
```

```vue
<!-- frontend/src/components/chat/AgentCardRenderer.vue -->
<template>
  <div class="agent-card-stack">
    <template v-for="call in toolCalls" :key="call.name">
      <component
        v-if="cardRegistry[call.name] && call.status === 'done'"
        :is="cardRegistry[call.name]"
        :tool-output="call.output"
        @confirm="$emit('confirm', $event)"
        @todo="$emit('todo', $event)"
        @export="$emit('export', $event)"
      />
    </template>
  </div>
</template>
```

### 收益

| 维度 | 改进前 | 改进后 |
|------|--------|--------|
| 新增工具卡片 | 修改 ChatMessage.vue | 只需在 cardRegistry 注册 |
| 主组件行数 | 持续膨胀 | 稳定（只含布局逻辑） |
| 卡片懒加载 | 不支持 | 可用 `defineAsyncComponent` 按需加载 |
| 测试隔离 | 难 | 每个卡片独立可测 |

### 迁移策略

1. 先抽出 `cardRegistry.ts` 和 `AgentCardRenderer.vue`
2. 把现有 computed 渲染逐个迁移到独立卡片组件
3. ChatMessage.vue 改为调用 AgentCardRenderer
4. 新功能（AllergyCard、HealthReportCard）直接以独立组件形式开发

---

## 📊 三功能集成总览

### Agent 执行流程对比

| 阶段 | 原有实现 | 新增功能后（V2.0） |
|------|---------|-----------|
| **意图识别** | 5 种基础意图 | 8 种意图（新增过敏查询、过敏录入、周报请求） |
| **工具规划** | 5 个工具（全只读） | 8 个工具（新增 2 只读 + 1 写入） |
| **SSE 事件流** | meta → tool → content → done | meta → trace → tool → [pending_confirmation] → content → done |
| **前端渲染** | 纯文本 + 简单数据卡片 | 执行轨迹面板 + 周报图表 + 过敏时间轴 + 建议列表（经 AgentCardRenderer 分发） |
| **交互方式** | 被动问答（纯对话） | 主动问答 + 交互式卡片（勾选、确认、点击查看详情） |
| **权限模型** | 无（全只读） | read/write 分离，write 工具需 confirmationToken |

### 消息卡片完整结构（扩展后）

> **V2.0 变更说明**
> - [1] 由"思维链"改为"执行轨迹"，措辞准确化
> - [3] 活动量维度在 P2 阶段不展示（数据源未就绪），P4 起纳入
> - 卡片经 [AgentCardRenderer](#组件拆分方案v20-新增) 按 toolName 分发渲染

```
┌─────────────────────────────────────────────────────────────────┐
│  Agent 消息卡片（完整功能版本，P4+ 阶段）                         │
│                                                                 │
│  [1] 🛰️  执行轨迹折叠面板（默认折叠，仅内部用户可见）             │
│       意图识别 → 工具规划 → 数据整合 → 生成回复（错峰淡入）        │
│                                                                 │
│  [2] 🔧 工具调用进度（流式展示）                                 │
│       每个工具从 loading → 完成动画，最终显示总耗时              │
│                                                                 │
│  [3] 📊 健康周报卡片（最显眼，位于顶部）                         │
│       ├─ 体重趋势图（SVG 折线图）                               │
│       ├─ 健康评分（环形进度图，动态权重）                       │
│       ├─ 活动量（星级评分）← P4 起，依赖活动量数据源             │
│       ├─ 本周亮点（positive / neutral / warning 分类展示）       │
│       ├─ 健康建议列表（按优先级排序：高/中/低，三色标记）← P4   │
│       └─ 待办事项（可勾选完成，后端持久化）← P4                 │
│                                                                 │
│  [4] 🐱 猫咪档案卡片（保留原有）                                 │
│                                                                 │
│  [5] ✅ 健康评估卡片（保留原有）                                 │
│                                                                 │
│  [6] 🤒 过敏信息卡片（新增）                                     │
│       ├─ 过敏原列表（最近发作时间 + 症状）                       │
│       └─ 30天时间轴（可视化发作频次）                           │
│                                                                 │
│  [7] 💡 Markdown 文本回答（保留 Agent 生成的自然语言总结）        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 新增特性开关总表（V2.0）

| 开关 Key | 默认状态（生产环境） | 功能描述 | 依赖 | 阶段 |
|---------|---------------------|---------|-----|------|
| `AGENT_EXECUTION_TRACE` | **关闭** | 展示 Agent 执行轨迹（Router/Planner/Executor/Reporter 流水线日志） | `AGENT_MODE`, `AGENT_TOOL_VISUALIZATION` | P3 |
| `ALLERGY_TRACKING_QUERY` | **开启** | 过敏历史查询（只读工具） | `AGENT_MODE` | P1 |
| `ALLERGY_TRACKING_RECORD` | **关闭** | 过敏信息录入（写入工具，需确认流程） | `ALLERGY_TRACKING_QUERY` | P3 |
| `HEALTH_WEEKLY_REPORT` | **开启** | 健康周报核心（体重 + 评分 + 亮点） | `AGENT_MODE` | P2 |
| `HEALTH_REPORT_SUGGESTIONS` | **关闭** | 周报健康建议（规则引擎生成） | `HEALTH_WEEKLY_REPORT` | P4 |
| `HEALTH_REPORT_TODO` | **关闭** | 周报待办事项（含后端持久化） | `HEALTH_WEEKLY_REPORT` | P4 |

> V1.0 的 `AGENT_COT_DISPLAY` 保留为 `AGENT_EXECUTION_TRACE` 的别名，过渡一个版本后移除。

### 扩展后的前端类型定义（V2.0）

```typescript
// 新增类型
TraceStep                   // 执行轨迹步骤（V2.0 重命名）
AllergyRecord              // 单条过敏记录（含 source/confirmedAt 审计字段）
AllergyToolOutput          // 过敏工具输出
HealthWeeklyReport         // 周报数据结构（activityLevel 标注为可选）

// 扩展类型
AgentMeta.executionTrace   // Agent 元数据新增执行轨迹字段（V2.0 重命名）
AgentMeta.pendingConfirmation  // 挂起的确认请求（V2.0 新增）
```

---

## 🛣️ 分期实施路线（V2.0 新增）

> 本路线基于"风险最低、价值最快验证"的原则排期。每期交付物可独立上线，互不阻塞。

### P0：基础设施准备

**目标**：为后续功能扫清地基障碍。

| 交付物 | 说明 |
|--------|------|
| AgentCardRenderer + cardRegistry | 完成 [组件拆分方案](#组件拆分方案v20-新增)，迁移现有卡片 |
| 现有卡片抽取为独立组件 | CatInfoCard / HealthSummaryCard / WeightTrendCard / VaccineStatusCard |
| 测试基建 | 配置 Vitest，补齐 [AgentRouter](backend/src/agent/core/AgentRouter.ts) 现有测试覆盖 |

**验收标准**：ChatMessage.vue 不再直接渲染卡片，全部经 AgentCardRenderer 分发。

### P1：过敏追踪（只读）

**目标**：验证数据模型 + 卡片渲染，零写入风险。

| 交付物 | 说明 |
|--------|------|
| Prisma AllergyRecord 模型 | 含 V2.0 审计字段（createdBy/source/confirmedAt）+ severity enum |
| `GET_allergy_records` 工具 | 只读查询 + 模式分析 |
| AllergyCard 组件 | 过敏原列表 + 30 天时间轴 |
| AgentRouter 意图扩展 | `allergy_query` 意图 + 收窄后的关键词 |
| AgentPlanner 规则 | `health_consultation` 附带查询过敏 |

**验收标准**：用户问"奶糖有哪些过敏"能返回结构化过敏卡片；问"奶糖皮肤有点红"不会被误判。

**特性开关**：`ALLERGY_TRACKING_QUERY = ON`

### P2：健康周报（核心）

**目标**：交付最小可用的可视化周报，不含活动量维度。

| 交付物 | 说明 |
|--------|------|
| `GENERATE_health_report` 工具 | Promise.allSettled 容错，activityData 返回 null |
| 健康评分引擎（动态权重） | 方案 A：weight 35 + vaccine 30 + allergy 35 |
| HealthReportCard 组件 | 体重 SVG 折线图 + 评分环形图 + 本周亮点 |
| AgentRouter 意图扩展 | `health_report_request` 意图 + 时间词×健康词组合匹配 |
| 数据缺口标注 | UI 在 activity 位置显示"暂未接入活动量数据" |

**验收标准**：用户问"奶糖这周健康状况总结"能返回周报卡片；评分因 activity 缺失不失真。

**特性开关**：`HEALTH_WEEKLY_REPORT = ON`

### P3：执行轨迹 + 过敏录入

**目标**：补全透明度与写入能力，二者都需要前置依赖。

| 交付物 | 说明 |
|--------|------|
| AgentExecutor 权限中间件 | requireConfirmation 中间件链 |
| 多轮确认状态机 | `POST /api/chat/confirm` 端点 + 挂起会话存储 |
| `ADD_allergy_record` 工具 | 写入工具 + confirmationToken 校验 |
| AllergyConfirmCard 组件 | 确认/修改/取消三态交互 |
| ExecutionTracer + ExecutionTracePanel | 执行轨迹记录与展示 |

**前置依赖**：P0 的 AgentCardRenderer、P1 的 AllergyRecord 模型。

**验收标准**：过敏录入必须经用户确认方可写入；执行轨迹默认折叠，展开后显示真实耗时。

**特性开关**：`AGENT_EXECUTION_TRACE = OFF`（内部）、`ALLERGY_TRACKING_RECORD = OFF`（灰度）

### P4：周报增强

**目标**：补全建议引擎与待办闭环。

| 交付物 | 说明 |
|--------|------|
| 健康建议规则引擎 | `generateHealthSuggestions()`，按优先级排序 |
| 待办生成 + 后端持久化 | `generateToDoList()` + `POST /api/chat/todo/toggle` |
| HealthReportCard 扩展 | 建议列表 + 待办勾选（经事件上报，不 mutate props） |

**前置依赖**：P2 的 HealthReportCard。

**验收标准**：建议按高/中/低排序；待办勾选后刷新页面状态保留。

**特性开关**：`HEALTH_REPORT_SUGGESTIONS = OFF`、`HEALTH_REPORT_TODO = OFF`

### P5+：活动量数据源（独立大功能）

**目标**：为周报补全 activity 维度。

| 交付物 | 说明 |
|--------|------|
| 活动量采集方案 | 智能设备对接 或 手动录入（需独立设计） |
| ActivityRecord 模型 | 新表 |
| `getActivityData` 实现 | 填补 P2 的数据缺口 |
| 评分引擎切回完整权重 | weight 30 + vaccine 25 + allergy 25 + activity 20 |

**说明**：本期不在本文档范围内，建议单独立项。

---

## 🧪 测试覆盖计划（V2.0 新增）

> 现有仅 [AgentPlanner.test.ts](backend/src/__tests__/agent/AgentPlanner.test.ts) 一个测试文件。
> 新增 3 工具 + 3 意图 + 评分引擎 + 确认流程，测试覆盖必须同步跟上。

### 后端单元测试

| 测试文件 | 覆盖目标 | 关键用例 |
|---------|---------|---------|
| `AgentRouter.test.ts` | 意图分类 | 过敏本体词命中、症状词不误触发、周报时间词×健康词组合、显式周报关键词 |
| `AgentPlanner.test.ts`（扩展） | 工具规划 | `allergy_query`/`allergy_record`/`health_report_request` 的 plan 生成、`requiresConfirmation` 标记 |
| `AgentExecutor.test.ts`（新） | 执行 + 权限 | write 工具未携带 confirmationToken 时抛 ConfirmationRequiredError、read 工具不受影响 |
| `healthReport.tool.test.ts`（新） | 周报工具 | Promise.allSettled 单源失败容错、activityData=null 时评分动态权重、时间范围计算 |
| `calculateHealthScore.test.ts`（新） | 评分引擎 | full 模式（满分 100）、without_activity 模式（满分 100）、边界值（0/60/75/90）、previousWeekScore 变化 |
| `allergyQuery.tool.test.ts`（新） | 过敏查询 | 空记录、模式分析（topAllergens/seasonalPattern）、limit 截断 |
| `confirmation.service.test.ts`（新） | 确认流程 | confirmationId 生成、TTL 过期、userId 校验、cancel/confirm/edit 三态 |

### 后端集成测试

| 测试场景 | 验证点 |
|---------|--------|
| 过敏查询全链路 | Router → Planner → Executor → AllergyCard 数据完整 |
| 过敏录入全链路 | pending_confirmation 挂起 → 用户确认 → 写入 → 审计字段完整 |
| 周报生成全链路 | 多数据源聚合 → 评分正确 → SVG 数据点坐标正确 |
| 确认令牌过期 | TTL 5 分钟后 confirm 返回 410 Gone |
| 跨用户越权 | 用户 A 的 confirmationId 不能被用户 B confirm |

### 前端组件测试

| 组件 | 关键用例 |
|------|---------|
| `ExecutionTracePanel.vue` | 折叠/展开、错峰淡入动画、durationMs 显示 |
| `AllergyCard.vue` | 空状态、过敏原列表渲染、时间轴节点点击 |
| `AllergyConfirmCard.vue` | confirm/edit/cancel 三事件触发、草稿预填 |
| `HealthReportCard.vue` | SVG 折线图坐标计算、评分环形图 dash 长度、动态权重标签、待办不 mutate props |
| `AgentCardRenderer.vue` | 已注册 toolName 渲染、未注册 toolName 降级、toolCalls 顺序 |

### E2E 测试（Playwright）

| 场景 | 步骤 |
|------|------|
| 过敏查询 | 输入"奶糖有哪些过敏" → 等待 AllergyCard 渲染 → 验证过敏原列表 |
| 过敏录入确认 | 输入"帮奶糖记一下鸡肝过敏" → 点击【确认记录】→ 验证数据库写入 + 审计字段 |
| 周报生成 | 输入"奶糖这周健康状况总结" → 等待 HealthReportCard → 验证评分与亮点 |
| 误触发回归 | 输入"奶糖皮肤有点红" → 验证不触发 allergy 意图 → 走 health_consultation |

### 测试红线

以下场景必须 100% 通过方可上线：

1. **意图误触发**：症状词（皮肤/呕吐/拉肚子）单独出现时不得触发 allergy 意图
2. **写入权限**：未携带有效 confirmationToken 时，write 工具不得执行
3. **评分失真**：activityData=null 时，总分上限必须为 100（不能是 80）
4. **跨用户越权**：confirmationId 跨用户使用必须被拒绝

---

## 📝 相关文档

- [Agent 架构设计文档](../02-开发/AI顾问系统.md) - 原有 Agent 基础架构
- [Agent 开发指南](../02-开发/AI Agent开发指南.md) - 工具开发规范、SSE 协议
- [UI 设计规范](../03-设计/ai顾问UI优化.md) - 奶油色系样式规范

---

## 🔄 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| V1.0 | 2026-06-14 | 设计文档初始版本：思维链展示 + 过敏追踪 + 可视化周报 |
| V2.0 | 2026-06-14 | 基于架构评审全面修订（详见下方变更明细） |

### V2.0 变更明细

**功能一（思维链 → 执行轨迹）**

- 由"思维链展示"重新定位为"执行轨迹可视化"，避免对 LLM 推理能力的过度承诺
- 移除 SSE 人为延迟（`setTimeout 80ms`），动画改由前端 CSS 错峰淡入实现
- `ThoughtTracker` 重命名为 `ExecutionTracer`，`recordReason` 改为 `recordReport`
- `thoughtChain` 字段重命名为 `executionTrace`，SSE 事件 `thought` 改为 `trace`
- UI 文案由"思考过程"改为"执行流程"，每步显示真实 `durationMs`

**功能二（过敏追踪 + 写入安全）**

- 补充首个写入工具的权限中间件设计（`requireConfirmation`）
- 新增多轮确认流程（`pending_confirmation` SSE 事件 + `POST /api/chat/confirm` 端点）
- AllergyRecord 新增审计字段：`createdBy` / `source` / `confirmedAt`
- `severity` 由 `String` 改为 Prisma `enum`，避免脏数据
- 收窄过敏意图关键词（症状词不再单独触发），新增误触发测试用例表
- AgentPlanner 对 `ADD_allergy_record` 标记 `requiresConfirmation: true`

**功能三（健康周报 + 数据缺口）**

- 标注活动量数据缺口（当前系统无数据源），给出三套应对方案
- 评分引擎改为动态权重（方案 A：无 activity 时 weight 35 + vaccine 30 + allergy 35）
- 工具改用 `Promise.allSettled` 容错，单数据源失败不影响整份周报
- 修正 `toDoList` 直接 mutate props 的问题，改为事件上报 + 后端持久化
- 收窄周报意图关键词（时间词 × 健康词组合匹配，避免"这周猫粮还剩多少"误触发）

**新增章节**

- "架构前置依赖"：Executor 权限中间件、确认状态机、活动量数据源、组件拆分四项前置缺口
- "组件拆分方案"：AgentCardRenderer 策略模式 + cardRegistry 注册表
- "分期实施路线"：P0（基建）→ P1（过敏只读）→ P2（周报核心）→ P3（轨迹+录入）→ P4（周报增强）→ P5+（活动量）
- "测试覆盖计划"：单元/集成/E2E 三层 + 四条测试红线

**集成总览更新**

- 特性开关拆分：`ALLERGY_TRACKING` 拆为 `_QUERY`（P1）和 `_RECORD`（P3）；周报拆为核心（P2）/建议（P4）/待办（P4）
- SSE 事件流加入 `pending_confirmation` 分支
- 权限模型新增 read/write 分离说明

---

_Agent 创新功能设计文档 · 最后更新：2026-06-14 · 当前版本：V2.0_
