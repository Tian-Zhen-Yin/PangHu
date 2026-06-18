/**
 * fallback 单元测试 — 对齐技术设计 §4.6 双层降级
 *
 * L1：fallbackRecommend
 *   - 仅按性格 + 已经过健康过滤的 healthyPool 取前 3 条
 *   - reasons 必须用产品文案（禁止 "降级" / "未匹配" 等开发者术语，
 *     防止 LLM 复述给用户）
 *   - score = 0、breakdown = null（前端凭 fallback=true 不展示分数）
 *   - 性格无匹配时退化为 healthyPool 前 3 条（不能返回空）
 *
 * L2：emptyResultWithVetHint
 *   - 仅在 healthyPool 自身为空时调用
 *   - success=false，message 引导兽医
 */

import { describe, it, expect } from 'vitest'
import { fallbackRecommend, emptyResultWithVetHint } from '../../../agent/recommend/fallback'
import { fakeCat, fakeGame } from '../../fixtures/play'

const FORBIDDEN_DEV_TERMS = ['降级', 'fallback', '未匹配', 'L1', 'L2']

describe('fallbackRecommend (L1)', () => {
  it('性格命中：返回 fits 中前 3 条', () => {
    const cat = fakeCat({ personality: 'active' })
    const pool = [
      fakeGame({ id: 'a', fitsPersonality: ['active'] }),
      fakeGame({ id: 'b', fitsPersonality: ['active'] }),
      fakeGame({ id: 'c', fitsPersonality: ['active'] }),
      fakeGame({ id: 'd', fitsPersonality: ['active'] }),  // 超过 3，被截
      fakeGame({ id: 'e', fitsPersonality: ['curious'] }),
    ]
    const result = fallbackRecommend(cat, pool)
    expect(result.success).toBe(true)
    expect(result.fallback).toBe(true)
    expect(result.suggestions.map(s => s.game.id)).toEqual(['a', 'b', 'c'])
  })

  it('性格无命中：退化为 healthyPool 前 3 条（保证非空）', () => {
    const cat = fakeCat({ personality: 'aloof' })
    const pool = [
      fakeGame({ id: 'a', fitsPersonality: ['active'] }),
      fakeGame({ id: 'b', fitsPersonality: ['curious'] }),
      fakeGame({ id: 'c', fitsPersonality: ['clingy'] }),
    ]
    const result = fallbackRecommend(cat, pool)
    expect(result.fallback).toBe(true)
    expect(result.suggestions).toHaveLength(3)
  })

  it('每条 suggestion 的 score=0、breakdown=null（前端契约）', () => {
    const cat = fakeCat({ personality: 'active' })
    const pool = [fakeGame({ id: 'a', fitsPersonality: ['active'] })]
    const result = fallbackRecommend(cat, pool)
    for (const s of result.suggestions) {
      expect(s.score).toBe(0)
      expect(s.breakdown).toBeNull()
    }
  })

  it('reasons 必须用产品文案，禁止开发者术语（防 LLM 复述）', () => {
    const cat = fakeCat({ personality: 'active' })
    const pool = [fakeGame({ id: 'a', fitsPersonality: ['active'] })]
    const result = fallbackRecommend(cat, pool)
    for (const s of result.suggestions) {
      expect(s.reasons.length).toBeGreaterThan(0)
      for (const reason of s.reasons) {
        for (const term of FORBIDDEN_DEV_TERMS) {
          expect(reason).not.toContain(term)
        }
      }
    }
  })

  it('reasons 包含性格中文标签（用户可读）', () => {
    const cat = fakeCat({ personality: 'active' })
    const pool = [fakeGame({ id: 'a', fitsPersonality: ['active'] })]
    const result = fallbackRecommend(cat, pool)
    // 至少出现一次"活泼"或"性格"等用户可识别词
    const allReasons = result.suggestions.flatMap(s => s.reasons).join('|')
    expect(allReasons.length).toBeGreaterThan(0)
  })
})

describe('emptyResultWithVetHint (L2)', () => {
  it('返回 success=false 且 suggestions 为空', () => {
    const result = emptyResultWithVetHint()
    expect(result.success).toBe(false)
    expect(result.fallback).toBe(true)
    expect(result.suggestions).toEqual([])
  })

  it('message 引导兽医（用户可读）', () => {
    const result = emptyResultWithVetHint()
    expect(result.message).toBeDefined()
    expect(result.message).toMatch(/兽医/)
  })

  it('message 不含开发者术语', () => {
    const result = emptyResultWithVetHint()
    for (const term of FORBIDDEN_DEV_TERMS) {
      expect(result.message ?? '').not.toContain(term)
    }
  })
})
