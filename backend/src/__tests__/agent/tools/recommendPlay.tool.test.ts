/**
 * RecommendPlayTool 单元测试 — 对齐技术设计 §5.1
 *
 * 契约：
 *   1. permissions = ['read']（无写入风险）
 *   2. schema 必填 catId；availableTime / preferredCategory / currentEnergyOverride 可选
 *   3. call 内部委派给 recommend(input, ctx)，原样返回结果（不做二次包装）
 *   4. 不需要 confirmationToken（只读工具）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AgentContext } from '../../../agent/types/agent'

// ===== Mock engine =====
const recommendMock = vi.fn()
vi.mock('../../../agent/recommend/engine', () => ({
  recommend: (input: any, ctx: any) => recommendMock(input, ctx),
}))

import { RecommendPlayTool } from '../../../agent/tools/recommendPlay.tool'

function makeCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    userId: 'user-1',
    sessionId: 's',
    traceId: 't',
    logger: console,
    cache: new Map(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  recommendMock.mockResolvedValue({
    success: true,
    fallback: false,
    suggestions: [
      { game: { id: 'g-1' }, score: 90, breakdown: null, reasons: ['x'] },
    ],
  })
})

describe('RecommendPlayTool — 元信息', () => {
  it('permissions 仅含 read（不含 write）', () => {
    expect(RecommendPlayTool.permissions).toEqual(['read'])
  })

  it('name 为 RECOMMEND_play', () => {
    expect(RecommendPlayTool.name).toBe('RECOMMEND_play')
  })

  it('schema 必填 catId', () => {
    const ok = RecommendPlayTool.schema.safeParse({ catId: 'cat-1' })
    expect(ok.success).toBe(true)
    const bad = RecommendPlayTool.schema.safeParse({})
    expect(bad.success).toBe(false)
  })

  it('schema 可选 availableTime / preferredCategory', () => {
    const r = RecommendPlayTool.schema.safeParse({
      catId: 'cat-1',
      availableTime: 10,
      preferredCategory: 'puzzle',
    })
    expect(r.success).toBe(true)
  })

  it('schema 拒绝非法 preferredCategory', () => {
    const r = RecommendPlayTool.schema.safeParse({
      catId: 'cat-1',
      preferredCategory: 'invalid-cat',
    })
    expect(r.success).toBe(false)
  })
})

describe('RecommendPlayTool — call 委派', () => {
  it('原样调用 recommend(input, ctx) 并返回其结果', async () => {
    const ctx = makeCtx()
    const result = await RecommendPlayTool.call(
      { catId: 'cat-1', availableTime: 10 },
      ctx,
    )
    expect(recommendMock).toHaveBeenCalledTimes(1)
    expect(recommendMock).toHaveBeenCalledWith(
      { catId: 'cat-1', availableTime: 10 },
      ctx,
    )
    expect(result.success).toBe(true)
    expect(result.suggestions).toHaveLength(1)
  })

  it('不依赖 confirmationToken（只读，无需确认）', async () => {
    const ctx = makeCtx({ confirmationToken: undefined })
    const result = await RecommendPlayTool.call({ catId: 'cat-1' }, ctx)
    expect(result.success).toBe(true)
  })

  it('engine 抛错 → 工具返回 success=false（不抛给上游）', async () => {
    recommendMock.mockRejectedValueOnce(new Error('boom'))
    const result = await RecommendPlayTool.call({ catId: 'cat-1' }, makeCtx())
    expect(result.success).toBe(false)
    expect(result.message).toBeDefined()
  })
})
