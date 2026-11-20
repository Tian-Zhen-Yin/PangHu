// backend/src/__tests__/utils/stream.test.ts
// 单元测试：SSEStream 构造函数的 headersSent 守卫
// 背景：Agent 流式链路降级复用 SSEStream 时，controller 已写响应头，
// 构造函数再 setHeader 会抛 ERR_HTTP_HEADERS_SENT（走查 F3 实测：
// SSE 流中出现「Cannot set headers after they are sent to the client」）。

import { describe, it, expect, vi } from 'vitest'
import { SSEStream } from '../../utils/stream'

interface MockRes {
  headersSent: boolean
  written: string[]
  setHeader: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
}

function makeMockRes(headersSent = false): MockRes {
  const res: MockRes = {
    headersSent,
    written: [],
    setHeader: vi.fn(),
    write: vi.fn((chunk: string) => { res.written.push(chunk); return true })
  }
  return res
}

describe('SSEStream 构造函数', () => {
  it('响应头未发送时：正常设置 SSE 响应头并发送 connected 事件', () => {
    const res = makeMockRes(false)
    new SSEStream(res as never)

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
    expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no')
    expect(res.written.join('')).toContain('event: connected')
  })

  it('响应头已发送时：跳过 setHeader 且不抛 ERR_HTTP_HEADERS_SENT', () => {
    const res = makeMockRes(true)

    expect(() => new SSEStream(res as never)).not.toThrow()
    expect(res.setHeader).not.toHaveBeenCalled()
    // connected 事件仍应写出，客户端依赖它确认链路建立
    expect(res.written.join('')).toContain('event: connected')
  })
})

describe('SSEStream.sendError', () => {
  it('错误事件携带 error 字段（前端按 data.error 消费）', () => {
    const res = makeMockRes(false)
    const stream = new SSEStream(res as never)
    stream.sendError('AI 服务暂时不可用')

    const output = res.written.join('')
    expect(output).toContain('event: error')
    expect(output).toContain('"error":"AI 服务暂时不可用"')
  })
})
