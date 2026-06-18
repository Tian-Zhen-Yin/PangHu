/**
 * timeScore 单元测试 — 对齐技术设计 §4.3.3
 *
 * 三段梯形函数（ratio = game.durationMin / availableTime）：
 *   ratio ≤ 1.0   → 60 + 40 * ratio        (短游戏轻惩，避免推太短)
 *   1.0 < r ≤ 1.5 → 100 - 100 * (r - 1.0)  (略超时间，线性下降到 50)
 *   ratio > 1.5   → 0                       (超时间过多，淘汰)
 *
 * | ratio | 0.5 | 0.8 | 1.0 | 1.2 | 1.5 | >1.5 |
 * | sc    | 80  | 92  | 100 | 80  | 50  | 0    |
 */

import { describe, it, expect } from 'vitest'
import { timeScore } from '../../../../agent/recommend/scoring/time'
import { fakeGame } from '../../../fixtures/play'

describe('timeScore', () => {
  describe('段一：ratio ≤ 1.0', () => {
    it('ratio=0.5（5分钟游戏 / 10分钟可用）→ 80', () => {
      expect(timeScore(fakeGame({ durationMin: 5 }), 10)).toBe(80)
    })

    it('ratio=0.8（8分钟 / 10分钟）→ 92', () => {
      expect(timeScore(fakeGame({ durationMin: 8 }), 10)).toBe(92)
    })

    it('ratio=1.0（10分钟 / 10分钟）→ 100（最佳匹配）', () => {
      expect(timeScore(fakeGame({ durationMin: 10 }), 10)).toBe(100)
    })
  })

  describe('段二：1.0 < ratio ≤ 1.5', () => {
    it('ratio=1.2（12分钟 / 10分钟）→ 80', () => {
      expect(timeScore(fakeGame({ durationMin: 12 }), 10)).toBe(80)
    })

    it('ratio=1.5（15分钟 / 10分钟）→ 50（边界）', () => {
      expect(timeScore(fakeGame({ durationMin: 15 }), 10)).toBe(50)
    })
  })

  describe('段三：ratio > 1.5', () => {
    it('ratio=2.0（20分钟 / 10分钟）→ 0', () => {
      expect(timeScore(fakeGame({ durationMin: 20 }), 10)).toBe(0)
    })

    it('极端 ratio=10（100分钟 / 10分钟）→ 0', () => {
      expect(timeScore(fakeGame({ durationMin: 100 }), 10)).toBe(0)
    })
  })

  describe('边界与异常入参', () => {
    it('availableTime = 0 → 0（避免除零）', () => {
      expect(timeScore(fakeGame({ durationMin: 10 }), 0)).toBe(0)
    })

    it('availableTime 为负数 → 0', () => {
      expect(timeScore(fakeGame({ durationMin: 10 }), -5)).toBe(0)
    })
  })
})
