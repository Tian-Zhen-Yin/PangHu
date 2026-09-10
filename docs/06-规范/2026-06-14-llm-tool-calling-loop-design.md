# LLM Tool-Calling Loop 迁移设计

**日期**: 2026-06-14
**作者**: Claude (与 PangHu 主人协同设计)
**状态**: Design Approved, Awaiting Implementation Plan
**关联**: V2.0 Agent 创新功能(并行开发,本设计需与之兼容)

---

## 1. 背景与目标

### 1.1 现状问题(架构诚实度)

当前 Agent 链路:

```
用户消息 → AgentRouter(关键词匹配) → AgentPlanner(规则生成 plan) → AgentExecutor(并发执行工具) → AgentReporter(结果格式化) → ai.service(LLM 总结)
```

**核心问题**:

1. **不是真正的 ReAct**: LLM 仅参与最后一步"总结",所有"思考与决策"由规则代码完成。新增工具必须**同时**修改 `AgentRouter`(加关键词)和 `AgentPlanner`(加 case),双向维护成本。
2. **决策能力天花板**: Planner 是关键词匹配,无法基于工具结果动态决策(如"看到体重异常 → 追加查询疫苗")。
3. **维护成本随工具线性增长**: 仅 V2.0 一次新增就在 Router/Planner 各加了 3 个分支(`allergy_query` / `allergy_record` / `health_report_request`)。
4. **匹配脆弱**: 已修复的 `matchCatName` regex bug 即为该模式的典型代价。

### 1.2 目标

将 Agent 链路改造为 **真正的 LLM tool-calling loop (ReAct)**:

```
用户消息 → [LLM 决策 → 工具执行 → 结果反馈给 LLM] × N 轮 → LLM 最终答复(流式)
```

LLM 在每一轮看到上一轮工具输出,**真正具备"观察→思考→行动"循环**。规则代码只保留 fast-path(打招呼)和 RAG 兜底。

### 1.3 非目标

- **不**改造 V2.0 新工具(`ADD_allergy_record` / `GENERATE_health_report` / `GET_allergy_records`)。本次只迁移 5 个 readonly 工具。
- **不**重写工具实现。Tool 类、Zod 参数定义、Tool 执行器全部复用。
- **不**改 SSE 事件契约。前端无需修改。
- **不**清理 metrics.ts(死代码,留给后续单独处理)。

---

## 2. 架构概览

### 2.1 新链路

```
用户消息
  ├─ greeting fast-path? ─ yes → 固定回复
  └─ no
       ↓
   构造 messages = [system, ...history, user]
       ↓
  ┌──── ReAct Loop (max 5 iterations) ────┐
  │                                       │
  │  LLMClient.chatStream(messages,tools) │
  │      ↓ stream                         │
  │  ├─ tool_call delta → 缓冲            │
  │  ├─ content delta → SSE content       │
  │  └─ finish                            │
  │      ↓                                │
  │  has tool_calls?                      │
  │    yes → 并行执行 → tool messages →循环 │
  │    no  → 退出 loop                    │
  │                                       │
  └───────────────────────────────────────┘
       ↓
  超过 maxIterations / LLM 错误? → RAG 兜底
       ↓
  返回 AgentStreamResult (持久化)
```

### 2.2 模块拆分

| 模块 | 职责 |
|---|---|
| `AgentLoop` (新) | 协调 ReAct 循环,管理 messages 演化 |
| `LLMClient` (新) | 抽象 LLM 流式调用,屏蔽 zhipuai 细节,可注入 mock |
| `zhipuaiClient` (新) | LLMClient 的 zhipuai 实现,解析 OpenAI 风格 SSE |
| `toolAdapter` (新) | 把 Zod schema → JSON Schema (LLM tool definitions) |
| `toolOutputFormatter` (新) | 把工具 JSON 输出 → 中文压缩文本(注入 LLM messages) |
| `AgentRouter` (改) | 仅保留 greeting fast-path 与 V2.0 意图探测 |
| `AgentExecutor` (改) | 改造为单工具 `callTool(name, params, ctx)`,保留 timeout/retry/abort |
| `agent/index.ts` (改) | 入口分流: flag 开 → AgentLoop;flag 关 → legacyPipeline |
| `AgentPlanner` (删) | flag 100% + 观察期后删除 |
| `AgentReporter` (删) | 同上;`formatCatInfo` 等函数迁移到 `toolOutputFormatter` |

