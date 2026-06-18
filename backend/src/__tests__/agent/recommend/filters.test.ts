/**
 * filters / expandContraindications 单元测试
 * 对齐技术设计 §4.4 单一数据源原则
 *
 * 关键约束（v2.0.1 修订）：
 *   - 运行时只读 game.contraindications 一个字段
 *   - ENERGY_BAN / kitten 显式禁忌等批量规则只在 seed 阶段展开
 *   - 任何"运行时再次叠加规则"的退化都属于回归
 */

import { describe, it, expect } from 'vitest'
import { applyHealthFilter } from '../../../agent/recommend/filters'
import { expandContraindications } from '../../../data/playGames.seed'
import { fakeGame, fakeGameLibrary } from '../../fixtures/play'

describe('applyHealthFilter', () => {
  it('healthTags 为空 → 不过滤，原样返回', () => {
    const games = fakeGameLibrary()
    expect(applyHealthFilter(games, [])).toEqual(games)
  })

  it('healthTags 未传 → 等价于空数组', () => {
    const games = fakeGameLibrary()
    expect(applyHealthFilter(games)).toEqual(games)
  })

  it('senior 猫 → 过滤所有 contraindications 含 senior 的游戏', () => {
    const games = [
      fakeGame({ id: 'a', contraindications: ['senior'] }),
      fakeGame({ id: 'b', contraindications: [] }),
      fakeGame({ id: 'c', contraindications: ['post_op'] }),
      fakeGame({ id: 'd', contraindications: ['senior', 'kitten'] }),
    ]
    const result = applyHealthFilter(games, ['senior'])
    expect(result.map(g => g.id)).toEqual(['b', 'c'])
  })

  it('多个标签按 OR 关系过滤（任一命中即排除）', () => {
    const games = [
      fakeGame({ id: 'a', contraindications: ['senior'] }),
      fakeGame({ id: 'b', contraindications: ['post_op'] }),
      fakeGame({ id: 'c', contraindications: [] }),
      fakeGame({ id: 'd', contraindications: ['kitten'] }),
    ]
    const result = applyHealthFilter(games, ['senior', 'post_op'])
    expect(result.map(g => g.id)).toEqual(['c', 'd'])
  })

  it('全部被禁 → 返回空数组（触发 L2 降级的前提）', () => {
    const games = [
      fakeGame({ id: 'a', contraindications: ['senior'] }),
      fakeGame({ id: 'b', contraindications: ['senior'] }),
    ]
    expect(applyHealthFilter(games, ['senior'])).toEqual([])
  })

  it('overweight 不进过滤层（v2.0 §4.4 约定）', () => {
    // overweight 是"鼓励运动"语义，不应作硬过滤。
    // 即便游戏 contraindications 不含 overweight，传入也应等价于无过滤。
    const games = fakeGameLibrary()
    expect(applyHealthFilter(games, ['overweight'])).toEqual(games)
  })
})

describe('expandContraindications (seed-time)', () => {
  it('energyCost ≥ 4 → 自动加 senior', () => {
    const games = [fakeGame({ id: 'a', energyCost: 4, contraindications: [] })]
    const expanded = expandContraindications(games)
    expect(expanded[0].contraindications).toContain('senior')
  })

  it('energyCost ≥ 3 → 自动加 post_op', () => {
    const games = [fakeGame({ id: 'a', energyCost: 3, contraindications: [] })]
    const expanded = expandContraindications(games)
    expect(expanded[0].contraindications).toContain('post_op')
  })

  it('energyCost = 5 → 同时加 senior + post_op', () => {
    const games = [fakeGame({ id: 'a', energyCost: 5, contraindications: [] })]
    const expanded = expandContraindications(games)
    expect(expanded[0].contraindications).toEqual(
      expect.arrayContaining(['senior', 'post_op']),
    )
  })

  it('energyCost ≤ 2 → 不自动追加 ENERGY_BAN 规则', () => {
    const games = [fakeGame({ id: 'a', energyCost: 2, contraindications: [] })]
    const expanded = expandContraindications(games)
    expect(expanded[0].contraindications).not.toContain('senior')
    expect(expanded[0].contraindications).not.toContain('post_op')
  })

  it('已有显式 contraindications 不被覆盖（去重 union）', () => {
    const games = [
      fakeGame({ id: 'a', energyCost: 4, contraindications: ['kitten'] }),
    ]
    const expanded = expandContraindications(games)
    expect(expanded[0].contraindications).toEqual(
      expect.arrayContaining(['kitten', 'senior']),
    )
    // 去重：senior 不应重复
    const seniorCount = expanded[0].contraindications.filter(t => t === 'senior').length
    expect(seniorCount).toBe(1)
  })

  it('幂等：多次展开结果稳定（防回归）', () => {
    const games = [fakeGame({ id: 'a', energyCost: 4, contraindications: [] })]
    const once = expandContraindications(games)
    const twice = expandContraindications(once)
    expect(twice[0].contraindications.sort()).toEqual(once[0].contraindications.sort())
  })
})
