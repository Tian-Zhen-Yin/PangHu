/**
 * preferenceScore 单元测试 — 对齐技术设计 §4.3.4
 *
 * 三分支优先级：
 *   1. 游戏级：count ≥ 2 → (avgScore - 1) * 25       （1→0, 5→100）
 *   2. 类别级：count ≥ 3 → (avgScore - 1) * 25 * 0.7 （类别级打 0.7 折）
 *   3. 冷启动：NEUTRAL = 60                          （所有游戏同分，不影响排序）
 *
 * 冷启动是 P0/P1 的关键分界：P0 时所有 cat 都返回 60，
 * 偏好学习只影响 P1+ 的排序。任何修改都不能破坏冷启动语义。
 */

import { describe, it, expect } from 'vitest'
import { preferenceScore } from '../../../../agent/recommend/scoring/preference'
import {
  fakeGame,
  emptyPref,
  prefWithGame,
  prefWithCategory,
} from '../../../fixtures/play'

describe('preferenceScore', () => {
  describe('冷启动分支', () => {
    it('emptyPref → NEUTRAL (60)', () => {
      expect(preferenceScore(fakeGame({ id: 'g1' }), emptyPref())).toBe(60)
    })

    it('该游戏只有 1 次记录（< MIN_GAME_SAMPLE=2）→ 仍走冷启动', () => {
      const pref = prefWithGame('g1', 1, 5)
      expect(preferenceScore(fakeGame({ id: 'g1' }), pref)).toBe(60)
    })

    it('类别只有 2 次记录（< MIN_CAT_SAMPLE=3）→ 仍走冷启动', () => {
      const pref = prefWithCategory('chase', 2, 5)
      expect(preferenceScore(fakeGame({ id: 'g1', category: 'chase' }), pref)).toBe(60)
    })
  })

  describe('游戏级分支（count ≥ 2）', () => {
    it('avgScore=1 → 0（最差）', () => {
      const pref = prefWithGame('g1', 2, 1)
      expect(preferenceScore(fakeGame({ id: 'g1' }), pref)).toBe(0)
    })

    it('avgScore=3 → 50（中间）', () => {
      const pref = prefWithGame('g1', 5, 3)
      expect(preferenceScore(fakeGame({ id: 'g1' }), pref)).toBe(50)
    })

    it('avgScore=5 → 100（最佳）', () => {
      const pref = prefWithGame('g1', 10, 5)
      expect(preferenceScore(fakeGame({ id: 'g1' }), pref)).toBe(100)
    })

    it('avgScore=4.6 → 90（含小数四舍五入）', () => {
      const pref = prefWithGame('g1', 3, 4.6)
      expect(preferenceScore(fakeGame({ id: 'g1' }), pref)).toBe(90)
    })
  })

  describe('类别级分支（count ≥ 3，0.7 折）', () => {
    it('类别 avgScore=5 → 70（100 * 0.7）', () => {
      const pref = prefWithCategory('chase', 3, 5)
      expect(preferenceScore(fakeGame({ id: 'g-new', category: 'chase' }), pref)).toBe(70)
    })

    it('类别 avgScore=3 → 35（50 * 0.7）', () => {
      const pref = prefWithCategory('chase', 3, 3)
      expect(preferenceScore(fakeGame({ id: 'g-new', category: 'chase' }), pref)).toBe(35)
    })

    it('类别 avgScore=1 → 0', () => {
      const pref = prefWithCategory('chase', 5, 1)
      expect(preferenceScore(fakeGame({ id: 'g-new', category: 'chase' }), pref)).toBe(0)
    })
  })

  describe('优先级：游戏级优先于类别级', () => {
    it('同时有游戏级和类别级数据，应走游戏级分支', () => {
      const pref: ReturnType<typeof emptyPref> = {
        gameStats: { 'g1': { count: 2, avgScore: 5 } },         // 100
        categoryStats: { 'chase': { count: 10, avgScore: 1 } }, // 0
      }
      // 命中游戏级 → 100，而不是类别级的 0
      expect(preferenceScore(fakeGame({ id: 'g1', category: 'chase' }), pref)).toBe(100)
    })
  })
})
