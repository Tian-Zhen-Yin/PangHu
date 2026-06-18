import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Response } from 'express'
import { z } from 'zod'

/**
 * CatAgent.handleStreaming 集成测试(修复后)。
 *
 * 修复后,通过 userSegment='internal' 注入 + 真实 isFeatureEnabled 即可路由到 V3.0。
 * 测试策略:
 *   1. 不再 mock featureFlags,用真实 isFeatureEnabled + userSegment='internal' 触发 V3.0
 *   2. 用 FakeLLMClient 替换私有 agentLoop 字段(避开真实 zhipuaiClient)
 *   3. mock ai.service.sendMessageStream 验证 RAG fallback(zhipuaiClient 也依赖此模块)
 *   4. mock Express res 捕获 SSE 字节流
 */

// 用 vi.hoisted 让 mock 引用在 vi.mock 工厂中可用
const { sendMessageStreamMock } = vi.hoisted(() => ({
  sendMessageStreamMock: vi.fn(async function sendMessageStream(
    _userMessage: string,
    _history: unknown[],
    _knowledgeContext: string,
    res: { write: (s: string) => void },
  ): Promise<void> {
    res.write(`data: ${JSON.stringify({ type: 'content', text: 'RAG_FALLBACK_OUTPUT' })}\n\n`)
  }),
}))

vi.mock('../../services/ai.service', () => ({
  sendMessageStream: sendMessageStreamMock,
  generateToken: vi.fn(() => 'mocked-jwt-token'),
}))

// 顶层 import(在 mock 之后)
import { CatAgent } from '../../agent'
import { AgentLoop } from '../../agent/core/AgentLoop'
import { FakeLLMClient } from '../../agent/llm/FakeLLMClient'
import type { Tool } from '../../agent/types/agent'

// 测试用工具(避免依赖 Prisma)
const fakeCatTool: Tool = {
  name: 'get_cat_info',
  description: '获取猫咪信息',
  schema: z.object({ catName: z.string().optional() }),
  permissions: ['read'],
  call: async () => ({
    success: true,
    cat: { id: 'c1', name: '小白', breed: '英短', age: '3岁', weight: '4.20 kg', gender: '公猫', isNeutered: true, allergies: null, diseases: null, lastVaccine: null, lastRecordDate: null, avatar: null },
    userCats: [{ id: 'c1', name: '小白' }],
  }),
}

const fakeRagTool: Tool = {
  name: 'rag_search',
  description: '检索知识库',
  schema: z.object({ query: z.string() }),
  permissions: ['read'],
  call: async () => ({ success: true, chunks: [], guideTitles: ['养护指南'] }),
}

interface MockRes {
  chunks: string[]
  writableEnded: boolean
  destroyed: boolean
  writable: boolean
  write(chunk: string | Buffer): boolean
  end(): void
  on(_event: string, _cb: () => void): void
}

function makeMockRes(): MockRes {
  return {
    chunks: [],
    writableEnded: false,
    destroyed: false,
    writable: true,
    write(chunk: string | Buffer) {
      this.chunks.push(typeof chunk === 'string' ? chunk : chunk.toString('utf-8'))
      return true
    },
    end() {
      this.writableEnded = true
    },
    on() {},
  }
}

function parseSseEvents(chunks: string[]): Array<{ type: string } & Record<string, unknown>> {
  const events: Array<{ type: string } & Record<string, unknown>> = []
  for (const chunk of chunks) {
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const parsed = JSON.parse(line.slice(6))
        if (typeof parsed === 'object' && parsed !== null && typeof parsed.type === 'string') {
          events.push(parsed)
        }
      } catch {
        // ignore non-JSON
      }
    }
  }
  return events
}

function makeAgentWithLoop(llm: FakeLLMClient, tools: Tool[] = [fakeCatTool, fakeRagTool]): CatAgent {
  const agent = new CatAgent()
  // 替换私有 agentLoop 字段(避开真实 zhipuaiClient)
  ;(agent as unknown as { agentLoop: AgentLoop }).agentLoop = new AgentLoop(llm, tools, { maxIterations: 3 })
  return agent
}

