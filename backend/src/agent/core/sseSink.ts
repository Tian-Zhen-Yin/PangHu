/**
 * SSE 事件汇 —— CatAgent 与 HTTP 层之间的窄接口。
 *
 * CatAgent 只依赖 AgentSseSink 接口:不再 import express、不持有 Response、
 * 也不再 monkey-patch res.write(旧实现为捕获回复文本曾临时替换 res.write)。
 * express 适配集中在本文件的 createExpressSseSink。
 */
import type { Response } from 'express'

export interface AgentSseSink {
  /** 推送一个类型化 SSE 事件: data: {"type":...,...data} */
  writeEvent(type: string, data: Record<string, unknown>): void
  /** 结束流(幂等安全:流已关闭时为 no-op) */
  end(): void
  /** 流已不可写(客户端断开或已结束) */
  readonly closed: boolean
  /** 注册客户端断开回调(可多次注册) */
  onClose(cb: () => void): void
  /**
   * 迁移期逃生舱:遗留的直写流式组件(当前仅 ai.service sendMessageStream 的
   * 降级路径)仍直接向 Response 写 SSE。经本方法执行时,其 content 输出会被
   * 捕获计入 getContent();fn 收到的 carrier 对调用方是不透明对象。
   */
  runCaptured(fn: (carrier: unknown) => Promise<void>): Promise<void>
  /** 累积的全部 content 文本(含 writeEvent 与 runCaptured 捕获的),供持久化 */
  getContent(): string
}

/**
 * 从 SSE 写入字节流中提取文本内容。
 * 兼容两种格式：
 *   - Agent 自有格式：`data: {"type":"content","text":"..."}`
 *   - SSEStream 工具格式：`data: {"content":"..."}` （由 ai.service sendMessageStream 产出）
 */
export function extractContentFromSseChunk(chunk: string): string[] {
  const parts: string[] = []
  for (const line of chunk.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice(6)
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) continue
      if (parsed.type === 'content' && typeof parsed.text === 'string') {
        parts.push(parsed.text)
      } else if (typeof parsed.content === 'string') {
        parts.push(parsed.content)
      }
    } catch {
      // 非 JSON 行（如 SSE 注释）忽略
    }
  }
  return parts
}

/**
 * express Response → AgentSseSink 适配器。controller 在设置完 SSE 响应头后调用。
 */
export function createExpressSseSink(res: Response): AgentSseSink {
  const captured: string[] = []
  const push = (chunk: unknown) => {
    if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) return
    const text = typeof chunk === 'string' ? chunk : chunk.toString('utf-8')
    captured.push(...extractContentFromSseChunk(text))
  }

  const sink: AgentSseSink = {
    writeEvent(type, data) {
      if (res.destroyed || !res.writable) return
      try {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`)
      } catch {
        // SSE 写入失败忽略
      }
    },
    end() {
      if (res.writableEnded) return
      try { res.end() } catch { /* ignore */ }
    },
    get closed() {
      return res.destroyed || !res.writable || res.writableEnded
    },
    onClose(cb) {
      res.on('close', cb)
    },
    async runCaptured(fn) {
      // 原型链委托 shim:write/end 被拦截(捕获 content),其余成员透传真 res,
      // 让遗留直写组件(SSEStream 会调 setHeader 等)无感工作。
      const carrier = Object.create(res) as Response
      ;(carrier as any).write = (chunk: unknown, ...args: unknown[]) => {
        push(chunk)
        return (res.write as any)(chunk, ...args)
      }
      ;(carrier as any).end = (...args: unknown[]) => (res.end as any)(...args)
      await fn(carrier)
    },
    getContent() {
      return captured.join('')
    },
  }
  return sink
}
