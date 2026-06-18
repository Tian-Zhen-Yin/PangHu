# LLM Tool-Calling Loop 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 PangHu Agent 链路从规则驱动的 Router/Planner/Executor/Reporter 迁移到真正的 LLM tool-calling loop (ReAct),通过 feature flag 双链路并行,2 周观察期后删除旧代码。

**Architecture:** 新增 `AgentLoop` 协调多轮 ReAct 迭代,`LLMClient` 抽象智谱 AI tool-calling 流式接口(可注入 mock),复用现有 `AgentExecutor.callTool`、Tool 注册表、Zod schema。`agent/index.ts` 入口处用 `LLM_TOOL_CALLING_LOOP` flag 路由新旧链路;flag 开启时 V2.0 工具(allergy/health-report)悄悄降级到旧链路。

**Tech Stack:** TypeScript / Express / Zod v4 / Vitest / 智谱 AI GLM-4 (OpenAI-compatible function calling) / `featureFlags.ts`

**关联 Spec:** `docs/superpowers/specs/2026-06-14-llm-tool-calling-loop-design.md`

---

## 文件结构总览

### 新增
| 路径 | 职责 |
|---|---|
| `backend/src/agent/llm/LLMClient.ts` | LLM 流式调用接口 + 类型定义 |
| `backend/src/agent/llm/zhipuaiClient.ts` | 智谱 AI 实现(解析 OpenAI 风格 SSE,处理 tool_call delta) |
| `backend/src/agent/llm/FakeLLMClient.ts` | 测试用 inline mock(注入预设事件序列) |
| `backend/src/agent/core/toolAdapter.ts` | Zod schema → JSON Schema(LLM tool definitions) |
| `backend/src/agent/core/toolOutputFormatter.ts` | 工具 JSON 输出 → 中文压缩文本(注入 LLM messages) |
| `backend/src/agent/core/AgentLoop.ts` | ReAct 多轮循环协调器 |
| `backend/src/agent/prompts/systemPrompt.ts` | LLM 系统提示词模板 |
| `backend/src/__tests__/agent/toolAdapter.test.ts` | toolAdapter 单测 |
| `backend/src/__tests__/agent/toolOutputFormatter.test.ts` | toolOutputFormatter 单测 |
| `backend/src/__tests__/agent/LLMClient.parser.test.ts` | zhipuaiClient SSE 解析单测 |
| `backend/src/__tests__/agent/AgentLoop.test.ts` | AgentLoop ReAct 循环单测(含 FakeLLMClient) |

### 修改
| 路径 | 改动 |
|---|---|
| `backend/src/agent/core/AgentExecutor.ts` | 暴露单工具 `callTool(name, params, ctx)` API,内部复用现有 timeout/retry/abort |
| `backend/src/agent/index.ts` | 入口 flag 分流:新链路 → AgentLoop;旧链路 → 现有 `handleStreaming` 逻辑;新增 `isV2ToolIntent` |
| `backend/src/config/featureFlags.ts` | 新增 `LLM_TOOL_CALLING_LOOP` flag |

### 观察期通过后删除(Task 14)
- `backend/src/agent/core/AgentPlanner.ts`
- `backend/src/agent/core/AgentReporter.ts`
- `agent/index.ts` 内 legacyPipeline 分支与 `isV2ToolIntent`
- `LLM_TOOL_CALLING_LOOP` flag

---

## 任务列表

### Task 1: 定义 LLMClient 接口与事件类型

**Files:**
- Create: `backend/src/agent/llm/LLMClient.ts`

- [ ] **Step 1: 创建文件 `backend/src/agent/llm/LLMClient.ts`**

```typescript
import type { ChatMessage } from '../types/agent'

/**
 * LLM 工具定义(OpenAI function calling 兼容格式)
 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

/**
 * 单个 tool_call(LLM 决定调用某工具)
 */
export interface ToolCall {
  id: string
  name: string
  arguments: string  // JSON 字符串(可能不完整,在 tool_call_done 时已完整)
}

/**
 * LLM 流式事件
 */
export type LLMStreamEvent =
  | { type: 'content'; delta: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_args'; id: string; argsDelta: string }
  | { type: 'tool_call_done'; id: string }
  | { type: 'finish'; reason: 'stop' | 'tool_calls' | 'length' | 'error'; error?: string }

/**
 * LLM 客户端抽象,屏蔽具体厂商差异(智谱 / OpenAI / ...)
 */
export interface LLMClient {
  chatStream(opts: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    signal?: AbortSignal
    model?: string
  }): AsyncIterable<LLMStreamEvent>
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd backend && npx tsc --noEmit src/agent/llm/LLMClient.ts`
Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add backend/src/agent/llm/LLMClient.ts
git commit -m "feat(agent): add LLMClient interface and stream event types"
```

---

### Task 2: 实现 toolAdapter (Zod → JSON Schema)

**Files:**
- Create: `backend/src/agent/core/toolAdapter.ts`
- Test: `backend/src/__tests__/agent/toolAdapter.test.ts`

- [ ] **Step 1: 写失败测试 `backend/src/__tests__/agent/toolAdapter.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { zodToToolDefinition, toolsToDefinitions } from '../../agent/core/toolAdapter'
import type { Tool } from '../../agent/types/agent'

describe('toolAdapter.zodToToolDefinition', () => {
  it('converts a tool with optional string param to JSON Schema', () => {
    const tool: Tool = {
      name: 'get_cat_info',
      description: '获取猫咪基础信息',
      schema: z.object({
        catName: z.string().optional().describe('猫咪名字'),
      }),
      permissions: ['read'],
      call: async () => ({}),
    }

    const def = zodToToolDefinition(tool)

    expect(def.type).toBe('function')
    expect(def.function.name).toBe('get_cat_info')
    expect(def.function.description).toBe('获取猫咪基础信息')
    expect(def.function.parameters.type).toBe('object')
    expect(def.function.parameters.properties).toHaveProperty('catName')
    expect(def.function.parameters.required ?? []).not.toContain('catName')
  })

  it('marks required param as required in JSON Schema', () => {
    const tool: Tool = {
      name: 'rag_search',
      description: '搜索知识库',
      schema: z.object({ query: z.string() }),
      permissions: ['read'],
      call: async () => ({}),
    }

    const def = zodToToolDefinition(tool)

    expect(def.function.parameters.required).toContain('query')
  })

  it('handles tool with empty parameters schema', () => {
    const tool: Tool = {
      name: 'check_health',
      description: '检查健康',
      schema: z.object({}),
      permissions: ['read'],
      call: async () => ({}),
    }

    const def = zodToToolDefinition(tool)

    expect(def.function.parameters.type).toBe('object')
    expect(def.function.parameters.properties).toEqual({})
  })
})

describe('toolAdapter.toolsToDefinitions', () => {
  it('converts an array of tools', () => {
    const tools: Tool[] = [
      {
        name: 'a',
        description: 'A',
        schema: z.object({ x: z.string() }),
        permissions: ['read'],
        call: async () => ({}),
      },
      {
        name: 'b',
        description: 'B',
        schema: z.object({}),
        permissions: ['read'],
        call: async () => ({}),
      },
    ]
    const defs = toolsToDefinitions(tools)
    expect(defs).toHaveLength(2)
    expect(defs[0].function.name).toBe('a')
    expect(defs[1].function.name).toBe('b')
  })
})
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd backend && npm test -- toolAdapter`
Expected: FAIL,提示 `Cannot find module '../../agent/core/toolAdapter'`

- [ ] **Step 3: 实现 `backend/src/agent/core/toolAdapter.ts`**

```typescript
import type { ZodType } from 'zod'
import type { Tool } from '../types/agent'
import type { ToolDefinition } from '../llm/LLMClient'

