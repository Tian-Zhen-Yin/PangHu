import { Response } from 'express'

/**
 * SSE事件类型
 */
export interface SSEEvent {
  event?: string
  data: string
  id?: string
  retry?: number
}

/**
 * 创建SSE响应流
 * 用于向客户端推送AI回复的流式数据
 */
export class SSEStream {
  private res: Response
  private isClosed = false

  constructor(res: Response) {
    this.res = res

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // 禁用Nginx缓冲

    // 发送初始连接成功消息
    this.send({ event: 'connected', data: 'SSE connected' })
  }

  /**
   * 发送SSE事件
   */
  send(event: SSEEvent): void {
    if (this.isClosed) return

    let output = ''

    if (event.event) {
      output += `event: ${event.event}\n`
    }

    if (event.id) {
      output += `id: ${event.id}\n`
    }

    if (event.retry) {
      output += `retry: ${event.retry}\n`
    }

    // data字段可能包含多行，需要每行前加 "data: "
    const lines = event.data.split('\n')
    for (const line of lines) {
      output += `data: ${line}\n`
    }

    output += '\n'

    this.res.write(output)
  }

  /**
   * 发送聊天消息片段
   */
  sendChunk(content: string, isFirst = false): void {
    this.send({
      event: isFirst ? 'message_start' : 'message_chunk',
      data: JSON.stringify({ content })
    })
  }

  /**
   * 发送完成事件
   */
  sendDone(metadata?: { tokensUsed?: number; model?: string; referencedGuides?: string[]; latency?: number }): void {
    this.send({
      event: 'message_done',
      data: JSON.stringify(metadata || {})
    })
  }

  /**
   * 发送错误事件
   */
  sendError(error: string): void {
    this.send({
      event: 'error',
      data: JSON.stringify({ error })
    })
  }

  /**
   * 关闭流
   */
  close(): void {
    if (this.isClosed) return

    this.isClosed = true
    this.res.end()
  }

  /**
   * 检查流是否已关闭
   */
  get closed(): boolean {
    return this.isClosed
  }
}

/**
 * 检查请求是否为SSE请求
 */
export function isSSERequest(acceptHeader: string | undefined): boolean {
  return acceptHeader?.includes('text/event-stream') || false
}
