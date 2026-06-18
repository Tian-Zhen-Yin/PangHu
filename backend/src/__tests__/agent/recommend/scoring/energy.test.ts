/**
 * energyScore 单元测试 — 对齐技术设计 §4.3.2
 *
 * 公式：score = max(0, 100 - |currentEnergy - game.energyCost| * 25)
 *
 * | diff | 0   | 1  | 2  | 3  | 4 |
 * | ---- | --- | -- | -- | -- | - |
 * | sc   | 100 | 75 | 50 | 25 | 0 |
 */

import { describe, it, expect } from 'vitest'
import { energyScore } from '../../../../agent/recommend/scoring/energy'
import { fakeGame } from '../../../fixtures/play'

describe('energyScore', () => {
  it.each([
    { current: 3, energyCost: 3, expected: 100 }, // diff=0
    { current: 3, energyCost: 4, expected: 75 },  // diff=1
    { current: 3, energyCost: 2, expected: 75 },  // diff=1（绝对值）
    { current: 1, energyCost: 3, expected: 50 },  // diff=2
    { current: 5, energyCost: 2, expected: 25 },  // diff=3
    { current: 1, energyCost: 5, expected: 0 },   // diff=4
  ])(
    'currentEnergy=$current, energyCost=$energyCost → $expected',
    ({ current, energyCost, expected }) => {
      const game = fakeGame({ energyCost: energyCost as 1 | 2 | 3 | 4 | 5 })
      expect(energyScore(game, current)).toBe(expected)
    },
  )

  it('diff > 4 时不会出现负数（数学边界保护）', () => {
    // 当前 energyCost 上限为 5、currentEnergy 范围 1-5，理论 diff ≤ 4。
    // 但若上游传入越界值（例如 currentEnergy=10），分数应被 clamp 到 0 而不是 -25。
    const game = fakeGame({ energyCost: 1 })
    expect(energyScore(game, 10)).toBe(0)
  })
})