/**
 * 把 Tool 转成 LLM 可识别的 ToolDefinition (OpenAI function 格式)。
 *
 * 注:只支持 z.object({...}) 顶层 schema,这是项目内所有 Tool 的现状。
 * 如果未来出现非 object 顶层 schema(如 z.string()),会落到 fallback 空 properties。
 */
export function zodToToolDefinition(tool: Tool): ToolDefinition {
  const schema = tool.schema as ZodType & { _def?: any }
  const shape: Record<string, ZodType> | undefined = (schema as any)._def?.shape?.()
    ?? (schema as any).shape

  const properties: Record<string, unknown> = {}
  const required: string[] = []

  if (shape && typeof shape === 'object') {
    for (const [key, fieldSchema] of Object.entries(shape)) {
      const field = fieldSchema as ZodType & { _def?: any; description?: string }
      const def = (field as any)._def
      const isOptional = def?.typeName === 'ZodOptional'
      const inner = isOptional ? def.innerType : field
      const innerDef = (inner as any)._def
      const description = (field as any).description ?? (inner as any).description

      properties[key] = {
        type: zodTypeToJsonType(innerDef?.typeName),
        ...(description ? { description } : {}),
      }

      if (!isOptional) required.push(key)
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
    },
  }
}

function zodTypeToJsonType(typeName?: string): string {
  switch (typeName) {
    case 'ZodString': return 'string'
    case 'ZodNumber': return 'number'
    case 'ZodBoolean': return 'boolean'
    case 'ZodArray': return 'array'
    case 'ZodObject': return 'object'
    default: return 'string'
  }
}

export function toolsToDefinitions(tools: Tool[]): ToolDefinition[] {
  return tools.map(zodToToolDefinition)
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `cd backend && npm test -- toolAdapter`
Expected: PASS,4 tests

- [ ] **Step 5: 提交**

```bash
git add backend/src/agent/core/toolAdapter.ts backend/src/__tests__/agent/toolAdapter.test.ts
git commit -m "feat(agent): add toolAdapter (Zod schema -> JSON Schema for LLM)"
```

---

### Task 3: 实现 toolOutputFormatter (工具输出 → LLM 中文文本)

**Files:**
- Create: `backend/src/agent/core/toolOutputFormatter.ts`
- Test: `backend/src/__tests__/agent/toolOutputFormatter.test.ts`

- [ ] **Step 1: 写失败测试 `backend/src/__tests__/agent/toolOutputFormatter.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { formatToolOutput } from '../../agent/core/toolOutputFormatter'

describe('toolOutputFormatter.formatToolOutput', () => {
  it('formats get_cat_info success output', () => {
    const output = {
      success: true,
      cat: {
        id: 'c1',
        name: '小白',
        breed: '英短',
        age: '3岁',
        weight: '4.20 kg',
        gender: '公猫',
        isNeutered: true,
        allergies: null,
        diseases: null,
        lastVaccine: null,
        lastRecordDate: null,
        avatar: null,
      },
      userCats: [{ id: 'c1', name: '小白' }],
    }
    const text = formatToolOutput('get_cat_info', output)
    expect(text).toContain('小白')
    expect(text).toContain('英短')
    expect(text).toContain('3岁')
    expect(text).toContain('4.20')
  })

  it('returns 未找到 message when get_cat_info fails', () => {
    const output = { success: false, message: '您还没有登记任何猫咪档案。' }
    const text = formatToolOutput('get_cat_info', output)
    expect(text).toContain('未找到')
  })

  it('formats empty weight trend', () => {
    const output = { success: true, points: [], trend: 'stable' }
    const text = formatToolOutput('get_weight_trend', output)
    expect(text).toContain('暂无')
  })

  it('falls back to JSON for unknown tool', () => {
    const text = formatToolOutput('mystery_tool', { foo: 'bar' })
    expect(text).toContain('foo')
    expect(text).toContain('bar')
  })

  it('formats error with tool name', () => {
    const text = formatToolOutput('get_cat_info', { error: 'Tool timeout after 5000ms' })
    expect(text).toContain('失败')
    expect(text).toContain('timeout')
  })
})
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd backend && npm test -- toolOutputFormatter`
Expected: FAIL,模块不存在

- [ ] **Step 3: 实现 `backend/src/agent/core/toolOutputFormatter.ts`**

```typescript
/**
 * 把 Tool 输出 JSON 转成 LLM 可读的中文压缩文本。
 *
 * 设计原则:
 *   - LLM 处理结构化中文比 JSON 节省 token,且回答更自然
 *   - 失败/空结果统一短文案,LLM 自然能根据上下文给出友好回复
 */
export function formatToolOutput(toolName: string, output: unknown): string {
  // 通用错误处理
  if (output && typeof output === 'object' && 'error' in output) {
    const err = (output as { error: unknown }).error
    return `工具 ${toolName} 调用失败:${String(err)}`
  }

  if (output && typeof output === 'object' && 'success' in output && (output as any).success === false) {
    const msg = (output as any).message
    return msg ? `${msg}` : '未找到相关数据'
  }

  switch (toolName) {
    case 'get_cat_info':
      return formatCatInfo(output)
    case 'get_weight_trend':
      return formatWeightTrend(output)
    case 'check_health':
      return formatHealthCheck(output)
    case 'check_vaccine':
      return formatVaccineCheck(output)
    case 'rag_search':
      return formatRagSearch(output)
    default:
      return safeJsonStringify(output)
  }
}

function formatCatInfo(output: any): string {
  const cat = output?.cat
  if (!cat) return '未找到猫咪档案'
  const parts = [
    `猫咪信息:${cat.name}`,
    cat.breed ? `(${cat.breed}` : '',
    cat.age ? `,${cat.age}` : '',
    cat.weight ? `,体重${cat.weight}` : '',
    cat.breed || cat.age || cat.weight ? ')' : '',
  ]
  let text = parts.join('')
  if (cat.gender) text += ` 性别:${cat.gender}`
  if (cat.isNeutered !== undefined) text += `,${cat.isNeutered ? '已绝育' : '未绝育'}`
  if (cat.allergies) text += `;过敏史:${cat.allergies}`
  if (cat.diseases) text += `;既往病史:${cat.diseases}`
  if (cat.lastVaccine) text += `;最近疫苗:${cat.lastVaccine}`
  return text
}

function formatWeightTrend(output: any): string {
  const points = output?.points
  if (!Array.isArray(points) || points.length === 0) return '暂无体重记录'
  const head = `体重记录${points.length}条`
  const trend = output.trend ? `,趋势:${output.trend}` : ''
  const recent = points.slice(-3).map((p: any) => `${p.date}=${p.weight}kg`).join('、')
  return `${head}${trend};最近:${recent}`
}

function formatHealthCheck(output: any): string {
  const status = output?.weightAnalysis?.status
  const summary = output?.summary
  return [summary, status ? `体重状态:${status}` : ''].filter(Boolean).join(';') || '健康评估完成'
}

function formatVaccineCheck(output: any): string {
  const upcoming = output?.upcoming
  if (Array.isArray(upcoming) && upcoming.length > 0) {
    const list = upcoming.map((v: any) => `${v.name}(${v.daysLeft}天后)`).join('、')
    return `即将到期疫苗:${list}`
  }
  return '当前无即将到期的疫苗'
}

function formatRagSearch(output: any): string {
  const chunks = output?.chunks
  const titles = output?.guideTitles
  if (Array.isArray(titles) && titles.length > 0) {
    return `知识库参考:${titles.join('、')}`
  }
  if (Array.isArray(chunks) && chunks.length > 0) {
    return `检索到${chunks.length}条参考片段`
  }
  return '知识库无相关内容'
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `cd backend && npm test -- toolOutputFormatter`
Expected: PASS,5 tests

- [ ] **Step 5: 提交**

```bash
git add backend/src/agent/core/toolOutputFormatter.ts backend/src/__tests__/agent/toolOutputFormatter.test.ts
git commit -m "feat(agent): add toolOutputFormatter (tool JSON -> compact Chinese text)"
```

---

### Task 4: 实现 zhipuaiClient (智谱 AI tool-calling 流式)

**Files:**
- Create: `backend/src/agent/llm/zhipuaiClient.ts`
- Test: `backend/src/__tests__/agent/LLMClient.parser.test.ts`

- [ ] **Step 1: 写失败测试 `backend/src/__tests__/agent/LLMClient.parser.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { parseSseLine } from '../../agent/llm/zhipuaiClient'

describe('zhipuaiClient.parseSseLine', () => {
  it('returns content event for text delta', () => {
    const line = 'data: {"choices":[{"delta":{"content":"你好"},"index":0}]}'
    const events = parseSseLine(line)
    expect(events).toEqual([{ type: 'content', delta: '你好' }])
  })

  it('returns tool_call_start for first tool_call delta with name', () => {
    const line = 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"get_cat_info","arguments":""}}]}}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'tool_call_start', id: 'call_1', name: 'get_cat_info' })
  })

  it('accumulates argument deltas', () => {
    const line = 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"arguments":"{\\"catName\\""}}]}}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'tool_call_args', id: 'call_1', argsDelta: '{"catName"' })
  })

  it('returns finish event with stop reason', () => {
    const line = 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'finish', reason: 'stop' })
  })

  it('returns finish event with tool_calls reason', () => {
    const line = 'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'finish', reason: 'tool_calls' })
  })

  it('returns empty array for [DONE] line', () => {
    const events = parseSseLine('data: [DONE]')
    expect(events).toEqual([])
  })

  it('returns empty array for non-data line', () => {
    expect(parseSseLine(': comment')).toEqual([])
    expect(parseSseLine('')).toEqual([])
  })
})
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd backend && npm test -- LLMClient.parser`
Expected: FAIL,模块不存在

- [ ] **Step 3: 实现 `backend/src/agent/llm/zhipuaiClient.ts`**

```typescript
import axios from 'axios'
import https from 'https'
import { generateToken } from '../../services/ai.service'
import type { LLMClient, LLMStreamEvent, ToolDefinition } from './LLMClient'
import type { ChatMessage } from '../types/agent'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })
const DEFAULT_MODEL = process.env.ZHIPUAI_MODEL || 'glm-4-flash'

