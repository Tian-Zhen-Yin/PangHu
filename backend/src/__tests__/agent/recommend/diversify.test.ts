/**
 * diversify 单元测试 — 对齐技术设计 §4.5
 *
 * 行为：
 *   1. 输入按 score 降序遍历（调用方保证）
 *   2. 同 category 累计达到 maxPerCategory 后跳过
 *   3. 总数到 top 立即停止
 *   4. 不修改原数组、不重新排序
 */

import { describe, it, expect } from 'vitest'
import { diversify } from '../../../agent/recommend/diversify'
import { fakeGame } from '../../fixtures/play'

interface SimpleScored {
  game: ReturnType<typeof fakeGame>
  score: number
}

function makeScored(items: Array<{ id: string; cat: any; score: number }>): SimpleScored[] {
  return items.map(it => ({
    game: fakeGame({ id: it.id, category: it.cat }),
    score: it.score,
  }))
}

describe('diversify', () => {
  it('同类别 ≤ maxPerCategory，超出的被跳过', () => {
    const scored = makeScored([
      { id: 'a', cat: 'chase', score: 100 },
      { id: 'b', cat: 'chase', score: 90 },
      { id: 'c', cat: 'chase', score: 80 },  // 第 3 个 chase，应被跳过
      { id: 'd', cat: 'puzzle', score: 70 },
    ])
    const result = diversify(scored, { maxPerCategory: 2, top: 5 })
    expect(result.map(r => r.game.id)).toEqual(['a', 'b', 'd'])
  })

  it('top 截断生效', () => {
    const scored = makeScored([
      { id: 'a', cat: 'chase', score: 100 },
      { id: 'b', cat: 'puzzle', score: 90 },
      { id: 'c', cat: 'hunting', score: 80 },
      { id: 'd', cat: 'climbing', score: 70 },
      { id: 'e', cat: 'interaction', score: 60 },
      { id: 'f', cat: 'solo', score: 50 },  // 超过 top=5，应被丢弃
    ])
    const result = diversify(scored, { maxPerCategory: 2, top: 5 })
    expect(result).toHaveLength(5)
    expect(result.map(r => r.game.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('保持入参顺序（不重新排序）', () => {
    const scored = makeScored([
      { id: 'lower', cat: 'chase', score: 50 },
      { id: 'higher', cat: 'puzzle', score: 100 },
    ])
    const result = diversify(scored, { maxPerCategory: 2, top: 5 })
    // diversify 不负责排序——保持调用方传入顺序
    expect(result.map(r => r.game.id)).toEqual(['lower', 'higher'])
  })

  it('入参为空 → 返回空数组', () => {
    expect(diversify([], { maxPerCategory: 2, top: 5 })).toEqual([])
  })

  it('maxPerCategory=3（soft-fallback 步骤 1 用）', () => {
    const scored = makeScored([
      { id: 'a', cat: 'chase', score: 100 },
      { id: 'b', cat: 'chase', score: 90 },
      { id: 'c', cat: 'chase', score: 80 },
      { id: 'd', cat: 'chase', score: 70 },  // 第 4 个被跳过
      { id: 'e', cat: 'puzzle', score: 60 },
    ])
    const result = diversify(scored, { maxPerCategory: 3, top: 5 })
    expect(result.map(r => r.game.id)).toEqual(['a', 'b', 'c', 'e'])
  })

  it('不修改原数组', () => {
    const scored = makeScored([
      { id: 'a', cat: 'chase', score: 100 },
      { id: 'b', cat: 'chase', score: 90 },
      { id: 'c', cat: 'chase', score: 80 },
    ])
    const snapshot = scored.map(s => s.game.id)
    diversify(scored, { maxPerCategory: 2, top: 5 })
    expect(scored.map(s => s.game.id)).toEqual(snapshot)
  })
})