### 2.3 双链路并存

新旧链路在 `agent/index.ts` 入口处用 feature flag 路由,**整个观察期内并存**:

```ts
async handleStreaming(...) {
  if (isFeatureEnabled('LLM_TOOL_CALLING_LOOP', ctx)) {
    // V2.0 新工具意图 → 降级到旧链路(用户无感)
    if (isV2ToolIntent(content)) {
      return this.legacyPipeline.run(...)
    }
    return this.agentLoop.run(...)   // 新链路
  }
  return this.legacyPipeline.run(...) // 旧链路
}
```

---

## 3. 数据流细节

### 3.1 messages 演化(多轮)

第 1 轮:
```
[
  {role:'system', content: AGENT_SYSTEM_PROMPT},
  ...history,
  {role:'user', content: 用户消息}
]
```

LLM 返回 tool_calls 后,第 2 轮 messages 变为:
```
[
  ...第 1 轮内容,
  {role:'assistant', content:'', tool_calls:[{id:'call_1',name:'get_cat_info',args:{}}]},
  {role:'tool', tool_call_id:'call_1', content: '<工具结果中文压缩文本>'}
]
```

LLM 看到工具结果后可能再发 tool_calls(继续循环),或返回 content(退出循环)。

### 3.2 工具结果格式化(送给 LLM)

工具原始 JSON:
```json
{ "success": true, "cat": { "name":"小白", "breed":"英短", "age":3, "weight":4.2 } }
```

送给 LLM 的 tool message content(中文压缩):
```
猫咪信息:小白(英短,3 岁,体重 4.2kg)
```

**理由**: LLM 处理结构化中文文本比 JSON 节省 token,且回答更自然。复用现有 `formatCatInfo` 等函数,只是把消费者从 Reporter 换成 toolOutputFormatter。

### 3.3 历史持久化策略

仅落库**最终 assistant 文本**(不存中间 tool_calls / tool_results):
- 简化 schema(无需新表)
- 下一轮 LLM 看历史时只看到自然语言对话(更接近真实多轮对话训练数据)
- 调试场景需要 traceId → 通过日志按 traceId 关联

### 3.4 selectedCatId 传播

本次仅在 `AgentContext.selectedCatId` 占位,**前端实际接入推迟到 P1**(避免 scope creep)。Tool 层在 `selectedCatId` 缺省时回退到 `cats[0]`(已有逻辑)。

### 3.5 并发 tool_calls

LLM 单轮可能返回多个 tool_calls。处理:
- **并行执行**(`Promise.all`)
- **按 LLM 返回顺序拼回** tool messages(保证 LLM 下一轮看到的顺序与它的请求一致)
- 不限制并发数(工具总数 ≤ 5)

---

## 4. 测试策略 & 错误处理

### 4.1 测试分层

| 层级 | 工具 | 覆盖对象 |
|---|---|---|
| 单元测试 | Vitest | LLMClient / toolAdapter / toolOutputFormatter / AgentLoop(mock LLM) |
| 集成测试 | Vitest + supertest | sendMessageHandler 端到端 SSE(fake LLM stream + 真工具) |
| 回归测试 | 现有 `AgentPlanner.test.ts` | 验证迁移后仍不会注入错误 catName |
| 手测 | curl + 浏览器 | dev 环境真实 GLM-4 调用 |

### 4.2 LLMClient 接口

```ts
export interface LLMClient {
  chatStream(opts: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    signal?: AbortSignal
  }): AsyncIterable<LLMStreamEvent>
}

type LLMStreamEvent =
  | { type: 'content', delta: string }
  | { type: 'tool_call', id: string, name: string, argsDelta: string }
  | { type: 'tool_call_done', id: string }
  | { type: 'finish', reason: 'stop' | 'tool_calls' }
```

测试用 `FakeLLMClient` 注入预设事件序列(inline 写死,不用 fixture)。

### 4.3 关键测试用例