/**
 * 解析单行 SSE 数据,返回 0..N 个 LLMStreamEvent。
 * 暴露此函数主要用于单测。
 */
export function parseSseLine(line: string): LLMStreamEvent[] {
  if (!line.startsWith('data: ')) return []
  const data = line.slice(6).trim()
  if (data === '[DONE]') return []

  let parsed: any
  try { parsed = JSON.parse(data) } catch { return [] }

  const choice = parsed?.choices?.[0]
  if (!choice) return []

  const events: LLMStreamEvent[] = []
  const delta = choice.delta || {}

  if (typeof delta.content === 'string' && delta.content.length > 0) {
    events.push({ type: 'content', delta: delta.content })
  }

  if (Array.isArray(delta.tool_calls)) {
    for (const tc of delta.tool_calls) {
      const id = tc.id
      const fn = tc.function || {}
      if (id && fn.name) {
        events.push({ type: 'tool_call_start', id, name: fn.name })
      }
      if (typeof fn.arguments === 'string' && fn.arguments.length > 0) {
        // 注:智谱 AI 在第一帧会同时给出 id+name+arguments(可能为""),后续帧只给 arguments delta
        // 我们这里宽松处理:有 id 就发 args 事件
        const callId = id || tc.index !== undefined ? `idx_${tc.index}` : undefined
        if (callId && fn.arguments) {
          events.push({ type: 'tool_call_args', id: callId, argsDelta: fn.arguments })
        }
      }
    }
  }

  if (choice.finish_reason) {
    const reason = choice.finish_reason
    if (reason === 'stop' || reason === 'tool_calls' || reason === 'length') {
      events.push({ type: 'finish', reason })
    } else {
      events.push({ type: 'finish', reason: 'error', error: reason })
    }
  }

  return events
}

export class ZhipuaiClient implements LLMClient {
  async *chatStream(opts: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    signal?: AbortSignal
    model?: string
  }): AsyncIterable<LLMStreamEvent> {
    const apiKey = process.env.ZHIPUAI_API_KEY || ''
    if (!apiKey) {
      yield { type: 'finish', reason: 'error', error: 'ZHIPUAI_API_KEY not set' }
      return
    }
    const token = generateToken(apiKey)
    const baseUrl = 'https://open.bigmodel.cn/api/paas/v4'
    const model = opts.model || DEFAULT_MODEL

    const body: Record<string, unknown> = {
      model,
      messages: opts.messages,
      temperature: 0.7,
      top_p: 0.9,
      stream: true,
    }
    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools
      body.tool_choice = 'auto'
    }

    let response: any
    try {
      response = await axios.post(`${baseUrl}/chat/completions`, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        responseType: 'stream',
        httpsAgent,
        signal: opts.signal as any,
      })
    } catch (error: any) {
      yield { type: 'finish', reason: 'error', error: error.message || 'LLM request failed' }
      return
    }

    const stream = response.data
    let buffer = ''
    const queue: LLMStreamEvent[] = []
    let resolveNext: (() => void) | null = null
    let ended = false
    let errored: string | null = null

    const wakeup = () => {
      if (resolveNext) { resolveNext(); resolveNext = null }
    }

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        for (const ev of parseSseLine(line)) queue.push(ev)
      }
      wakeup()
    })
    stream.on('end', () => { ended = true; wakeup() })
    stream.on('error', (err: Error) => { errored = err.message; ended = true; wakeup() })

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        try { stream.destroy() } catch { /* ignore */ }
        ended = true
        errored = 'aborted'
        wakeup()
      }, { once: true })
    }

    while (true) {
      while (queue.length > 0) {
        const ev = queue.shift()!
        yield ev
      }
      if (ended) break
      await new Promise<void>((resolve) => { resolveNext = resolve })
    }

    if (errored && errored !== 'aborted') {
      yield { type: 'finish', reason: 'error', error: errored }
    }
  }
}

