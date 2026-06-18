/**
 * buildReasons 单元测试 — 对齐技术设计 §4.7
 *
 * 规则：
 *   sP === 100         → "匹配{性格}"
 *   sE === 100         → "精力档位完全匹配"
 *   sE >= 75 且 ≠ 100  → "精力档位接近"
 *   sT === 100         → "刚好 N 分钟"
 *   sT >= 80 且 < 100 且 game.durationMin < availableTime → "时间充裕"
 *   sR >= 75           → "{name}之前很喜欢"
 *   全部空 → "综合评估推荐"（兜底，避免空 reasons）
 */

import { describe, it, expect } from 'vitest'
import { buildReasons } from '../../../agent/recommend/explain'
import { fakeCat, fakeGame } from '../../fixtures/play'

describe('buildReasons', () => {
  it('全分满 → 性格 + 精力 + 时间 + 偏好（4 条）', () => {
    const cat = fakeCat({ personality: 'active', name: 'Mimi' })
    const game = fakeGame({ durationMin: 10 })
    const reasons = buildReasons(game, cat, { sP: 100, sE: 100, sT: 100, sR: 100 }, 10)
    expect(reasons).toHaveLength(4)
    expect(reasons.some(r => r.includes('Mimi'))).toBe(true)
  })

  it('sE=75 → "精力档位接近"（不含"完全匹配"）', () => {
    const cat = fakeCat()
    const game = fakeGame()
    const reasons = buildReasons(game, cat, { sP: 0, sE: 75, sT: 0, sR: 0 }, 10)
    expect(reasons).toContain('精力档位接近')
    expect(reasons).not.toContain('精力档位完全匹配')
  })

  it('sE=100 → "精力档位完全匹配"（不含"接近"，避免重复）', () => {
    const cat = fakeCat()
    const game = fakeGame()
    const reasons = buildReasons(game, cat, { sP: 0, sE: 100, sT: 0, sR: 0 }, 10)
    expect(reasons).toContain('精力档位完全匹配')
    expect(reasons).not.toContain('精力档位接近')
  })

  it('sT=100 → 用具体分钟数', () => {
    const cat = fakeCat()
    const game = fakeGame({ durationMin: 10 })
    const reasons = buildReasons(game, cat, { sP: 0, sE: 0, sT: 100, sR: 0 }, 10)
    expect(reasons.some(r => r.includes('10') && r.includes('分钟'))).toBe(true)
  })

  it('sT >= 80 且 durationMin < availableTime → "时间充裕"', () => {
    const cat = fakeCat()
    const game = fakeGame({ durationMin: 5 })
    const reasons = buildReasons(game, cat, { sP: 0, sE: 0, sT: 80, sR: 0 }, 10)
    expect(reasons).toContain('时间充裕')
  })

  it('sT >= 80 但 durationMin >= availableTime → 不出现"时间充裕"', () => {
    const cat = fakeCat()
    const game = fakeGame({ durationMin: 12 })
    // ratio=1.2 → sT=80，但游戏时长比可用时长长，不应说"充裕"
    const reasons = buildReasons(game, cat, { sP: 0, sE: 0, sT: 80, sR: 0 }, 10)
    expect(reasons).not.toContain('时间充裕')
  })

  it('sR >= 75 → 引用猫名字', () => {
    const cat = fakeCat({ name: 'Mimi' })
    const game = fakeGame()
    const reasons = buildReasons(game, cat, { sP: 0, sE: 0, sT: 0, sR: 75 }, 10)
    expect(reasons.some(r => r.includes('Mimi'))).toBe(true)
  })

  it('全部为 0 → 兜底文案（避免空 reasons）', () => {
    const cat = fakeCat()
    const game = fakeGame()
    const reasons = buildReasons(game, cat, { sP: 0, sE: 0, sT: 0, sR: 0 }, 10)
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toBe('综合评估推荐')
  })

  it('reasons 不含开发者术语（与 fallback 一致）', () => {
    const cat = fakeCat()
    const game = fakeGame({ durationMin: 10 })
    const reasons = buildReasons(game, cat, { sP: 100, sE: 100, sT: 100, sR: 100 }, 10)
    const text = reasons.join('|')
    expect(text).not.toMatch(/score|breakdown|fallback|降级/i)
  })
})
