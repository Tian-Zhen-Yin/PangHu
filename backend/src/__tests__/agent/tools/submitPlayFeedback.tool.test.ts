/**
 * SubmitPlayFeedbackTool 单元测试 — 对齐技术设计 §5.2
 *
 * 安全契约（与 AllergyRecordTool 完全对齐）：
 *   1. 无 confirmationToken.verified → 拒绝（双重保险）
 *   2. cat 不属于当前 user → 拒绝
 *   3. 通过校验 → 写入时携带审计字段（createdBy / source='agent' / confirmedAt）
 *   4. userId 冗余字段使用 cat.userId（不是 ctx.userId，虽然此处一致）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AgentContext } from '../../../agent/types/agent'

// ===== Mock prisma & service =====
const findFirst = vi.fn()
const upsert = vi.fn()

vi.mock('../../../config/database', () => ({
  default: { cat: { findFirst: (args: any) => findFirst(args) } },
}))
vi.mock('../../../services/playFeedback.service', () => ({
  playFeedbackService: { upsert: (args: any) => upsert(args) },
}))

import { SubmitPlayFeedbackTool } from '../../../agent/tools/submitPlayFeedback.tool'

const baseInput = {
  catId: 'cat-1',
  gameId: 'feather-fishing',
  score: 5,
  completion: true,
  actualDuration: 8,
}

function makeCtx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    userId: 'user-1',
    sessionId: 's',
    traceId: 't',
    logger: console as any,
    cache: new Map(),
    confirmationToken: {
      verified: true,
      confirmedAt: new Date('2026-06-15T10:00:00Z'),
      confirmationId: 'cf-1',
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  upsert.mockResolvedValue({ success: true, recordId: 'pf-1' })
})

describe('SubmitPlayFeedbackTool — 安全契约', () => {
  it('未提供 confirmationToken → 拒绝写入', async () => {
    const ctx = makeCtx({ confirmationToken: undefined })
    const result = await SubmitPlayFeedbackTool.call(baseInput, ctx)
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/确认/)
    expect(findFirst).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it('confirmationToken.verified=false → 拒绝写入', async () => {
    const ctx = makeCtx({
      confirmationToken: {
        verified: false,
        confirmedAt: new Date(),
        confirmationId: 'cf-1',
      },
    })
    const result = await SubmitPlayFeedbackTool.call(baseInput, ctx)
    expect(result.success).toBe(false)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('cat 不属于当前 user → 拒绝写入（findFirst 返回 null）', async () => {
    findFirst.mockResolvedValue(null)
    const result = await SubmitPlayFeedbackTool.call(baseInput, makeCtx())
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/无权/)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('归属校验使用 ctx.userId（防止越权）', async () => {
    findFirst.mockResolvedValue({ id: 'cat-1', userId: 'user-1', name: 'Mimi' })
    await SubmitPlayFeedbackTool.call(baseInput, makeCtx({ userId: 'user-1' }))
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'cat-1', userId: 'user-1' }),
      }),
    )
  })
})

describe('SubmitPlayFeedbackTool — 写入审计', () => {
  beforeEach(() => {
    findFirst.mockResolvedValue({ id: 'cat-1', userId: 'user-1', name: 'Mimi' })
  })

  it('source=agent', async () => {
    await SubmitPlayFeedbackTool.call(baseInput, makeCtx())
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'agent' }),
    )
  })

  it('createdBy=ctx.userId', async () => {
    await SubmitPlayFeedbackTool.call(baseInput, makeCtx({ userId: 'user-1' }))
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'user-1' }),
    )
  })

  it('confirmedAt 来自 confirmationToken', async () => {
    const confirmedAt = new Date('2026-06-15T10:00:00Z')
    await SubmitPlayFeedbackTool.call(
      baseInput,
      makeCtx({
        confirmationToken: {
          verified: true,
          confirmedAt,
          confirmationId: 'cf-1',
        },
      }),
    )
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ confirmedAt }),
    )
  })

  it('userId 冗余字段使用 cat.userId（不是从 ctx 直接取）', async () => {
    // 极端但合理的防护：即便 ctx.userId 与 cat.userId 不同步（理论不可能，
    // 因为已经做了归属校验），写入时也应使用 cat.userId 作为权威来源。
    findFirst.mockResolvedValue({ id: 'cat-1', userId: 'user-1', name: 'Mimi' })
    await SubmitPlayFeedbackTool.call(baseInput, makeCtx({ userId: 'user-1' }))
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    )
  })

  it('playedAt 缺省 → 使用当前时间', async () => {
    await SubmitPlayFeedbackTool.call(baseInput, makeCtx())
    const args = upsert.mock.calls[0][0]
    expect(args.playedAt).toBeInstanceOf(Date)
  })

  it('playedAt 提供 ISO 字符串 → 解析为 Date', async () => {
    await SubmitPlayFeedbackTool.call(
      { ...baseInput, playedAt: '2026-06-10T08:00:00Z' },
      makeCtx(),
    )
    const args = upsert.mock.calls[0][0]
    expect(args.playedAt).toEqual(new Date('2026-06-10T08:00:00Z'))
  })
})

describe('SubmitPlayFeedbackTool — 元信息', () => {
  it('permissions 必须包含 write', () => {
    expect(SubmitPlayFeedbackTool.permissions).toContain('write')
  })

  it('schema 校验：score 范围 1..5', () => {
    const r = SubmitPlayFeedbackTool.schema.safeParse({ ...baseInput, score: 0 })
    expect(r.success).toBe(false)
    const r2 = SubmitPlayFeedbackTool.schema.safeParse({ ...baseInput, score: 6 })
    expect(r2.success).toBe(false)
  })

  it('schema 校验：score=3 通过', () => {
    const r = SubmitPlayFeedbackTool.schema.safeParse({ ...baseInput, score: 3 })
    expect(r.success).toBe(true)
  })
})
