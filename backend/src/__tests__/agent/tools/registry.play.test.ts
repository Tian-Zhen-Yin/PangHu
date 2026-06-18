/**
 * toolRegistry 注册测试 — 确保陪玩两个工具被加入注册表
 *
 * 这是最简单的"接线"检查：未注册的 Tool 永远不会被 LLM 调用。
 */

import { describe, it, expect } from 'vitest'
import { tools, getTool, listTools } from '../../../agent/tools/index'

describe('toolRegistry — 陪玩功能注册', () => {
  it('RECOMMEND_play 已注册（只读）', () => {
    const t = getTool('RECOMMEND_play')
    expect(t).toBeDefined()
    expect(t!.permissions).toEqual(['read'])
  })

  it('SUBMIT_play_feedback 已注册（写入，需确认）', () => {
    const t = getTool('SUBMIT_play_feedback')
    expect(t).toBeDefined()
    expect(t!.permissions).toContain('write')
  })

  it('listTools 返回包含两个陪玩工具', () => {
    const names = listTools().map(t => t.name)
    expect(names).toContain('RECOMMEND_play')
    expect(names).toContain('SUBMIT_play_feedback')
  })

  it('tools 数组无重名（注册表唯一性）', () => {
    const names = tools.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
