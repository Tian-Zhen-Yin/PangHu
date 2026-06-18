/**
 * preference.service 单测 — TDD RED
 *
 * 验证 getByCatId 聚合契约：
 *   - 无反馈记录 → 空对象（冷启动语义，preferenceScore 会回退 NEUTRAL=60）
 *   - gameStats 按 gameId 聚合 count + avgScore
 *   - categoryStats 通过 playGames 库把 gameId 映射到 category 后再聚合
 *   - 单样本游戏仍记录在 gameStats（preferenceScore 自行判断是否达到阈值）
 *   - 库外 gameId（脏数据）保留在 gameStats，不进入 categoryStats
 *   - 只查指定 catId 的记录
 *   - avgScore 不预先取整（preferenceScore 末端再 round）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { preferenceService } from '../../services/preference.service'
import prisma from '../../config/database'

vi.mock('../../config/database', () => ({
  default: {
    playFeedback: {
      findMany: vi.fn(),
    },
  },
}))

describe('preferenceService.getByCatId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty stats when cat has no feedback', async () => {
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([])

    const result = await preferenceService.getByCatId('cat-1')

    expect(result).toEqual({ gameStats: {}, categoryStats: {} })
  })

  it('aggregates gameStats by gameId with count and avgScore', async () => {
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([
      { gameId: 'laser-chase', score: 5 },
      { gameId: 'laser-chase', score: 3 },
    ])

    const result = await preferenceService.getByCatId('cat-1')

    expect(result.gameStats['laser-chase']).toEqual({ count: 2, avgScore: 4 })
  })

  it('records single-sample games in gameStats', async () => {
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([
      { gameId: 'laser-chase', score: 5 },
    ])

    const result = await preferenceService.getByCatId('cat-1')

    expect(result.gameStats['laser-chase']).toEqual({ count: 1, avgScore: 5 })
  })

  it('maps gameId to category via playGames library for categoryStats', async () => {
    // laser-chase, tunnel-explore, crinkle-chase 都是 chase
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([
      { gameId: 'laser-chase', score: 5 },
      { gameId: 'tunnel-explore', score: 4 },
      { gameId: 'crinkle-chase', score: 3 },
    ])

    const result = await preferenceService.getByCatId('cat-1')

    expect(result.categoryStats['chase']).toEqual({ count: 3, avgScore: 4 })
  })

  it('keeps library-unknown gameIds in gameStats but excludes from categoryStats', async () => {
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([
      { gameId: 'unknown-game', score: 5 },
      { gameId: 'laser-chase', score: 4 },
    ])

    const result = await preferenceService.getByCatId('cat-1')

    expect(result.gameStats['unknown-game']).toEqual({ count: 1, avgScore: 5 })
    expect(result.categoryStats).toEqual({ chase: { count: 1, avgScore: 4 } })
  })

  it('queries prisma with catId filter and minimal select', async () => {
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([])

    await preferenceService.getByCatId('cat-x')

    expect(prisma.playFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { catId: 'cat-x' },
      }),
    )
  })

  it('preserves fractional avgScore without rounding', async () => {
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([
      { gameId: 'laser-chase', score: 5 },
      { gameId: 'laser-chase', score: 4 },
      { gameId: 'laser-chase', score: 5 },
    ])

    const result = await preferenceService.getByCatId('cat-1')

    // (5+4+5)/3 = 4.666...
    expect(result.gameStats['laser-chase']!.avgScore).toBeCloseTo(4.667, 2)
  })

  it('aggregates categories independently across multiple categories', async () => {
    ;(prisma.playFeedback.findMany as any).mockResolvedValue([
      { gameId: 'laser-chase', score: 5 },     // chase
      { gameId: 'feather-fishing', score: 4 }, // hunting
      { gameId: 'food-puzzle', score: 3 },     // puzzle
      { gameId: 'tunnel-explore', score: 5 },  // chase
    ])

    const result = await preferenceService.getByCatId('cat-1')

    expect(Object.keys(result.categoryStats).sort()).toEqual(['chase', 'hunting', 'puzzle'])
    expect(result.categoryStats['chase']).toEqual({ count: 2, avgScore: 5 })
    expect(result.categoryStats['hunting']).toEqual({ count: 1, avgScore: 4 })
    expect(result.categoryStats['puzzle']).toEqual({ count: 1, avgScore: 3 })
  })
})
