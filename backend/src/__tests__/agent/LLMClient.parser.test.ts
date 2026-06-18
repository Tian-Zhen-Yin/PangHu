import { describe, it, expect } from 'vitest'
import { parseSseLine } from '../../agent/llm/zhipuaiClient'

describe('zhipuaiClient.parseSseLine', () => {
  it('returns content event for text delta', () => {
    const line = 'data: {"choices":[{"delta":{"content":"你好"},"index":0}]}'
    const events = parseSseLine(line)
    expect(events).toEqual([{ type: 'content', delta: '你好' }])
  })

  it('returns tool_call_start for first tool_call delta with name', () => {
    const line = 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"get_cat_info","arguments":""}}]}}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'tool_call_start', id: 'call_1', name: 'get_cat_info' })
  })

  it('accumulates argument deltas', () => {
    const line = 'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"arguments":"{\\"catName\\""}}]}}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'tool_call_args', id: 'call_1', argsDelta: '{"catName"' })
  })

  it('returns finish event with stop reason', () => {
    const line = 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'finish', reason: 'stop' })
  })

  it('returns finish event with tool_calls reason', () => {
    const line = 'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}'
    const events = parseSseLine(line)
    expect(events).toContainEqual({ type: 'finish', reason: 'tool_calls' })
  })

  it('returns empty array for [DONE] line', () => {
    const events = parseSseLine('data: [DONE]')
    expect(events).toEqual([])
  })

  it('returns empty array for non-data line', () => {
    expect(parseSseLine(': comment')).toEqual([])
    expect(parseSseLine('')).toEqual([])
  })
})
