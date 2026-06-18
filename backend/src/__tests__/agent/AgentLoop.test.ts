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
