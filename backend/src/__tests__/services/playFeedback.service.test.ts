/**
 * playFeedback.service 单测 — TDD RED
 *
 * 验证 upsert 契约：
 *   - 通过 prisma.playFeedback.upsert，复合键为 (catId, gameId, playedAt)
 *   - create 分支带审计字段（createdBy / source / confirmedAt / userId）
 *   - update 分支只覆盖动态字段（score / completion / actualDuration / notes /
 *     confirmedAt / source），保留 createdBy
 *   - 成功返回 { success: true, recordId }
 *   - prisma 抛错时返回 { success: false }，并记录日志（由调用方注入）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { playFeedbackService } from '../../services/playFeedback.service'
import prisma from '../../config/database'

vi.mock('../../config/database', () => ({
  default: {
    playFeedback: {
      upsert: vi.fn(),
    },
  },
}))

describe('playFeedbackService.upsert', () => {
  const playedAt = new Date('2026-06-16T10:00:00.000Z')
  const confirmedAt = new Date('2026-06-16T10:00:30.000Z')

  const baseInput = {
    catId: 'cat-1',
    userId: 'user-1',
    gameId: 'tunnel-explore',
    score: 5,
    completion: true,
    actualDuration: 12,
    playedAt,
    notes: '玩得很开心',
    createdBy: 'user-1',
    source: 'agent' as const,
    confirmedAt,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns recordId on success', async () => {
    ;(prisma.playFeedback.upsert as any).mockResolvedValue({ id: 'fb-1' })

    const result = await playFeedbackService.upsert(baseInput)

    expect(result).toEqual({ success: true, recordId: 'fb-1' })
  })

  it('uses composite unique key (catId, gameId, playedAt) to upsert', async () => {
    ;(prisma.playFeedback.upsert as any).mockResolvedValue({ id: 'fb-2' })

    await playFeedbackService.upsert(baseInput)

    expect(prisma.playFeedback.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          catId_gameId_playedAt: {
            catId: 'cat-1',
            gameId: 'tunnel-explore',
            playedAt,
          },
        },
      })
    )
  })

  it('create branch carries full audit fields including createdBy/source/confirmedAt', async () => {
    ;(prisma.playFeedback.upsert as any).mockResolvedValue({ id: 'fb-3' })

    await playFeedbackService.upsert(baseInput)

    const call = (prisma.playFeedback.upsert as any).mock.calls[0][0]
    expect(call.create).toMatchObject({
      catId: 'cat-1',
      userId: 'user-1',
      gameId: 'tunnel-explore',
      score: 5,
      completion: true,
      actualDuration: 12,
      playedAt,
      notes: '玩得很开心',
      createdBy: 'user-1',
      source: 'agent',
      confirmedAt,
    })
  })

  it('update branch updates dynamic fields and confirmedAt but never createdBy', async () => {
    ;(prisma.playFeedback.upsert as any).mockResolvedValue({ id: 'fb-4' })

    await playFeedbackService.upsert(baseInput)

    const call = (prisma.playFeedback.upsert as any).mock.calls[0][0]
    expect(call.update).toMatchObject({
      score: 5,
      completion: true,
      actualDuration: 12,
      notes: '玩得很开心',
      confirmedAt,
      source: 'agent',
    })
    expect(call.update.createdBy).toBeUndefined()
  })

  it('returns success=false when prisma throws', async () => {
    ;(prisma.playFeedback.upsert as any).mockRejectedValue(new Error('db down'))

    const result = await playFeedbackService.upsert(baseInput)

    expect(result.success).toBe(false)
    expect(result.recordId).toBeUndefined()
  })

  it('persists undefined notes as null in create', async () => {
    ;(prisma.playFeedback.upsert as any).mockResolvedValue({ id: 'fb-5' })

    await playFeedbackService.upsert({ ...baseInput, notes: undefined })

    const call = (prisma.playFeedback.upsert as any).mock.calls[0][0]
    expect(call.create.notes ?? null).toBeNull()
  })
})