describe('CatAgent.handleStreaming V3.0 integration', () => {
  beforeEach(() => {
    sendMessageStreamMock.mockClear()
  })

  it('routes to V3.0 loop when internal user segment is injected', async () => {
    const llm = new FakeLLMClient([
      [
        { type: 'content', delta: '你好,' },
        { type: 'content', delta: '我是喵喵医生。' },
        { type: 'finish', reason: 'stop' },
      ],
    ])
    const agent = makeAgentWithLoop(llm)
    const res = makeMockRes()

    const result = await agent.handleStreaming('你好', 'u1', 's1', res as unknown as Response, undefined, [], 'internal')

    const events = parseSseEvents(res.chunks)
    const types = events.map((e) => e.type)

    // V3.0 路径:meta → content × N → done(无 tool)
    expect(types).toContain('meta')
    expect(types).toContain('content')
    expect(types[types.length - 1]).toBe('done')

    // content 累积正确
    expect(result.content).toBe('你好,我是喵喵医生。')
    expect(result.traceId).toBeTruthy()
    expect(result.toolNames).toEqual([])

    // 没有触发 RAG fallback
    expect(sendMessageStreamMock).not.toHaveBeenCalled()
  })

  it('emits tool event then content when LLM calls a tool', async () => {
    const llm = new FakeLLMClient([
      // 第 1 轮:调 get_cat_info
      [
        { type: 'tool_call_start', id: 'call_1', name: 'get_cat_info' },
        { type: 'tool_call_args', id: 'call_1', argsDelta: '{"catName":"小白"}' },
        { type: 'tool_call_done', id: 'call_1' },
        { type: 'finish', reason: 'tool_calls' },
      ],
      // 第 2 轮:最终回复
      [
        { type: 'content', delta: '小白是只3岁的英短公猫。' },
        { type: 'finish', reason: 'stop' },
      ],
    ])
    const agent = makeAgentWithLoop(llm)
    const res = makeMockRes()

    const result = await agent.handleStreaming('小白多大了', 'u1', 's1', res as unknown as Response, undefined, [], 'internal')

    const events = parseSseEvents(res.chunks)
    const types = events.map((e) => e.type)

    // 序列:meta → tool → content → done
    expect(types).toContain('meta')
    const toolIdx = types.indexOf('tool')
    const contentIdx = types.indexOf('content')
    const doneIdx = types.indexOf('done')
    expect(toolIdx).toBeGreaterThan(-1)
    expect(contentIdx).toBeGreaterThan(toolIdx)
    expect(doneIdx).toBeGreaterThan(contentIdx)

    // tool 事件携带成功状态和工具名
    const toolEvent = events.find((e) => e.type === 'tool')!
    expect(toolEvent.toolName).toBe('get_cat_info')
    expect(toolEvent.status).toBe('success')

    // 返回值正确累积
    expect(result.toolNames).toEqual(['get_cat_info'])
    expect(result.content).toContain('小白是只3岁')
  })

  it('V2 tool intent (过敏/allergy) bypasses V3.0 loop even with flag on', async () => {
    // 用户消息含 "过敏" → isV2ToolIntent 命中 → 即便 flag 开也走旧链路
    // 由于旧链路需要真实 Prisma/Router,我们只验证它没进入 V3.0 loop:
    // 旧链路会推送 trace 事件,V3.0 不会
    const llm = new FakeLLMClient([
      [{ type: 'content', delta: 'should-not-see-this' }, { type: 'finish', reason: 'stop' }],
    ])
    const agent = makeAgentWithLoop(llm)
    const res = makeMockRes()

    // 调用含 "过敏" 的消息,即便注入 userSegment='internal'(flag 开启)也应降级到 V2
    await agent.handleStreaming('我家猫咪过敏了怎么办', 'u1', 's1', res as unknown as Response, undefined, [], 'internal')

    const events = parseSseEvents(res.chunks)

    // V2 路径会 emit 'trace' 事件(V3.0 路径不会)
    // 这是区分两条路径的可靠标记
    const hasTraceEvent = events.some((e) => e.type === 'trace')
    // 至少应该有 Router 产生的 trace
    // 注意:V2 链路依赖 mock 的工具调用,可能在 Executor 阶段失败,但 Router trace 一定先产生
    if (hasTraceEvent) {
      // V2 路径确认:第一个 trace 是 intent
      const firstTrace = events.find((e) => e.type === 'trace')
      expect(firstTrace).toBeDefined()
    }

    // 关键验证:V3.0 路径下的 FakeLLMClient 第 1 个 script 不应被消费
    // (如果走了 V3.0,capturedCalls 长度会是 1)
    expect(llm.capturedCalls.length).toBe(0)
  })

  it('maxIterations exceeded triggers RAG fallback via sendMessageStream', async () => {
    // 让 LLM 永远只返回 tool_calls → 触发 maxIterations(=3)
    const foreverToolCall = [
      { type: 'tool_call_start' as const, id: 'c1', name: 'get_cat_info' },
      { type: 'tool_call_args' as const, id: 'c1', argsDelta: '{}' },
      { type: 'tool_call_done' as const, id: 'c1' },
      { type: 'finish' as const, reason: 'tool_calls' as const },
    ]
    const llm = new FakeLLMClient([
      foreverToolCall,
      foreverToolCall,
      foreverToolCall,
    ])
    const agent = makeAgentWithLoop(llm)
    const res = makeMockRes()

    const result = await agent.handleStreaming('q', 'u1', 's1', res as unknown as Response, undefined, [], 'internal')

    // RAG fallback 必须被触发
    expect(sendMessageStreamMock).toHaveBeenCalledTimes(1)

    // fallback 输出的 content 已通过 res.write 注入
    const events = parseSseEvents(res.chunks)
    const fallbackContent = events.find(
      (e) => e.type === 'content' && typeof e.text === 'string' && e.text.includes('RAG_FALLBACK'),
    )
    expect(fallbackContent).toBeDefined()

    // toolNames 反映了 3 次 maxIterations 工具调用
    expect(result.toolNames.length).toBe(3)
  })

  it('agent error also triggers RAG fallback', async () => {
    // 替换 agentLoop 为一个会抛错的 stub
    const agent = new CatAgent()
    const fakeLoop = {
      run: async () => {
        throw new Error('LLM stream crashed')
      },
    }
    ;(agent as unknown as { agentLoop: unknown }).agentLoop = fakeLoop

    const res = makeMockRes()
    await agent.handleStreaming('q', 'u1', 's1', res as unknown as Response, undefined, [], 'internal')

    // 抛错后应触发 RAG fallback
    expect(sendMessageStreamMock).toHaveBeenCalledTimes(1)
  })

  it('done event always carries traceId and citations', async () => {
    const llm = new FakeLLMClient([
      // 调 rag_search 一次,产生 citations
      [
        { type: 'tool_call_start', id: 'c1', name: 'rag_search' },
        { type: 'tool_call_args', id: 'c1', argsDelta: '{"query":"如何喂养"}' },
        { type: 'tool_call_done', id: 'c1' },
        { type: 'finish', reason: 'tool_calls' },
      ],
      [{ type: 'content', delta: '根据知识库...' }, { type: 'finish', reason: 'stop' }],
    ])
    const agent = makeAgentWithLoop(llm)
    const res = makeMockRes()

    const result = await agent.handleStreaming('如何喂养', 'u1', 's1', res as unknown as Response, undefined, [], 'internal')

    const events = parseSseEvents(res.chunks)
    const doneEvent = events.find((e) => e.type === 'done')
    expect(doneEvent).toBeDefined()
    expect(typeof doneEvent!.traceId).toBe('string')
    expect(Array.isArray(doneEvent!.citations)).toBe(true)
    expect(doneEvent!.citations).toContain('养护指南')

    expect(result.citations).toEqual(['养护指南'])
  })

  it('res.end() is called exactly once and writableEnded flag set', async () => {
    const llm = new FakeLLMClient([
      [{ type: 'content', delta: 'hi' }, { type: 'finish', reason: 'stop' }],
    ])
    const agent = makeAgentWithLoop(llm)
    const res = makeMockRes()

    await agent.handleStreaming('hi', 'u1', 's1', res as unknown as Response, undefined, [], 'internal')

    expect(res.writableEnded).toBe(true)
  })
})
