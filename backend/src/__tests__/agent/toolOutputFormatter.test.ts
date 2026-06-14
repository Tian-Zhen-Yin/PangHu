import { describe, it, expect } from 'vitest'
import { formatToolOutput } from '../../agent/core/toolOutputFormatter'

describe('toolOutputFormatter.formatToolOutput', () => {
  it('formats get_cat_info success output', () => {
    const output = {
      success: true,
      cat: {
        id: 'c1',
        name: '小白',
        breed: '英短',
        age: '3岁',
        weight: '4.20 kg',
        gender: '公猫',
        isNeutered: true,
        allergies: null,
        diseases: null,
        lastVaccine: null,
        lastRecordDate: null,
        avatar: null,
      },
      userCats: [{ id: 'c1', name: '小白' }],
    }
    const text = formatToolOutput('get_cat_info', output)
    expect(text).toContain('小白')
    expect(text).toContain('英短')
    expect(text).toContain('3岁')
    expect(text).toContain('4.20')
  })

  it('returns 未找到 message when get_cat_info fails', () => {
    const output = { success: false, message: '您还没有登记任何猫咪档案。' }
    const text = formatToolOutput('get_cat_info', output)
    expect(text).toContain('未找到')
  })

  it('formats empty weight trend', () => {
    const output = { success: true, points: [], trend: 'stable' }
    const text = formatToolOutput('get_weight_trend', output)
    expect(text).toContain('暂无')
  })

  it('falls back to JSON for unknown tool', () => {
    const text = formatToolOutput('mystery_tool', { foo: 'bar' })
    expect(text).toContain('foo')
    expect(text).toContain('bar')
  })

  it('formats error with tool name', () => {
    const text = formatToolOutput('get_cat_info', { error: 'Tool timeout after 5000ms' })
    expect(text).toContain('失败')
    expect(text).toContain('timeout')
  })
})