export const zhipuaiClient = new ZhipuaiClient()
```

- [ ] **Step 4: 运行测试,确认通过**

Run: `cd backend && npm test -- LLMClient.parser`
Expected: PASS,7 tests

- [ ] **Step 5: 提交**

```bash
git add backend/src/agent/llm/zhipuaiClient.ts backend/src/__tests__/agent/LLMClient.parser.test.ts
git commit -m "feat(agent): add zhipuaiClient with OpenAI-style tool_calling SSE parser"
```

---

### Task 5: 实现 FakeLLMClient(测试用)

**Files:**
- Create: `backend/src/agent/llm/FakeLLMClient.ts`

- [ ] **Step 1: 创建文件 `backend/src/agent/llm/FakeLLMClient.ts`**

```typescript
import type { LLMClient, LLMStreamEvent, ToolDefinition } from './LLMClient'
import type { ChatMessage } from '../types/agent'

/**
 * 测试用 LLM 客户端。
 *
 * 用法:
 *   const fake = new FakeLLMClient([
 *     [{ type: 'content', delta: '...' }, { type: 'finish', reason: 'stop' }],
 *     [{ type: 'tool_call_start', id: 'c1', name: 'get_cat_info' }, ...],
 *   ])
 *
 * 每次 chatStream 调用消费 scripts 数组的下一条脚本。
 */
export class FakeLLMClient implements LLMClient {
  private callIndex = 0
  public capturedCalls: Array<{ messages: ChatMessage[]; tools?: ToolDefinition[] }> = []

  constructor(private scripts: LLMStreamEvent[][]) {}

  async *chatStream(opts: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    signal?: AbortSignal
  }): AsyncIterable<LLMStreamEvent> {
    this.capturedCalls.push({ messages: opts.messages, tools: opts.tools })
    const script = this.scripts[this.callIndex++] ?? [{ type: 'finish', reason: 'stop' }]
    for (const ev of script) {
      if (opts.signal?.aborted) {
        yield { type: 'finish', reason: 'error', error: 'aborted' }
        return
      }
      yield ev
    }
  }

  reset() {
    this.callIndex = 0
    this.capturedCalls = []
  }
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd backend && npx tsc --noEmit src/agent/llm/FakeLLMClient.ts`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add backend/src/agent/llm/FakeLLMClient.ts
git commit -m "feat(agent): add FakeLLMClient for unit tests"
```

---

### Task 6: AgentExecutor 暴露 callTool API

**Files:**
- Modify: `backend/src/agent/core/AgentExecutor.ts`

- [ ] **Step 1: 在 `backend/src/agent/core/AgentExecutor.ts` 末尾追加导出**

把现有的 `executeTool` 函数从内部改为导出,并加一个无 `onProgress` 参数的便捷封装。

```typescript
// 在文件末尾追加(executePlan 函数之后):

/**
 * 单工具调用入口(供 AgentLoop 使用)。
 * 复用 executeTool 的全部能力:Zod 校验、超时、重试、abort、cache。
 *
 * @param toolName 工具名(必须已注册到 toolRegistry)
 * @param parameters 工具参数(将经过 Zod 校验)
 * @param ctx Agent 上下文
 * @param reason 可选的调用理由(由 LLM 提供时传入)
 */
export async function callTool(
  toolName: string,
  parameters: Record<string, unknown>,
  ctx: AgentContext,
  reason: string = 'LLM tool-calling'
): Promise<ToolResult> {
  return executeTool({ toolName, parameters, reason }, ctx)
}
```

并在 `executeTool` 函数声明上去掉前置 `async function`,改为 `export async function`(让外部 callTool 内部直接调用):

把这一行:
```typescript
async function executeTool(
```
改为:
```typescript
export async function executeTool(
```

- [ ] **Step 2: 验证编译**

Run: `cd backend && npx tsc --noEmit`
Expected: 无新增错误(已有的 prompt-eval.ts 错误不属本次)

- [ ] **Step 3: 验证现有测试不退化**

Run: `cd backend && npm test -- agent`
Expected: 所有现有 agent 测试 PASS(包括 AgentPlanner.test.ts 的 6 个)

- [ ] **Step 4: 提交**

```bash
git add backend/src/agent/core/AgentExecutor.ts
git commit -m "refactor(agent): expose callTool API for AgentLoop usage"
```

---

### Task 7: 创建 system prompt 模板

**Files:**
- Create: `backend/src/agent/prompts/systemPrompt.ts`

- [ ] **Step 1: 创建文件 `backend/src/agent/prompts/systemPrompt.ts`**

```typescript
/**
 * V3.0 LLM tool-calling loop 使用的系统提示词。
 *
 * 设计要点:
 *   - 明确告诉 LLM 何时调用工具(具体信息查档案)、何时用 RAG(通用知识)
 *   - 禁止编造猫咪数据
 *   - 引导 LLM 在多轮迭代中合理使用工具结果
 */
export const AGENT_SYSTEM_PROMPT = `你是 PangHu 的 AI 顾问"喵喵医生",专业的猫咪养护与健康咨询助手。

## 工作方式

1. **查档案用工具**:当用户询问猫咪具体信息(品种、年龄、体重、健康、疫苗、过敏史)时,**必须调用相应工具**获取真实数据,绝不编造。
2. **通用知识用 rag_search**:当用户询问通用养猫知识(食物、行为、训练、护理)时,使用 rag_search 工具检索知识库。
3. **基于工具结果回答**:获得工具返回数据后,用专业、温暖、个性化的中文给出建议。
4. **未找到档案的礼貌处理**:若工具返回"未找到猫咪档案",礼貌提示用户先去"我的猫咪"添加档案。
5. **避免重复查询**:同一信息不要在同一对话中重复查询;能合并的工具调用尽量在同一轮并行返回。
6. **简洁结构化**:回答控制在 300 字以内,Markdown 格式,重要警告加粗。

## 工具使用提示

- 当用户问"我家猫"且未指定名字 → catName 留空(系统会用默认猫)
- 健康咨询场景建议:先 get_cat_info 拿基础信息,再按需 check_health / get_weight_trend / check_vaccine
- 紧急症状(呼吸困难、持续呕吐 24h+ 等) → 第一句必须是"**请立即就医!**"`
```

- [ ] **Step 2: 验证编译**

Run: `cd backend && npx tsc --noEmit src/agent/prompts/systemPrompt.ts`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add backend/src/agent/prompts/systemPrompt.ts
git commit -m "feat(agent): add system prompt template for LLM tool-calling loop"
```

---

### Task 8: 实现 AgentLoop 核心(TDD)

**Files:**
- Create: `backend/src/agent/core/AgentLoop.ts`
- Test: `backend/src/__tests__/agent/AgentLoop.test.ts`

- [ ] **Step 1: 写失败测试 `backend/src/__tests__/agent/AgentLoop.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { AgentLoop } from '../../agent/core/AgentLoop'
import { FakeLLMClient } from '../../agent/llm/FakeLLMClient'
import type { AgentContext, Tool } from '../../agent/types/agent'
import { z } from 'zod'

function makeCtx(): AgentContext {
  return {
    userId: 'u1',
    sessionId: 's1',
    traceId: 't1',
    logger: console,
    cache: new Map(),
  }
}

const fakeCatTool: Tool = {
  name: 'get_cat_info',
  description: '获取猫咪信息',
  schema: z.object({ catName: z.string().optional() }),
  permissions: ['read'],
  call: async () => ({ success: true, cat: { id: 'c1', name: '小白', breed: '英短', age: '3岁', weight: '4.20 kg', gender: '公猫', isNeutered: true, allergies: null, diseases: null, lastVaccine: null, lastRecordDate: null, avatar: null }, userCats: [{ id: 'c1', name: '小白' }] }),
}