```
LLMClient
  - parses OpenAI-style SSE chunks (content delta / tool_call delta)
  - aborts on AbortSignal
  - throws clear error on 401/429/5xx

toolAdapter
  - converts Zod schema to JSON Schema
  - tools without parameters serialize to { type:'object', properties:{} }

toolOutputFormatter
  - get_cat_info success → 中文压缩文本(含品种/年龄/体重)
  - get_cat_info no cat → "未找到猫咪档案"
  - get_weight_trend empty → "暂无体重记录"

AgentLoop
  - greeting fast-path skips LLM tool-calling
  - single iteration: LLM returns content only → returns directly
  - two iterations: LLM calls 1 tool → tool result → LLM final answer
  - parallel tool_calls: 2 tools in 1 round → both execute → both messages appended
  - max iterations exceeded → triggers RAG fallback
  - tool throws → tool message has error content, loop continues
  - AbortSignal mid-loop → stops cleanly, no DB write
```

### 4.4 错误处理矩阵

| 错误来源 | 处理 | SSE 事件 |
|---|---|---|
| LLM 网络/5xx | 重试 1 次 → 失败则 RAG fallback | `tool: rag_search` + 正常 content |
| LLM 401/认证 | 不重试 → 固定文案 | `error` |
| LLM 429 | 退避 1s 重试 1 次 → 失败 RAG fallback | 同 5xx |
| 工具超时(10s) | 跳过,塞 `{error:'timeout'}` 到 tool message | `tool: <name> failed` |
| 工具异常 | 同上 | 同上 |
| Zod 校验失败 | 不调工具,把校验错误塞 tool message → LLM 自我修正 | 不发 tool 事件 |
| maxIterations(5) 超限 | RAG fallback + 输出已收集内容 | warn 日志 |
| 客户端 abort | 取消进行中工具 + LLM 流 | (连接已断) |

### 4.5 Observability

新增一行汇总日志(不动 prom-client):
```
[AgentLoop] traceId=xx iterations=2 tools=[get_cat_info,check_health] tokens=1234 latencyMs=2300
```

---

## 5. 灰度发布 & 回滚

### 5.1 Feature Flag

复用现有 `featureFlags.ts`(让基础设施真正派上用场):

```ts
LLM_TOOL_CALLING_LOOP: {
  key: 'LLM_TOOL_CALLING_LOOP',
  enabledByDefault: false,
  description: 'V3.0 LLM tool-calling loop(替代规则驱动 Planner)',
  rollout: {
    environment: { development: true, staging: true, production: false },
    userSegment: 'internal',
    percentage: 0,
  },
  dependencies: ['AGENT_MODE'],
}
```

### 5.2 灰度路径

1. dev:100% 开启
2. staging:100% 开启
3. prod internal:100%
4. prod beta:10% → 30% → 50%
5. prod all:100%

### 5.3 回滚触发条件

| 指标 | 阈值 | 动作 |
|---|---|---|
| LLM API 错误率 | >5% / 5min | 告警 + 手动决策 |
| 平均响应延迟 | >当前 P50 × 1.5 | 告警 |
| Token 消耗均值 | >当前 × 2 | 告警(成本) |
| 用户投诉 | 任何 | 定向回滚(白名单移除) |
| 工具调用失败率 | >10% | 告警 |

回滚操作:
- 单用户:`excludeUserIds` 加入用户 ID
- 全量:`percentage: 0` 或 `enabledByDefault: false`
- 彻底回退:删 flag → 全部走旧链路

### 5.4 观察期

- 全量上线后 **2 周观察期**(若日均 < 1000 请求,延长到 4 周)
- 观察期内不删旧代码
- 观察期通过 → 删除 `AgentPlanner.ts` / `AgentReporter.ts` / flag 与分流分支

### 5.5 与 V2.0 协同

- V2.0 新工具(`allergy_query` / `allergy_record` / `health_report_request`)**不**纳入本次迁移
- flag 开启时 → 探测到 V2.0 意图 → **悄悄降级到旧链路**(用户无感)
- 探测函数 `isV2ToolIntent` 复用现有正则(`allergy|过敏|周报|health.*report`),误判后果仅是走旧链路得到正确答案
- P1 阶段再把 V2.0 工具迁入 LLM tool-calling

---

## 6. 系统提示词模板(初版,可迭代)

```
你是 PangHu 的 AI 顾问,专注于猫咪养护建议。

工作方式:
1. 当用户询问猫咪具体信息(品种、体重、健康、疫苗)时,**调用工具**获取真实数据,不要编造。
2. 当用户询问通用养猫知识(食物、行为、训练)时,使用 rag_search 工具。
3. 调用工具后,基于工具返回的数据给出专业、温暖、个性化的建议。
4. 若工具返回"未找到猫咪档案",礼貌提示用户先添加猫咪档案。
5. 同一信息不重复查询;能合并的工具调用尽量并行。

可用工具(由系统注入,见 tools 字段)。
```

