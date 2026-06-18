/**
 * personalityScore 单元测试 — 对齐技术设计 §4.3.1
 *
 * 三档输出：
 *   100  — 显式命中 fitsPersonality
 *   60   — 性格在 SUBCOMPATIBLE 列表中（次匹配）
 *   0    — 既未显式打标也无次匹配
 *
 * aloof 在 PRD §4.3.3 游戏库已显式打标，SUBCOMPATIBLE.aloof = []
 * 这里同步守住此约束，防止有人误把 aloof 加回去导致重复计分。
 */

import { describe, it, expect } from 'vitest'
import { personalityScore } from '../../../../agent/recommend/scoring/personality'
import { fakeGame } from '../../../fixtures/play'

describe('personalityScore', () => {
  describe('显式命中 → 100', () => {
    it('active 命中 fitsPersonality=[active]', () => {
      const game = fakeGame({ fitsPersonality: ['active'], category: 'hunting' })
      expect(personalityScore(game, 'active')).toBe(100)
    })

    it('aloof 命中 fitsPersonality=[active, aloof]（多匹配场景）', () => {
      const game = fakeGame({ fitsPersonality: ['active', 'aloof'], category: 'hunting' })
      expect(personalityScore(game, 'aloof')).toBe(100)
    })

    it('clingy 命中 interaction 类显式打标', () => {
      const game = fakeGame({ fitsPersonality: ['clingy'], category: 'interaction' })
      expect(personalityScore(game, 'clingy')).toBe(100)
    })
  })

  describe('次匹配 → 60', () => {
    it('active 未显式打标但 category=hunting 落在 SUBCOMPATIBLE.active', () => {
      const game = fakeGame({ fitsPersonality: ['curious'], category: 'hunting' })
      expect(personalityScore(game, 'active')).toBe(60)
    })

    it('curious 未显式打标但 category=climbing 落在 SUBCOMPATIBLE.curious', () => {
      const game = fakeGame({ fitsPersonality: ['active'], category: 'climbing' })
      expect(personalityScore(game, 'curious')).toBe(60)
    })

    it('clingy 未显式打标但 category=interaction', () => {
      const game = fakeGame({ fitsPersonality: ['active'], category: 'interaction' })
      expect(personalityScore(game, 'clingy')).toBe(60)
    })
  })

  describe('完全不匹配 → 0', () => {
    it('clingy 对 hunting 类无匹配（clingy 的 SUBCOMPATIBLE 不含 hunting）', () => {
      const game = fakeGame({ fitsPersonality: ['active'], category: 'hunting' })
      expect(personalityScore(game, 'clingy')).toBe(0)
    })

    it('aloof 对未显式打标的 puzzle 类返回 0（SUBCOMPATIBLE.aloof 必须为空）', () => {
      // 防回归：若 SUBCOMPATIBLE.aloof 被错误地填入 ['solo','hunting'] 等，
      // 此用例会失败——因为 aloof 应当只走显式打标路径。
      const game = fakeGame({ fitsPersonality: ['curious'], category: 'puzzle' })
      expect(personalityScore(game, 'aloof')).toBe(0)
    })

    it('aloof 对未显式打标的 hunting 类返回 0（同上回归守护）', () => {
      const game = fakeGame({ fitsPersonality: ['active'], category: 'hunting' })
      expect(personalityScore(game, 'aloof')).toBe(0)
    })
  })
})
