// frontend/src/__tests__/stores/chat.test.ts
// 单元测试：AI 消息最终文本 resolveFinalContent
// 背景：SSE 链路 error 事件先写入「⚠️ …」后，done 事件会用空的流式内容把它覆盖，
// 导致用户看到空气泡（走查 F3 实测复现）。

import { describe, it, expect } from 'vitest'
import { resolveFinalContent } from '../../stores/chat'

describe('resolveFinalContent', () => {
  it('正常流式路径：流式内容非空时采用流式内容', () => {
    expect(resolveFinalContent('今天的建议是……', '', false)).toBe('今天的建议是……')
  })

  it('错误提示保留：流式为空但已有内容（error 写入的 ⚠️）时不被空流覆盖', () => {
    expect(resolveFinalContent('', '⚠️ AI 服务暂时不可用', false)).toBe('⚠️ AI 服务暂时不可用')
  })

  it('流式内容优先于已有内容（部分流式后出错再 done 的场景取流式结果）', () => {
    expect(resolveFinalContent('流式到一半', '⚠️ 中途错误', false)).toBe('流式到一半')
  })

  it('纯工具卡片回复：两者皆空但有工具卡片时保持空（卡片即内容）', () => {
    expect(resolveFinalContent('', '', true)).toBe('')
  })

  it('空气泡兜底：两者皆空且无卡片时返回可读提示而非空白', () => {
    const result = resolveFinalContent('   ', '', false)
    expect(result.trim().length).toBeGreaterThan(0)
    expect(result).toContain('喵喵')
  })

  it('空白字符视为空：existingText 只有空白时不视为有效内容', () => {
    const result = resolveFinalContent('', '   \n  ', false)
    expect(result).toContain('喵喵')
  })
})
