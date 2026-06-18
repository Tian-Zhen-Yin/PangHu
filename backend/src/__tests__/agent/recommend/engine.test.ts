/**
 * recommend 引擎集成测试 — 对齐技术设计 §4.2 主流程
 *
 * 验收 PRD §11 端到端验收的算法部分（健康违规率=0、多样性、降级）。
 * 不依赖真实 DB：通过 vi.mock 桩 catProfileService / preferenceService。
 *
 * 注意：本测试假设 recommend(input, ctx) 内部使用 §4.2 的固定游戏库（games）；
 * 如实现允许注入游戏库，未来可拆出更细的契约测试。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fakeCat, fakeGameLibrary, emptyPref } from '../../fixtures/play'

// ===== Mock service 层 =====
const getCatById = vi.fn()
const getPrefByCatId = vi.fn()

vi.mock('../../../services/catProfile.service', () => ({
  catProfileService: { getById: (id: string) => getCatById(id) },
}))
vi.mock('../../../services/preference.service', () => ({
  preferenceService: { getByCatId: (id: string) => getPrefByCatId(id) },
}))

// 注入测试游戏库（如果实现使用模块级 const，这里不会生效；那时实现需提供注入入口）
vi.mock('../../../data/playGames', () => ({
  playGames: fakeGameLibrary(),
}))

import { recommend } from '../../../agent/recommend/engine'
import type { AgentContext } from '../../../agent/types/agent'

const ctx: AgentContext = {
  userId: 'user-1',
  sessionId: 's',
  traceId: 't',
  logger: console,
  cache: new Map(),
}

beforeEach(() => {
  vi.clearAllMocks()
  getPrefByCatId.mockResolvedValue(emptyPref())
})

describe('recommend engine — 正常路径', () => {
  it('正常猫 + 默认参数 → 返回 ≤ 5 条 suggestion，fallback=false', async () => {
    getCatById.mockResolvedValue(fakeCat({ personality: 'active', energyBaseline: 3 }))
    const result = await recommend({ catId: 'cat-1' }, ctx)
    expect(result.fallback).toBe(false)
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.length).toBeLessThanOrEqual(5)
  })

  it('多样性约束：同 category 在默认参数下 ≤ 2 条', async () => {
    getCatById.mockResolvedValue(fakeCat({ personality: 'active', energyBaseline: 3 }))
    const result = await recommend({ catId: 'cat-1', availableTime: 10 }, ctx)
    const byCategory: Record<string, number> = {}
    for (const s of result.suggestions) {
      byCategory[s.game.category] = (byCategory[s.game.category] ?? 0) + 1
    }
    for (const [, count] of Object.entries(byCategory)) {
      expect(count).toBeLessThanOrEqual(2)
    }
  })

  it('每条 suggestion 都附带 reasons（非空）', async () => {
    getCatById.mockResolvedValue(fakeCat({ personality: 'active' }))
    const result = await recommend({ catId: 'cat-1' }, ctx)
    for (const s of result.suggestions) {
      expect(s.reasons.length).toBeGreaterThan(0)
    }
  })
})

describe('recommend engine — 健康过滤（PRD R310 / 验收：违规率=0）', () => {
  it('senior 猫 → 推荐结果中不含 energyCost ≥ 4 的游戏', async () => {
    getCatById.mockResolvedValue(
      fakeCat({ personality: 'active', energyBaseline: 2, healthTags: ['senior'] }),
    )
    const result = await recommend({ catId: 'cat-1', availableTime: 10 }, ctx)
    for (const s of result.suggestions) {
      expect(s.game.energyCost).toBeLessThan(4)
    }
  })

  it('post_op 猫 → 推荐结果中不含 energyCost ≥ 3 的游戏', async () => {
    getCatById.mockResolvedValue(
      fakeCat({ personality: 'active', energyBaseline: 2, healthTags: ['post_op'] }),
    )
    const result = await recommend({ catId: 'cat-1', availableTime: 10 }, ctx)
    for (const s of result.suggestions) {
      expect(s.game.energyCost).toBeLessThan(3)
    }
  })

  it('kitten 猫 → 推荐结果中不含 catnip-toy / laser-chase', async () => {
    getCatById.mockResolvedValue(
      fakeCat({ personality: 'active', energyBaseline: 2, healthTags: ['kitten'] }),
    )
    const result = await recommend({ catId: 'cat-1', availableTime: 10 }, ctx)
    const ids = result.suggestions.map(s => s.game.id)
    expect(ids).not.toContain('catnip-toy')
    expect(ids).not.toContain('laser-chase')
  })
})

describe('recommend engine — 降级路径', () => {
  it('档案缺失（无 personality）→ 走 needProfileCompletion', async () => {
    getCatById.mockResolvedValue(fakeCat({ personality: null }))
    const result = await recommend({ catId: 'cat-1' }, ctx)
    // 兼容两种实现：要么 success=false 标记，要么有专门字段
    expect(
      result.success === false || (result as any).needProfileCompletion === true,
    ).toBe(true)
  })

  it('健康标签全禁（极端 senior + post_op + kitten）→ L2 兽医提示', async () => {
    getCatById.mockResolvedValue(
      fakeCat({
        personality: 'active',
        healthTags: ['senior', 'post_op', 'kitten'],
      }),
    )
    const result = await recommend({ catId: 'cat-1', availableTime: 10 }, ctx)
    if (result.suggestions.length === 0) {
      // L2 路径：必须返回 success=false + 兽医提示
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/兽医/)
    } else {
      // 若仍有结果，不能违反禁忌
      for (const s of result.suggestions) {
        expect(s.game.contraindications).not.toContain('senior')
        expect(s.game.contraindications).not.toContain('post_op')
        expect(s.game.contraindications).not.toContain('kitten')
      }
    }
  })

  it('availableTime=1（极端短）→ soft-fallback 放宽到 timeFlex=0.5 仍能给出建议', async () => {
    getCatById.mockResolvedValue(fakeCat({ personality: 'active' }))
    const result = await recommend({ catId: 'cat-1', availableTime: 1 }, ctx)
    // 不应直接空：经过 soft-fallback 三步放宽后仍能产出结果
    expect(result.suggestions.length).toBeGreaterThan(0)
  })
})

describe('recommend engine — preferredCategory 软加权（B3）', () => {
  it('preferredCategory=puzzle，但 puzzle 类只有 1 条 → 不应丢弃其他类，软加权降级', async () => {
    getCatById.mockResolvedValue(fakeCat({ personality: 'active', energyBaseline: 3 }))
    const result = await recommend(
      { catId: 'cat-1', availableTime: 10, preferredCategory: 'puzzle' },
      ctx,
    )
    // 软加权后总条数应 ≥ 3（不是只剩一条 puzzle）
    expect(result.suggestions.length).toBeGreaterThanOrEqual(3)
  })
})
