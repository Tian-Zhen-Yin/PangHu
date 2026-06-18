# Memory 模块设计

> **功能版本:** V3.2 (缓存描述事实纠正)
> **更新时间:** 2026-06-16
> **功能状态:** ✅ 已上线（feature flag: `AGENT_CONTEXT_MEMORY`，默认开启）

本文档详细描述哈吉咪养成计划（PangHu）中 **Agent 记忆体系（Memory）** 的技术架构、实现细节、数据流及扩展点。

---

## 📋 功能概述

PangHu 项目中没有名为 `memory/` 的独立目录，"记忆"是一种**横切能力**，被有意分散到多层、按职责切片实现。本文档把这些分散的实现整合视为一个虚拟模块——`Agent Context Memory`，与 [`featureFlags.ts`](file:///e:/AiProject/cctest/PangHu/backend/src/config/featureFlags.ts#L407-L420) 中显式登记的 `AGENT_CONTEXT_MEMORY` 开关命名一致。

Memory 模块的核心使命：

- **会话连续性**：让 AI Agent 在多轮对话中保持上下文，记得用户上一句问了什么。
- **工具循环记忆**：在 ReAct/工具调用循环中累积 LLM ↔ 工具的中间结果。
- **请求级缓存**：在单次 Agent 调用内记录工具结果（"工具+参数"→输出）；去重读取尚未接入，预留以备启用，详见 4.3。
- **执行轨迹回放**：记录 Router/Planner/Executor/Reporter 四阶段的执行步骤，前端可视化。
- **挂起会话（待确认动作）**：LLM 想做但需要用户同意的写入动作，作为一种记忆形态短期存留。
- **过程可回放**：把 Agent 的工具调用副产物落到 `Message.metadata`，二次进入会话能复现卡片。

---

## 🎯 核心目标

| 目标 | 指标 | 当前状态 |
|------|------|---------|
| **多轮上下文连续性** | 历史窗口 ≥ 20 条 | ✅ 20 条硬窗口 |
| **重复工具调用去重** | 同 trace 内重复率 < 1% | ⚠️ cache 已写入，去重读取未接入（详见 4.3） |
| **过程持久化** | 二次打开会话可还原工具卡片 | ✅ metadata JSON 反序列化 |
| **记忆开关可控** | 可灰度关闭整个上下文记忆 | ✅ feature flag 守门 |
| **写入安全** | 危险动作必须显式确认 | ✅ confirmation TTL 5 分钟 |

---

## 🏗️ 系统架构

### 整体架构图

```
                ┌────────────────────────────────────────────┐
                │  HTTP / SSE 请求                           │
                │  POST /api/chat  (sendMessageHandler)      │
                └──────────────────┬─────────────────────────┘
                                   │
        ┌──────────────────────────▼──────────────────────────┐
        │ chat.controller.ts                                  │
        │  handleAgentStreamingMessage                        │
        │   ① 落库 user message                               │
        │   ② 拉取 ≤20 条历史 → ChatMessage[]                 │
        │   ③ 调用 catAgent.handleStreaming(... history)      │
        │   ④ 流式结束后，落库 assistant message+metadata     │
        └──────────────────┬──────────────────────────────────┘
                           │
            ┌──────────────▼──────────────────────────────┐
            │ CatAgent (agent/index.ts)                   │
            │  handleStreaming                            │
            │   • 拦截 res.write 累积 capturedContent     │
            │   • 根据 LLM_TOOL_CALLING_LOOP flag 分流：  │
            │     ┌─────────────┐    ┌──────────────────┐ │
            │     │ V2.0 旧链路 │    │ V3.0 AgentLoop   │ │
            │     │ Router →    │    │ ReAct 多轮迭代   │ │
            │     │ Planner →   │    │ 工具循环         │ │
            │     │ Executor →  │    └──────┬───────────┘ │
            │     │ Reporter →  │           │             │
            │     │ ai.service  │           ▼             │
            │     │ sendMessage │    AgentLoop.run        │
            │     │ Stream      │     while iter < 5:     │
            │     └──────┬──────┘       LLM streamChat    │
            │            │              tool_calls        │
            │            ▼              callTool          │
            └──────┬───────────────────┬──┬────────────────┘
                   │                   │  │
                   ▼                   │  ▼
        ai.service.buildMessages       │  AgentExecutor.callTool
        [system, ...history, user]     │   • 参数校验/重试/超时
                                       │   • ctx.cache.set  ← 工具结果缓存
                                       │   • 命中 requiresConfirmation
                                       │     → confirmation.service.create
                                       ▼
                              confirmation.service
                              sessions: Map<id, draft>  TTL 5min
```

### 五层记忆分类

按**"是否实际进入 LLM 上下文"**将 5 类记忆分为两组，避免把不参与推理的工程设施误当成"记忆层"。

**A. 真·LLM 上下文记忆**（会拼进 `messages[]` 喂给模型）

| 记忆类别 | 生命周期 | 存储载体 | 代码位置 |
|---|---|---|---|
| ① 长期会话记忆（Chat History） | 永久（DB） | PostgreSQL `Conversation` + `Message` | [schema.prisma#L308-L342](file:///e:/AiProject/cctest/PangHu/backend/prisma/schema.prisma#L308-L342) |
| ② 工作记忆（LLM 上下文窗口） | 一次请求 | 内存数组 `messages[]` | [AgentLoop.ts#L54-L58](file:///e:/AiProject/cctest/PangHu/backend/src/agent/core/AgentLoop.ts#L54-L58) |

**B. 请求态设施**（不进入 LLM 上下文，服务于去重 / 可观测 / 写入安全）

| 设施类别 | 生命周期 | 存储载体 | 代码位置 |
|---|---|---|---|
| ③ 请求级缓存（工具结果记忆） | 单次 Agent 调用 | `AgentContext.cache: Map` | [agent.ts#L18](file:///e:/AiProject/cctest/PangHu/backend/src/agent/types/agent.ts#L18) / [AgentExecutor.ts#L122](file:///e:/AiProject/cctest/PangHu/backend/src/agent/core/AgentExecutor.ts#L122) |
| ④ 执行轨迹记忆（Trace） | 一次请求，回放给前端 | `ExecutionTracer.steps[]` | [AgentExecutionTracer.ts](file:///e:/AiProject/cctest/PangHu/backend/src/agent/core/AgentExecutionTracer.ts) |
| ⑤ 挂起会话记忆（待确认动作） | 5 分钟 TTL，进程内 | `confirmation.service` 的 `sessions: Map` | [confirmation.service.ts#L26](file:///e:/AiProject/cctest/PangHu/backend/src/services/confirmation.service.ts#L26) |

> 设计哲学：作者刻意**不发明统一的 `IMemoryStore` 抽象**。每类记忆活在它最自然的位置，避免过度设计；代价是新人需读懂 5 个位置才能形成全貌。
>
> **演进阈值（前瞻判据）**：当记忆类型数量 ≥ 7，或各记忆的读写频率 / 生命周期 / 权限模型出现显著分化（例如 Profile 低频读高频写、Trace 只写不读、Confirmation 短 TTL 高频读写）时，应启动统一 `IMemoryStore` 抽象评估，避免模块间耦合随业务迭代失控。当前 5 类、访问模式尚可统一描述，未到收口点。

---

## 🧱 各层记忆设计细节

### 4.1 长期会话记忆：Conversation + Message

**数据模型**（[schema.prisma#L308-L342](file:///e:/AiProject/cctest/PangHu/backend/prisma/schema.prisma#L308-L342)）：

```prisma
model Conversation {
  id        String   @id @default(cuid())
  userId    String
  catId     String?            // 可绑定到具体猫咪上下文
  title     String   @default("新对话")
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId, updatedAt])
}

model Message {
  id               String  @id @default(cuid())
  conversationId   String
  role             String  // 'user' | 'assistant' | 'system'
  content          String
  markdownContent  String?
  referencedGuides String? // RAG 引用（JSON 数组）
  metadata         String? // tokens/model/traceId/toolCalls JSON
}
```

**设计要点**

1. **以会话为聚合根**：`Conversation` 不仅是 chat 容器，还能 **绑定 `catId`**——"这次对话是在和'咪咪'这只猫的语境下进行的"，让 Memory 与领域上下文（猫咪档案）天然耦合。
2. **`metadata` 是非结构化扩展点**：assistant 消息的 metadata 序列化进了 `traceId`、`tools`、`toolCalls`、`citations`、`agentMode`。前端二次进入会话时**不需要重新调 LLM** 即可还原工具卡片（详见 [chat.ts#L36-L73 的 `restoreAgentMetaFromMetadata`](file:///e:/AiProject/cctest/PangHu/frontend/src/stores/chat.ts#L36-L73)）。这是项目 Memory 设计中最巧妙的一笔：**让过程也成为记忆，不只是结果文本**。
3. **`referencedGuides` 单独抽出**：RAG 引用作为结构化字段独立存储，便于审计与下次提问时复用。

### 4.2 工作记忆：LLM 上下文窗口

**入口**（[chat.controller.ts#L202-L210](file:///e:/AiProject/cctest/PangHu/backend/src/controllers/chat.controller.ts#L202-L210)）：

```ts
const historyRows = await prisma.message.findMany({
  where: { conversationId: conversation.id, id: { not: userMessage.id } },
  orderBy: { createdAt: 'asc' },
  take: 20
})
const chatHistory = historyRows.filter(m => m.role !== 'system')
  .map(m => ({ role: m.role, content: m.content }))
```

**关键策略**

- **20 条窗口**：硬上限，防止上下文爆炸。
- **`role !== 'system'` 过滤**：DB 里可能有历史 system 消息，但当前 system prompt 由代码统一注入，避免重复 / 污染。
- **排除"刚刚写入的 user message"**（`id: { not: userMessage.id }`）：避免 Agent 把当前轮的输入再读出来重复推给 LLM。注释中标注 `P0 #1`，是历史教训。

**两种链路下的拼装方式**

- **传统链路** [`ai.service.buildMessages`](file:///e:/AiProject/cctest/PangHu/backend/src/services/ai.service.ts#L140-L213)：

  ```
  [systemMessage, ...historyMessages, userMessage(含 catBlock + ragBlock)]
  ```

  把"动态上下文"（猫咪档案、RAG 知识片段）注入到**最新的 user message**，不污染历史。这是值得借鉴的细节：把动态注入和长期记忆分离。

- **AgentLoop 链路**（[AgentLoop.ts#L54-L58](file:///e:/AiProject/cctest/PangHu/backend/src/agent/core/AgentLoop.ts#L54-L58)）：

  ```ts
  const messages = [
    { role: 'system', content: AGENT_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ]
  ```

  迭代过程中，每轮 LLM 输出的 `tool_calls` 与每个 tool 的执行结果都会被 **append 进 messages 数组**（见 L117-L145），形成 ReAct 风格的工作记忆。

### 4.3 请求级缓存：`AgentContext.cache`

**类型定义**（[agent.ts#L10-L23](file:///e:/AiProject/cctest/PangHu/backend/src/agent/types/agent.ts#L10-L23)）：

```ts
export interface AgentContext {
  userId: string
  sessionId: string
  selectedCatId?: string
  traceId: string
  logger: Console
  signal?: AbortSignal           // 客户端断开时取消
  cache: Map<string, any>        // 请求级缓存，避免重复查询
  confirmationToken?: { ... }    // V2.0 写入工具确认令牌
}
```

**写入点**（[AgentExecutor.ts#L122](file:///e:/AiProject/cctest/PangHu/backend/src/agent/core/AgentExecutor.ts#L122)）：

```ts
ctx.cache.set(`tool:${step.toolName}:${JSON.stringify(step.parameters)}`, output)
```

**设计要点**

1. **per-request scope**：每次进入 Agent 都 `new Map()`，请求结束随 GC 释放，无需 LRU 策略。
2. **"工具+参数"作为 key（已写入，去重未启用）**：每次工具执行后会写入 cache，但执行前**并未读取做命中判断**——相同工具相同参数在同一次 Agent 调用内仍会真正重复执行。key 设计为后续启用去重预留（尤其针对动态分支 `advancePlan` 可能再次提交相同工具的场景）；是否启用去重见"待办议题 → 议题 1"。
3. **不跨请求共享**：刻意不共享，避免不同用户、不同 trace 之间的数据泄漏与陈旧问题。

### 4.4 执行轨迹记忆：ExecutionTracer

**结构**（[AgentExecutionTracer.ts](file:///e:/AiProject/cctest/PangHu/backend/src/agent/core/AgentExecutionTracer.ts)）：

```ts
type TraceStepType = 'intent' | 'plan' | 'execute' | 'report'

interface TraceStep {
  stepId: number
  type: TraceStepType
  title: string
  content: string
  timestamp: number
  durationMs?: number
  data?: Record<string, unknown>
}
```

**职责**：把 Router → Planner → Executor → Reporter 四阶段管道每一步的真实时长 / 状态记录下来，通过 SSE `trace` 事件推给前端 `ExecutionTracePanel`。

**重要设计纪律**：

> 注意：本组件记录的是确定性管道步骤，不等同于 LLM 的推理过程。

作者明确把"管道执行轨迹"和"LLM 思考链"区分开——这是中型项目里少见的概念清晰度。

### 4.5 挂起会话记忆：confirmation.service

**结构**（[confirmation.service.ts](file:///e:/AiProject/cctest/PangHu/backend/src/services/confirmation.service.ts)）：

```ts
const sessions = new Map<string, SuspendedSession>()

interface SuspendedSession {
  confirmationId: string
  userId: string
  catId: string
  toolName: string
  draft: Record<string, unknown>
  createdAt: number
  expiresAt: number       // 默认 5 分钟
}
```

**为何属于 Memory**：当 LLM 想调用一个会修改数据的工具（例如 `ADD_allergy_record`），系统**不直接执行**，而是把"待执行的草稿"暂存为一段 5 分钟 TTL 的记忆，等用户在前端点"确认"后再真正落库。这是 Agent 安全工程中"半决策记忆"的优秀实践。

**特性**

- **进程内 Map**：注释明确说 P3 阶段单实例够用，**生产多实例需替换为 Redis**（已标注扩展点）。
- **延迟清理**：每次 `createConfirmation` 触发一次 `cleanupExpired`，惰性回收。
- **三态 API**：`create` / `consume` / `cancel`，配合 `verifyConfirmation` 校验 userId，避免越权确认其他人的草稿。

### 4.6 前端的"恢复型记忆"

[`stores/chat.ts` 中的 `restoreAgentMetaFromMetadata`](file:///e:/AiProject/cctest/PangHu/frontend/src/stores/chat.ts#L36-L73) 让二次打开会话时，从 `message.metadata` JSON 字符串反序列化回 `agentMeta`，工具卡片（健康周报、过敏卡片等）能被原样还原。这把"长期记忆 → 工作展示"打通了。

---

## 🔄 数据流（一次完整请求中的记忆流转）

```
1. 用户提问 "我家咪咪最近呕吐了，要不要紧？"
        │
        ▼
2. chat.controller.handleAgentStreamingMessage
   • 落库:  Message(role='user', content='...')         ← 长期记忆 写
   • SELECT 最近 20 条 messages（排除当前）              ← 长期记忆 读
   • → chatHistory: ChatMessage[]
        │
        ▼
3. catAgent.handleStreaming(content, ..., chatHistory)
   • 创建 AgentContext { cache: new Map(), traceId }    ← 请求缓存初始化
   • V3.0 链路？走 AgentLoop
        │
        ▼
4. AgentLoop.run
   messages = [system, ...history, user]                 ← 工作记忆 装载
   loop (≤5 次):
       LLM stream → 累积 tool_calls
       并行 callTool:
           ctx.cache.set(toolKey, output)                ← 请求缓存 写
           result.requiresConfirmation?
              → confirmation.service.create(...)         ← 挂起记忆 写
              → SSE pending_confirmation
       messages.push({role:'tool', ...})                 ← 工作记忆 累积
       Tracer.recordExecute(...)                         ← 轨迹记忆 写
   → 累积 capturedContent + toolResults
        │
        ▼
5. 流式结束（res.end）
   • Message(role='assistant',
       content,
       metadata=JSON{traceId, toolCalls, citations,..})  ← 长期记忆 写（含可回放扩展）
   • Conversation.updatedAt = now                        ← 排序更新
        │
        ▼
6. 用户下次刷新会话
   • 拉所有 messages
   • restoreAgentMetaFromMetadata 还原 agentMeta         ← 长期记忆 → 工作展示
```

---

## 🚦 Feature Flag 守门

[`AGENT_CONTEXT_MEMORY`](file:///e:/AiProject/cctest/PangHu/backend/src/config/featureFlags.ts#L407-L420) 让"记忆是否启用"可灰度：

```ts
AGENT_CONTEXT_MEMORY: {
  key: 'AGENT_CONTEXT_MEMORY',
  enabledByDefault: true,
  description: 'Agent 保留对话历史上下文，实现连续对话',
  rollout: {
    environment: { development: true, staging: true, production: true },
    percentage: 100,
  },
  dependencies: ['AGENT_MODE'],
}
```

即便代码默认开启，运维层也能一键关闭以隔离故障。

---

## 💡 关键设计决策与可借鉴之处

1. **不发明"统一 Memory 抽象"**：让每类记忆活在它最自然的位置，避免过度设计。
2. **Feature Flag 守门**：可灰度，可一键关闭。
3. **写入侧的"挂起记忆"模式**：把"AI 想做但需要人类同意"作为一种独立的记忆形态来管理（有 ID、TTL、可取消），是 Agent 安全工程的优秀实践。
4. **Metadata-as-Replayable-Memory**：把 `toolCalls`/`citations`/`traceId` 序列化进 `Message.metadata`，让前端二次加载会话时**不重调 LLM 就能复现卡片**。
5. **20 条窗口 + 5 次工具循环**：硬编码常量，简单可控；产品定位（医疗咨询）不需要无限上下文。
6. **动态上下文与长期记忆解耦**：`buildMessages` 把猫咪档案、RAG 片段塞到最新 user message，不污染 history。

---

## ⚠️ 当前局限与扩展点

| 问题 | 现状 | 建议 |
|---|---|---|
| `confirmation.service.sessions` 是进程内 Map | 单实例生产可用；多实例失效 | 替换为 Redis（注释里已标注） |
| 历史窗口固定 20 条，无摘要 | 长会话上下文丢失早期信息 | 先统计真实对话轮数分布确认痛点，再决定是否引入 Summarization Memory（超阈值滚动摘要）——避免过早优化 |
| 没有跨会话语义记忆（用户偏好/习惯） | 每次会话从零开始 | 增加 `UserMemoryProfile` 表 + 定期从 messages 提取特征写入 |
| Tracer 仅生命周期内有效，不落库 | trace 仅前端能看到一次 | 把 traceId + steps 落到独立 `AgentTrace` 表，便于 prompt-eval / 复盘 |
| Agent 缓存粒度仅按 toolName+params | 未跨用户共享冷热数据 | 对 read-only 工具（catInfo、knowledge）加跨请求短时缓存（30s） |
| `Message.metadata` 是字符串 JSON | 无法在 SQL 层查询字段 | 切到 Postgres `Json` 类型，支持按 traceId 检索 |

---

## 🔜 待办议题（事实纠正与技术债）

下列议题涉及现有文档与代码的事实性偏差或未文档化的技术债。议题 1 的文档侧已在 V3.2 纠正，剩余的代码去重决策（Option B）与议题 2/3 仍待评审。每项均附已核实的代码事实，便于日后直接拾起。

### 议题 1：请求级缓存 —— 文档已纠正，去重实现待定

| 维度 | 内容 |
|---|---|
| 进展 | ✅ 文档侧已纠正（V3.2 本轮）：核心目标表与 4.3 设计要点 #2 已改为如实描述"write-only，去重读取未接入" |
| 代码事实 | 全代码库 `ctx.cache` 仅 `.set`（[AgentExecutor.ts:122](file:///e:/AiProject/cctest/PangHu/backend/src/agent/core/AgentExecutor.ts#L122)），无任何 `.get` / `.has` 调用 —— 缓存只写不读，去重逻辑未实际运行 |
| 待定（Option B） | 是否实现去重：在 `executeTool` 执行前补 `cache.get` 命中跳过。若实现，必须排除 `requiresConfirmation` / 写操作工具（`tool.permissions` 含 `'write'`），避免同参数写操作被误吞；且当前 line 122 对写工具也 `.set`，应一并改为仅对读工具写缓存；需补测试 |

### 议题 2：Confirmation 恢复路径未文档化 + 三项技术债

| 维度 | 内容 |
|---|---|
| 现状 | 恢复路径其实明确：consume 后构造 `confirmationToken.verified:true` 的 AgentContext，直接调用 [`AllergyRecordTool.call`](file:///e:/AiProject/cctest/PangHu/backend/src/controllers/chat.controller.ts#L479)（非 Loop、非 Draft 注入） |
| 技术债 1 | 恢复入口硬编码到 `AllergyRecordTool`，未来新增任何写入工具都要修改 `confirmActionHandler` |
| 技术债 2 | [`session.toolName`](file:///e:/AiProject/cctest/PangHu/backend/src/services/confirmation.service.ts#L21) 字段存而不用，consume 后从未读取 |
| 技术债 3 | 写入完成后不续接原 LLM Loop，仅返回工具结果 —— "记录过敏 + 总结"这类复合意图只能完成前半段 |
| 修正方向 | 文档新增"确认恢复流程"小节描述现有路径；技术债择机重构为 `session.toolName` 驱动的通用恢复 |

### 议题 3：跨会话语义记忆措辞收紧

| 维度 | 内容 |
|---|---|
| 文档声明 | 局限性表"没有跨会话语义记忆... 每次会话从零开始" |
| 事实 | `Cat` + `AllergyRecord` 等领域实体经 `Conversation.catId` 绑定已跨会话持久化猫咪核心事实；真正缺失的是**用户层**语义记忆（偏好、沟通风格、反复出现的担忧）与对话衍生洞察 |
| 修正方向 | 把"每次会话从零开始"改为"用户层语义记忆缺失（猫咪领域事实已由 Cat/AllergyRecord 持久化）"；`UserMemoryProfile` 设计时须厘清与 `Cat` 模型的字段边界，避免重叠 |

---

## 📚 关联文档

- [`AI Agent 系统设计.md`](./AI%20Agent%20系统设计.md) — Agent 整体管道（Router/Planner/Executor/Reporter）
- [`../RAG模块设计.md`](../RAG模块设计.md) — RAG 检索层，Memory 模块的兄弟模块
- [`AI顾问系统.md`](./AI顾问系统.md) — 顾问层产品形态

---

## 📝 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| V3.2 | 2026-06-16 | 缓存描述事实纠正（功能概述 / 核心目标表 / 4.3 如实改为 "write-only，去重读取未接入"）；新增"待办议题"区登记三项未决事项 |
| V3.1 | 2026-06-15 | 文档结构优化：5 层记忆按"是否进入 LLM 上下文"重新分组；补充抽象收口演进阈值；窗口截断补"先度量"原则 |
| V3.0 | 2026-06-15 | 集成 AgentLoop（ReAct 多轮迭代）、新增 5 层记忆完整文档 |
| V2.0 | 2026-04-xx | 新增 confirmation.service（写入挂起记忆）、metadata 可回放 |
| V1.0 | 2026-01-xx | 长期会话记忆（Conversation/Message）+ 20 条工作窗口上线 |

---

## 🔚 一句话总结

> PangHu 没有"Memory 模块"，而是把记忆切成了 **5 层**：DB 中的会话/消息（长期）、LLM messages 数组（工作）、`AgentContext.cache`（请求级）、`ExecutionTracer`（轨迹）、`confirmation.service`（挂起待确认）；它们由 [`chat.controller`](file:///e:/AiProject/cctest/PangHu/backend/src/controllers/chat.controller.ts#L171-L268) 串成一条数据流，由 [`AGENT_CONTEXT_MEMORY`](file:///e:/AiProject/cctest/PangHu/backend/src/config/featureFlags.ts#L407-L420) 这个 feature flag 统一开关，由 `Message.metadata` 把 Agent 的过程也变成可回放的长期记忆。