具体 prompt 在实施时迭代,落到 `agent/prompts/systemPrompt.ts`。

---

## 7. 文件变更清单

### 新增
- `backend/src/agent/core/AgentLoop.ts`
- `backend/src/agent/llm/LLMClient.ts`(接口)
- `backend/src/agent/llm/zhipuaiClient.ts`(实现)
- `backend/src/agent/llm/FakeLLMClient.ts`(测试用)
- `backend/src/agent/core/toolAdapter.ts`
- `backend/src/agent/core/toolOutputFormatter.ts`
- `backend/src/agent/prompts/systemPrompt.ts`
- `backend/src/__tests__/agent/AgentLoop.test.ts`
- `backend/src/__tests__/agent/LLMClient.test.ts`
- `backend/src/__tests__/agent/toolAdapter.test.ts`
- `backend/src/__tests__/agent/toolOutputFormatter.test.ts`

### 修改
- `backend/src/agent/index.ts`(入口分流)
- `backend/src/agent/core/AgentRouter.ts`(仅保留 greeting fast-path + V2.0 探测)
- `backend/src/agent/core/AgentExecutor.ts`(暴露 callTool API)
- `backend/src/config/featureFlags.ts`(新增 LLM_TOOL_CALLING_LOOP)
- `backend/src/agent/types/agent.ts`(新增 AgentLoop 相关类型)

### 观察期通过后删除
- `backend/src/agent/core/AgentPlanner.ts`
- `backend/src/agent/core/AgentReporter.ts`
- `agent/index.ts` 里的 legacyPipeline 分支与 isV2ToolIntent 探测
- 上述 flag

---

## 8. 实施分阶段

### Phase 1: 基础设施(可独立合并)
- LLMClient 接口 + zhipuaiClient + FakeLLMClient
- toolAdapter + toolOutputFormatter
- 单元测试

### Phase 2: AgentLoop 主体
- AgentLoop 实现 + 测试
- AgentExecutor 暴露 callTool

### Phase 3: 分流接入
- agent/index.ts flag 路由
- AgentRouter slim 化
- featureFlags.ts 新增 flag
- 集成测试

### Phase 4: 灰度上线
- dev/staging 100%
- prod internal → beta → all 按比例放开
- 监控指标 2 周

### Phase 5: 清理
- 删 AgentPlanner / AgentReporter / flag / 分流代码
- 文档同步

---

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| LLM 选错工具 / 死循环 | maxIterations=5 + RAG fallback |
| Token 成本上升 | 监控 + 工具结果中文压缩 + system prompt 精简 |
| 流式延迟变高 | 真正的 token-by-token 流式输出,首 token 延迟与旧链路相当 |
| V2.0 功能受影响 | 悄悄降级到旧链路 |
| 测试 LLM 成本 | mock LLMClient,测试零 API 调用 |
| 迁移期 bug 影响生产 | flag 路由,一行配置回退 |

---

## 10. 关键决策记录

| 决策 | 选择 | 理由 |
|---|---|---|
| 迁移范围 | 仅 5 个 readonly 工具 | 控制范围,V2.0 工具 P1 再迁 |
| LLM 模型 | 分场景选模型 | 灵活,简单场景用 GLM-4-flash 省钱 |
| SSE 协议 | 保留现有契约 | 前端零改动 |
| 失败兜底 | RAG fallback | 复用现有链路,体验不降级 |
| 实现方案 | 完整流式 ReAct loop(方案 A) | 唯一真正解决架构诚实度问题 |
| Planner 处置 | 删除(观察期后) | 是问题根源,LLM tool-calling 已替代 |
| 共存策略 | flag 路由双链路 | 简单清晰,易回滚 |
| 观察期 | 2 周(请求量不足延至 4 周) | 平衡稳定性与代码债 |
| V2.0 工具降级 | 悄悄走旧链路 | 用户无感 |
| 历史持久化 | 仅最终文本 | 简化 schema |
| selectedCatId | 占位,P1 接入 | 避免 scope creep |
| 并发 tool_calls | 并行执行 + 按返回顺序拼回 | 性能与正确性兼顾 |
| 测试 LLM | inline mock | 单测可读性优先 |