const fakeRagTool: Tool = {
  name: 'rag_search',
  description: '检索知识库',
  schema: z.object({ query: z.string() }),
  permissions: ['read'],
  call: async () => ({ success: true, chunks: [], guideTitles: ['养护指南'] }),
}

describe('AgentLoop', () => {
  it('returns content directly when LLM does not call tools', async () => {
    const llm = new FakeLLMClient([
      [
        { type: 'content', delta: '你好,' },
        { type: 'content', delta: '我是喵喵医生。' },
        { type: 'finish', reason: 'stop' },
      ],
    ])
    const loop = new AgentLoop(llm, [fakeCatTool, fakeRagTool])
    const onContent = vi.fn()
    const result = await loop.run({
      userMessage: '你好',
      history: [],
      ctx: makeCtx(),
      onContent,
      onToolResult: vi.fn(),
    })
    expect(result.content).toBe('你好,我是喵喵医生。')
    expect(result.toolNames).toEqual([])
    expect(onContent).toHaveBeenCalledWith('你好,')
    expect(onContent).toHaveBeenCalledWith('我是喵喵医生。')
  })

  it('executes a single tool_call and feeds result back to LLM', async () => {
    const llm = new FakeLLMClient([
      // 第 1 轮:LLM 决定调用 get_cat_info
      [
        { type: 'tool_call_start', id: 'call_1', name: 'get_cat_info' },
        { type: 'tool_call_args', id: 'call_1', argsDelta: '{"catName":"小白"}' },
        { type: 'tool_call_done', id: 'call_1' },
        { type: 'finish', reason: 'tool_calls' },
      ],
      // 第 2 轮:LLM 看到结果后给出最终答复
      [
        { type: 'content', delta: '小白是只3岁的英短公猫。' },
        { type: 'finish', reason: 'stop' },
      ],
    ])
    const loop = new AgentLoop(llm, [fakeCatTool, fakeRagTool])
    const onToolResult = vi.fn()
    const result = await loop.run({
      userMessage: '小白多大了',
      history: [],
      ctx: makeCtx(),
      onContent: vi.fn(),
      onToolResult,
    })
    expect(result.content).toContain('小白是只3岁')
    expect(result.toolNames).toEqual(['get_cat_info'])
    expect(onToolResult).toHaveBeenCalledTimes(1)
    expect(onToolResult.mock.calls[0][0].toolName).toBe('get_cat_info')
    expect(onToolResult.mock.calls[0][0].success).toBe(true)
  })

  it('hits maxIterations and falls back to last collected content', async () => {
    // 永远只返回 tool_calls,不返回 stop
    const llm = new FakeLLMClient([
      [{ type: 'tool_call_start', id: 'c1', name: 'get_cat_info' }, { type: 'tool_call_args', id: 'c1', argsDelta: '{}' }, { type: 'tool_call_done', id: 'c1' }, { type: 'finish', reason: 'tool_calls' }],
      [{ type: 'tool_call_start', id: 'c2', name: 'get_cat_info' }, { type: 'tool_call_args', id: 'c2', argsDelta: '{}' }, { type: 'tool_call_done', id: 'c2' }, { type: 'finish', reason: 'tool_calls' }],
      [{ type: 'tool_call_start', id: 'c3', name: 'get_cat_info' }, { type: 'tool_call_args', id: 'c3', argsDelta: '{}' }, { type: 'tool_call_done', id: 'c3' }, { type: 'finish', reason: 'tool_calls' }],
      [{ type: 'tool_call_start', id: 'c4', name: 'get_cat_info' }, { type: 'tool_call_args', id: 'c4', argsDelta: '{}' }, { type: 'tool_call_done', id: 'c4' }, { type: 'finish', reason: 'tool_calls' }],
      [{ type: 'tool_call_start', id: 'c5', name: 'get_cat_info' }, { type: 'tool_call_args', id: 'c5', argsDelta: '{}' }, { type: 'tool_call_done', id: 'c5' }, { type: 'finish', reason: 'tool_calls' }],
    ])
    const loop = new AgentLoop(llm, [fakeCatTool], { maxIterations: 5 })
    const result = await loop.run({
      userMessage: 'hello',
      history: [],
      ctx: makeCtx(),
      onContent: vi.fn(),
      onToolResult: vi.fn(),
    })
    expect(result.maxIterationsExceeded).toBe(true)
    expect(result.toolNames.length).toBe(5)
  })

  it('parallel tool_calls in one round are all executed', async () => {
    const llm = new FakeLLMClient([
      [
        { type: 'tool_call_start', id: 'c1', name: 'get_cat_info' },
        { type: 'tool_call_args', id: 'c1', argsDelta: '{}' },
        { type: 'tool_call_done', id: 'c1' },
        { type: 'tool_call_start', id: 'c2', name: 'rag_search' },
        { type: 'tool_call_args', id: 'c2', argsDelta: '{"query":"x"}' },
        { type: 'tool_call_done', id: 'c2' },
        { type: 'finish', reason: 'tool_calls' },
      ],
      [{ type: 'content', delta: 'done' }, { type: 'finish', reason: 'stop' }],
    ])
    const loop = new AgentLoop(llm, [fakeCatTool, fakeRagTool])
    const result = await loop.run({
      userMessage: 'q',
      history: [],
      ctx: makeCtx(),
      onContent: vi.fn(),
      onToolResult: vi.fn(),
    })
    expect(result.toolNames).toEqual(['get_cat_info', 'rag_search'])
  })

  it('stops cleanly on AbortSignal', async () => {
    const ctrl = new AbortController()
    const llm = new FakeLLMClient([
      [{ type: 'content', delta: 'hi' }, { type: 'finish', reason: 'stop' }],
    ])
    const ctx = { ...makeCtx(), signal: ctrl.signal }
    ctrl.abort()
    const loop = new AgentLoop(llm, [fakeCatTool])
    const result = await loop.run({
      userMessage: 'x',
      history: [],
      ctx,
      onContent: vi.fn(),
      onToolResult: vi.fn(),
    })
    expect(result.aborted).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试,确认失败**

Run: `cd backend && npm test -- AgentLoop`
Expected: FAIL,模块不存在

- [ ] **Step 3: 实现 `backend/src/agent/core/AgentLoop.ts`**

```typescript
import type { LLMClient, ToolCall } from '../llm/LLMClient'
import type { AgentContext, ChatMessage, Tool, ToolResult } from '../types/agent'
import { callTool } from './AgentExecutor'
import { toolsToDefinitions } from './toolAdapter'
import { formatToolOutput } from './toolOutputFormatter'
import { AGENT_SYSTEM_PROMPT } from '../prompts/systemPrompt'

export interface AgentLoopOptions {
  maxIterations?: number
  model?: string
}

export interface AgentLoopRunInput {
  userMessage: string
  history: ChatMessage[]
  ctx: AgentContext
  onContent: (text: string) => void
  onToolResult: (result: ToolResult) => void
}

export interface AgentLoopResult {
  content: string
  toolNames: string[]
  toolResults: ToolResult[]
  iterations: number
  maxIterationsExceeded: boolean
  aborted: boolean
}

interface ChatMessageWithTools extends ChatMessage {
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export class AgentLoop {
  private readonly maxIterations: number
  private readonly model?: string

  constructor(
    private readonly llm: LLMClient,
    private readonly tools: Tool[],
    options: AgentLoopOptions = {}
  ) {
    this.maxIterations = options.maxIterations ?? 5
    this.model = options.model
  }

  async run(input: AgentLoopRunInput): Promise<AgentLoopResult> {
    const { userMessage, history, ctx, onContent, onToolResult } = input

    const messages: ChatMessageWithTools[] = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userMessage },
    ]

    const toolDefs = toolsToDefinitions(this.tools)
    const toolNames: string[] = []
    const toolResults: ToolResult[] = []
    const contentParts: string[] = []

    let iteration = 0
    let maxIterationsExceeded = false
    let aborted = false

    while (iteration < this.maxIterations) {
      iteration += 1

      if (ctx.signal?.aborted) { aborted = true; break }

      // 一轮 LLM 流式调用
      const pendingCalls = new Map<string, { name: string; args: string }>()
      let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' | null = null
      let llmError: string | undefined

      for await (const ev of this.llm.chatStream({
        messages: messages as ChatMessage[],
        tools: toolDefs,
        signal: ctx.signal,
        model: this.model,
      })) {
        if (ctx.signal?.aborted) { aborted = true; break }
        switch (ev.type) {
          case 'content':
            contentParts.push(ev.delta)
            onContent(ev.delta)
            break
          case 'tool_call_start':
            pendingCalls.set(ev.id, { name: ev.name, args: '' })
            break
          case 'tool_call_args': {
            const cur = pendingCalls.get(ev.id)
            if (cur) cur.args += ev.argsDelta
            break
          }
          case 'tool_call_done':
            // no-op,等 finish 后统一处理
            break
          case 'finish':
            finishReason = ev.reason
            llmError = ev.error
            break
        }
      }

      if (aborted) break

      if (finishReason === 'error') {
        // LLM 错误 → 让外层走 RAG fallback(由 agent/index.ts 处理)
        throw new Error(`LLM error: ${llmError ?? 'unknown'}`)
      }

      // 没有 tool_calls → 退出循环
      if (pendingCalls.size === 0) break

      // 收集 tool_calls 顺序(按插入顺序,即 LLM 返回顺序)
      const callsInOrder: Array<{ id: string; name: string; args: string }> =
        Array.from(pendingCalls.entries()).map(([id, v]) => ({ id, name: v.name, args: v.args }))

      // 把 assistant 消息(含 tool_calls)塞入 messages
      messages.push({
        role: 'assistant',
        content: '',
        tool_calls: callsInOrder.map((c) => ({ id: c.id, name: c.name, arguments: c.args })),
      })

      // 并行执行所有 tool_calls
      const execResults = await Promise.all(
        callsInOrder.map(async (c) => {
          let parsedArgs: Record<string, unknown> = {}
          try { parsedArgs = c.args ? JSON.parse(c.args) : {} } catch { /* 留给 Zod */ }
          const r = await callTool(c.name, parsedArgs, ctx, 'LLM tool-calling')
          onToolResult(r)
          toolNames.push(c.name)
          toolResults.push(r)
          return { id: c.id, result: r }
        })
      )

      // 按 LLM 返回顺序拼回 tool messages
      for (const er of execResults) {
        const text = er.result.success
          ? formatToolOutput(er.result.toolName, er.result.output)
          : `工具 ${er.result.toolName} 失败:${er.result.error ?? '未知错误'}`
        messages.push({
          role: 'tool',
          tool_call_id: er.id,
          name: er.result.toolName,
          content: text,
        } as ChatMessageWithTools)
      }

      // tool_calls 已处理 → 进入下一轮 LLM
      if (finishReason !== 'tool_calls') break
    }

    if (iteration >= this.maxIterations && !aborted) {
      maxIterationsExceeded = true
    }

    return {
      content: contentParts.join(''),
      toolNames,
      toolResults,
      iterations: iteration,
      maxIterationsExceeded,
      aborted,
    }
  }
}
```

- [ ] **Step 4: 注意 ChatMessage 类型扩展**

打开 `backend/src/agent/types/agent.ts`,把 `MessageRole` 扩展为包含 `'tool'`:

把:
```typescript
export type MessageRole = 'user' | 'assistant' | 'system'
```
改为:
```typescript
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'
```

- [ ] **Step 5: 运行测试,确认通过**

Run: `cd backend && npm test -- AgentLoop`
Expected: PASS,5 tests

- [ ] **Step 6: 提交**

```bash
git add backend/src/agent/core/AgentLoop.ts backend/src/__tests__/agent/AgentLoop.test.ts backend/src/agent/types/agent.ts
git commit -m "feat(agent): add AgentLoop ReAct multi-iteration coordinator"
```

---

### Task 9: 新增 LLM_TOOL_CALLING_LOOP feature flag

**Files:**
- Modify: `backend/src/config/featureFlags.ts`

- [ ] **Step 1: 在 `featureFlags.ts` 的 `featureFlags` 对象中插入新 flag**

在 `AGENT_MODE` 之后(`AGENT_STREAMING` 之前)插入:

```typescript
  /**
   * V3.0 LLM tool-calling loop(替代规则驱动 Planner)
   * 灰度阶段,仅内部用户开启;flag 开启时 V2.0 工具(过敏录入/健康周报)悄悄降级到旧链路
   */
  LLM_TOOL_CALLING_LOOP: {
    key: 'LLM_TOOL_CALLING_LOOP',
    enabledByDefault: false,
    description: '启用 LLM tool-calling loop(ReAct),替代规则驱动 Planner',
    rollout: {
      environment: {
        development: true,
        staging: true,
        production: false,
      },
      userSegment: 'internal',
      percentage: 0,
    },
    dependencies: ['AGENT_MODE'],
  },
```

- [ ] **Step 2: 验证编译**

Run: `cd backend && npx tsc --noEmit src/config/featureFlags.ts`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add backend/src/config/featureFlags.ts
git commit -m "feat(flags): add LLM_TOOL_CALLING_LOOP feature flag"
```

---

### Task 10: agent/index.ts 入口分流(双链路并存)

**Files:**
- Modify: `backend/src/agent/index.ts`

- [ ] **Step 1: 在 `agent/index.ts` 顶部 import 区域添加导入**

在现有 imports 之后追加:

```typescript
import { AgentLoop } from './core/AgentLoop'
import { zhipuaiClient } from './llm/zhipuaiClient'
import { isFeatureEnabled, getDefaultContext } from '../config/featureFlags'
import { listTools } from './tools'
```

(注意 `listTools` 已 imports,如已存在跳过。)

- [ ] **Step 2: 在 `CatAgent` 类内增加 `agentLoop` 字段与降级判断**

在 `CatAgent` 类内增加私有字段与方法:

```typescript
  private readonly agentLoop = new AgentLoop(zhipuaiClient, this.getReadOnlyTools(), { maxIterations: 5 })

  /**
   * 仅返回本次迁移涵盖的 5 个 readonly 工具。
   * V2.0 新工具(allergy/health-report)flag 开启时走旧链路。
   */
  private getReadOnlyTools() {
    const allowed = new Set(['get_cat_info', 'get_weight_trend', 'check_health', 'check_vaccine', 'rag_search'])
    return listTools().filter((t) => allowed.has(t.name))
  }

  /**
   * 探测用户消息是否属于 V2.0 新工具的意图领域。
   * 命中 → 即便 flag 开启也降级到旧链路(用户无感)。
   */
  private isV2ToolIntent(message: string): boolean {
    return /过敏|allergy|周报|健康报告|health[_ ]?report/i.test(message)
  }
```

- [ ] **Step 3: 在 `handleStreaming` 方法开头插入 flag 路由**

把 `handleStreaming` 方法的方法体最开始(签名之后,`const abortController = ...` 之前)替换为带分流的版本。

找到原方法体开头:
```typescript
  async handleStreaming(
    userMessage: string,
    userId: string,
    sessionId: string,
    res: Response,
    selectedCatId?: string,
    history: ChatMessage[] = []
  ): Promise<AgentStreamResult> {
    const abortController = new AbortController()
```

改为:
```typescript
  async handleStreaming(
    userMessage: string,
    userId: string,
    sessionId: string,
    res: Response,
    selectedCatId?: string,
    history: ChatMessage[] = []
  ): Promise<AgentStreamResult> {
    // V3.0 flag 路由:LLM tool-calling loop
    const flagCtx = getDefaultContext(userId, 'all')
    const useNewLoop = isFeatureEnabled('LLM_TOOL_CALLING_LOOP', flagCtx)
    if (useNewLoop && !this.isV2ToolIntent(userMessage)) {
      return this.handleStreamingViaLoop(userMessage, userId, sessionId, res, selectedCatId, history)
    }

    const abortController = new AbortController()
```

- [ ] **Step 4: 在 `CatAgent` 类内追加新方法 `handleStreamingViaLoop`**

在 `handleStreaming` 方法之后、`private writeSse` 之前追加:

```typescript
  /**
   * V3.0 新链路:用 AgentLoop 跑 ReAct 多轮迭代。
   * 失败时自动降级到旧 sendMessageStream(RAG fallback)。
   */
  private async handleStreamingViaLoop(
    userMessage: string,
    userId: string,
    sessionId: string,
    res: Response,
    selectedCatId: string | undefined,
    history: ChatMessage[]
  ): Promise<AgentStreamResult> {
    const abortController = new AbortController()
    res.on('close', () => {
      if (res.destroyed || !res.writable) abortController.abort()
    })

    const ctx: AgentContext = {
      userId,
      sessionId,
      selectedCatId,
      traceId: generateTraceId(),
      logger: console,
      signal: abortController.signal,
      cache: new Map(),
    }

    ctx.logger.log(`[AgentLoop] trace=${ctx.traceId} user=${userId} message=${userMessage.substring(0, 50)}`)

    // SSE meta(预先告知 traceId,工具列表后续逐个推 tool 事件)
    this.writeSse(res, 'meta', { traceId: ctx.traceId, toolsCalled: [], toolCount: 0 })

    const startedAt = Date.now()
    const toolNamesSeen: string[] = []
    let llmFailed = false
    let resultContent = ''
    let citations: string[] = []

    try {
      const result = await this.agentLoop.run({
        userMessage,
        history,
        ctx,
        onContent: (text) => {
          this.writeSse(res, 'content', { text })
        },
        onToolResult: (r) => {
          toolNamesSeen.push(r.toolName)
          this.writeSse(res, 'tool', {
            toolName: r.toolName,
            status: r.success ? 'success' : 'error',
            output: r.output,
          })
        },
      })

      resultContent = result.content
      citations = result.toolResults
        .filter((r) => r.toolName === 'rag_search' && r.output?.guideTitles)
        .flatMap((r) => r.output.guideTitles as string[])
        .slice(0, 5)

      // maxIterations 超限 → RAG fallback
      if (result.maxIterationsExceeded) {
        ctx.logger.log('[AgentLoop] maxIterations exceeded, falling back to RAG')
        llmFailed = true
      }
    } catch (err: any) {
      ctx.logger.log(`[AgentLoop] error: ${err.message}, falling back to RAG`)
      llmFailed = true
    }

    if (llmFailed && !abortController.signal.aborted && !res.writableEnded) {
      try {
        const { sendMessageStream } = await import('../services/ai.service')
        await sendMessageStream(userMessage, history, '', res)
      } catch (e: any) {
        this.writeSse(res, 'error', { message: e.message || 'RAG fallback 失败' })
      }
    }

    if (!res.writableEnded) {
      this.writeSse(res, 'done', { traceId: ctx.traceId, citations })
      res.end()
    }

    ctx.logger.log(
      `[AgentLoop] traceId=${ctx.traceId} tools=[${toolNamesSeen.join(',')}] latencyMs=${Date.now() - startedAt}`
    )

    return {
      content: resultContent,
      citations,
      traceId: ctx.traceId,
      toolNames: toolNamesSeen,
    }
  }
```

- [ ] **Step 5: 验证编译**

Run: `cd backend && npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 6: 验证现有测试不退化**

Run: `cd backend && npm test`
Expected: 所有现有测试 PASS,新增 AgentLoop / toolAdapter / toolOutputFormatter / LLMClient.parser 测试 PASS

- [ ] **Step 7: 提交**

```bash
git add backend/src/agent/index.ts
git commit -m "feat(agent): add flag-routed dual-track for LLM tool-calling loop"
```

---

### Task 11: 手动验证(dev 环境)

**Files:** 无代码改动,纯验证

- [ ] **Step 1: 启动 backend dev 服务**

Run: `cd backend && npm run dev`
Expected: 服务启动,无报错

- [ ] **Step 2: 默认 flag 关闭 → 旧链路应正常**

用前端聊天发"小白多大了",观察 backend 日志:
Expected: 看到 `[Agent] Intent: ...` `[Agent] Plan: ...` 等旧链路日志,**不**出现 `[AgentLoop]`

- [ ] **Step 3: 临时强制开启 flag(改 percentage 为 100,environment.production = true 视情况)**

修改 `backend/src/config/featureFlags.ts` 的 `LLM_TOOL_CALLING_LOOP`:
```typescript
percentage: 100,
userSegment: 'all',
```

重启服务。

- [ ] **Step 4: 测试 5 个 readonly 场景**

逐个发送以下消息,确认前端有打字机效果,且后端日志出现 `[AgentLoop] traceId=...`:
1. "小白的基本情况" → 应看到 `tools=[get_cat_info]`
2. "小白最近体重怎么样" → 应看到 `get_weight_trend`(可能含 `get_cat_info`)
3. "我家猫健康吗" → 应看到 `check_health` 等多工具
4. "猫咪疫苗到期了吗" → 应看到 `check_vaccine`
5. "猫不爱喝水怎么办" → 应看到 `rag_search`

- [ ] **Step 5: 测试 V2.0 降级**

发送"小白有什么过敏史" → 后端日志应出现 `[Agent] Intent: allergy_query`(走旧链路),**不**出现 `[AgentLoop]`

- [ ] **Step 6: 测试 RAG 兜底**

临时把 `ZHIPUAI_API_KEY` 设为无效值,重启服务,发送任意问题。
Expected: 前端能收到内容(由 `sendMessageStream` 兜底产生 mock 文案或本地友好失败),后端日志含 `[AgentLoop] error: ..., falling back to RAG`。

恢复 API key。

- [ ] **Step 7: 还原 flag 默认值**

把 `LLM_TOOL_CALLING_LOOP.rollout.percentage` 改回 `0`,`userSegment: 'internal'`,`environment.production: false`。

- [ ] **Step 8: 提交手动验证记录**

无代码改动,跳过提交;在终端记录验证通过。

---

### Task 12: 灰度上线(无代码改动,运维操作)

**说明:** 这一步通过修改 `featureFlags.ts` 的 `rollout` 字段配合部署逐步放量。每次调整都是一次提交,便于回滚追踪。

- [ ] **Step 1: dev / staging 全量(部署后)**

修改 `LLM_TOOL_CALLING_LOOP.rollout`:
```typescript
environment: { development: true, staging: true, production: false },
userSegment: 'all',
percentage: 100,
```
仅影响 dev / staging。

```bash
git add backend/src/config/featureFlags.ts
git commit -m "chore(flags): enable LLM_TOOL_CALLING_LOOP in dev/staging"
```

- [ ] **Step 2: prod internal**

修改:
```typescript
environment: { development: true, staging: true, production: true },
userSegment: 'internal',
percentage: 100,
```

```bash
git commit -am "chore(flags): roll out LLM_TOOL_CALLING_LOOP to prod internal users"
```

部署后观察 1-2 天日志,关注:
- LLM API 错误率(目标 <5%)
- 平均延迟(目标不超当前 P50 × 1.5)
- 工具调用失败率(<10%)

- [ ] **Step 3: prod beta 10% → 30% → 50%**

每个梯度间隔 2-3 天,逐步调整 `userSegment: 'beta'` + `percentage: 10/30/50`。每次改动单独 commit。

- [ ] **Step 4: prod all 100%**

```typescript
userSegment: 'all',
percentage: 100,
```

```bash
git commit -am "chore(flags): roll out LLM_TOOL_CALLING_LOOP to all prod users"
```

进入 2 周观察期。

---

### Task 13: 观察期记录(2 周)

**Files:** 无代码改动

- [ ] **Step 1: 每日记录关键指标**

在私有 ops 日志中记录:LLM 错误率 / 平均延迟 / 工具失败率 / 用户投诉数量。

- [ ] **Step 2: 命中回滚条件 → 立即降级**

如触发任一回滚条件:
- 单用户问题 → 加 `excludeUserIds`
- 整体问题 → 改 `percentage: 0` 或 `enabledByDefault: false`,提交并部署

- [ ] **Step 3: 2 周通过 → 进入清理(Task 14)**

如日均请求 <1000,延长至 4 周。

---

### Task 14: 清理旧链路代码

**Files:**
- Delete: `backend/src/agent/core/AgentPlanner.ts`
- Delete: `backend/src/agent/core/AgentReporter.ts`
- Modify: `backend/src/agent/index.ts`(删除 legacy 路径与 isV2ToolIntent / handleStreaming 旧主体)
- Modify: `backend/src/config/featureFlags.ts`(删除 flag)
- Delete: `backend/src/__tests__/agent/AgentPlanner.test.ts`(回归用,迁移完成后无对应代码)

- [ ] **Step 1: 把 V2.0 工具迁移到 AgentLoop**

把 `getReadOnlyTools` 改为返回所有工具(或重命名为 `getAllTools`):

```typescript
private getAllTools() { return listTools() }
```

并把 `agentLoop` 字段构造改为 `new AgentLoop(zhipuaiClient, this.getAllTools(), { maxIterations: 5 })`。

- [ ] **Step 2: 删除 isV2ToolIntent 分支**

把 `handleStreaming` 开头的:
```typescript
if (useNewLoop && !this.isV2ToolIntent(userMessage)) {
  return this.handleStreamingViaLoop(...)
}
```
改为:
```typescript
return this.handleStreamingViaLoop(userMessage, userId, sessionId, res, selectedCatId, history)
```

并删除 `isV2ToolIntent` 方法,删除 `handleStreaming` 方法体内 legacy 实现(从 `const abortController = new AbortController()` 到 `finally { ;(res as any).write = realWrite }` 全部),只保留分流入口。

- [ ] **Step 3: 删除旧文件**

```bash
rm backend/src/agent/core/AgentPlanner.ts
rm backend/src/agent/core/AgentReporter.ts
rm backend/src/agent/core/AgentExecutionTracer.ts  # 如未被其他模块引用
rm backend/src/__tests__/agent/AgentPlanner.test.ts
```

- [ ] **Step 4: 更新 imports**

在 `backend/src/agent/index.ts` 顶部删除:
```typescript
import { classifyIntent } from './core/AgentRouter'
import { buildPlan, advancePlan } from './core/AgentPlanner'
import { executePlan } from './core/AgentExecutor'
import { generateReport } from './core/AgentReporter'
```
仅保留 AgentLoop 链路所需:`callTool`(若 handleMessage 也迁移,可保留;若不迁移,handleMessage 需要重构或删除)。

> 注:`handleMessage` 是非流式入口,使用频率较低。如果有调用方,把它也改造为复用 AgentLoop;否则一并删除。

- [ ] **Step 5: 删除 flag**

在 `featureFlags.ts` 删除 `LLM_TOOL_CALLING_LOOP` 整段 flag 定义。

- [ ] **Step 6: 全量测试**

Run: `cd backend && npm test`
Expected: 所有测试 PASS

Run: `cd backend && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add -A backend/src/agent backend/src/config/featureFlags.ts backend/src/__tests__/agent
git commit -m "refactor(agent): remove legacy Router/Planner/Reporter pipeline

LLM tool-calling loop has been stable in prod for 2+ weeks. Remove dead code paths,
the LLM_TOOL_CALLING_LOOP flag, and legacy tests. AgentLoop is now the single
streaming pipeline."
```

---

## Self-Review

✅ **Spec coverage**:
- §1 背景目标 → Task 整体目标段落
- §2 架构概览 + 模块拆分 → Tasks 1-10 覆盖每个新模块
- §3 数据流 (messages 演化 / 工具结果格式化 / 历史持久化 / selectedCatId / 并发 tool_calls) → Task 8 (AgentLoop) + Task 3 (formatter) 覆盖
- §4 测试策略 → Tasks 2/3/4/8 含 TDD 测试;Task 11 手测
- §5 灰度发布 + 回滚 → Tasks 9/12/13 覆盖 flag 与放量
- §6 system prompt → Task 7
- §7 文件变更清单 → 与文件结构总览一致
- §8 实施分阶段 → 与 Task 1-14 顺序一致
- §9 风险 → Task 11 手动验证 + Task 13 观察期覆盖
- §10 关键决策 → 已落到 spec,plan 不重复

✅ **Placeholder scan**: 无 TBD/TODO,每个 step 都有具体代码或具体命令。

✅ **Type consistency**:
- `LLMStreamEvent` 在 Task 1 定义,在 Task 4(parser)、Task 5(Fake)、Task 8(AgentLoop)使用一致
- `ToolDefinition` 在 Task 1 定义,Task 2(toolAdapter)输出该类型,Task 4/5/8 消费一致
- `ToolResult` 复用现有 `types/agent.ts` 定义,Task 6 暴露 `callTool` 返回该类型,Task 8 处理该类型
- `MessageRole` Task 8 Step 4 扩展为含 `'tool'`,与 AgentLoop 内 `role:'tool'` 用法一致
- `AgentLoop.run` 入参/返回字段(`onContent` / `onToolResult` / `maxIterationsExceeded` / `aborted`)在测试与实现间一致

---

## 执行交接

Plan 完成,保存到 `docs/superpowers/plans/2026-06-14-llm-tool-calling-loop-plan.md`。

**两种执行方式**:

1. **Subagent-Driven(推荐)** — 每个 Task 派发独立 subagent 实现,每完成一个 Task 由我两段审阅(architecture 与 implementation),迭代快、上下文独立、错误容易隔离。

2. **Inline Execution** — 在当前会话内按 Task 顺序执行,周期性 checkpoint 给你审阅。

**选哪个?**
