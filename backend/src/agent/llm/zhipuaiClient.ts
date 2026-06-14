import axios from 'axios'
import https from 'https'
import { generateToken } from '../../services/ai.service'
import type { LLMClient, LLMStreamEvent, ToolDefinition } from './LLMClient'
import type { ChatMessage } from '../types/agent'

const httpsAgent = new https.Agent({ rejectUnauthorized: false })
const DEFAULT_MODEL = process.env.ZHIPUAI_MODEL || 'glm-4-flash'

/**
 * 解析单行 SSE 数据,返回 0..N 个 LLMStreamEvent。
 * 暴露此函数主要用于单测。
 */
export function parseSseLine(line: string): LLMStreamEvent[] {
  if (!line.startsWith('data: ')) return []
  const data = line.slice(6).trim()
  if (data === '[DONE]') return []

  let parsed: any
  try { parsed = JSON.parse(data) } catch { return [] }

  const choice = parsed?.choices?.[0]
  if (!choice) return []

  const events: LLMStreamEvent[] = []
  const delta = choice.delta || {}

  if (typeof delta.content === 'string' && delta.content.length > 0) {
    events.push({ type: 'content', delta: delta.content })
  }

  if (Array.isArray(delta.tool_calls)) {
    for (const tc of delta.tool_calls) {
      const id = tc.id
      const fn = tc.function || {}
      if (id && fn.name) {
        events.push({ type: 'tool_call_start', id, name: fn.name })
      }
      if (typeof fn.arguments === 'string' && fn.arguments.length > 0) {
        // 注:智谱 AI 第一帧会同时给出 id+name+arguments(可能为"")
        // 后续 args delta 帧可能没有 id,只有 index——这种情况用 idx_${index} 兜底
        const callId = id || (tc.index !== undefined ? `idx_${tc.index}` : undefined)
        if (callId) {
          events.push({ type: 'tool_call_args', id: callId, argsDelta: fn.arguments })
        }
      }
    }
  }

  if (choice.finish_reason) {
    const reason = choice.finish_reason
    if (reason === 'stop' || reason === 'tool_calls' || reason === 'length') {
      events.push({ type: 'finish', reason })
    } else {
      events.push({ type: 'finish', reason: 'error', error: reason })
    }
  }

  return events
}

export class ZhipuaiClient implements LLMClient {
  async *chatStream(opts: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    signal?: AbortSignal
    model?: string
  }): AsyncIterable<LLMStreamEvent> {
    const apiKey = process.env.ZHIPUAI_API_KEY || ''
    if (!apiKey) {
      yield { type: 'finish', reason: 'error', error: 'ZHIPUAI_API_KEY not set' }
      return
    }
    const token = generateToken(apiKey)
    const baseUrl = 'https://open.bigmodel.cn/api/paas/v4'
    const model = opts.model || DEFAULT_MODEL

    const body: Record<string, unknown> = {
      model,
      messages: opts.messages,
      temperature: 0.7,
      top_p: 0.9,
      stream: true,
    }
    if (opts.tools && opts.tools.length > 0) {
      body.tools = opts.tools
      body.tool_choice = 'auto'
    }

    let response: any
    try {
      response = await axios.post(`${baseUrl}/chat/completions`, body, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        responseType: 'stream',
        httpsAgent,
        signal: opts.signal as any,
      })
    } catch (error: any) {
      yield { type: 'finish', reason: 'error', error: error.message || 'LLM request failed' }
      return
    }

    const stream = response.data
    let buffer = ''
    const queue: LLMStreamEvent[] = []
    let resolveNext: (() => void) | null = null
    let ended = false
    let errored: string | null = null

    const wakeup = () => {
      if (resolveNext) { resolveNext(); resolveNext = null }
    }

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf-8')
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        for (const ev of parseSseLine(line)) queue.push(ev)
      }
      wakeup()
    })
    stream.on('end', () => { ended = true; wakeup() })
    stream.on('error', (err: Error) => { errored = err.message; ended = true; wakeup() })

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        try { stream.destroy() } catch { /* ignore */ }
        ended = true
        errored = 'aborted'
        wakeup()
      }, { once: true })
    }

    while (true) {
      while (queue.length > 0) {
        const ev = queue.shift()!
        yield ev
      }
      if (ended) break
      await new Promise<void>((resolve) => { resolveNext = resolve })
    }

    if (errored && errored !== 'aborted') {
      yield { type: 'finish', reason: 'error', error: errored }
    }
  }
}

export const zhipuaiClient = new ZhipuaiClient()
