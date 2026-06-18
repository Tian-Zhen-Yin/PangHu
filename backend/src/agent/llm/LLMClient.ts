import type { ChatMessage } from '../types/agent'

/**
 * LLM 工具定义(OpenAI function calling 兼容格式)
 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

/**
 * 单个 tool_call(LLM 决定调用某工具)
 */
export interface ToolCall {
  id: string
  name: string
  arguments: string  // JSON 字符串(可能不完整,在 tool_call_done 时已完整)
}

/**
 * LLM 流式事件
 */
export type LLMStreamEvent =
  | { type: 'content'; delta: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_args'; id: string; argsDelta: string }
  | { type: 'tool_call_done'; id: string }
  | { type: 'finish'; reason: 'stop' | 'tool_calls' | 'length' | 'error'; error?: string }

/**
 * LLM 客户端抽象,屏蔽具体厂商差异(智谱 / OpenAI / ...)
 */
export interface LLMClient {
  chatStream(opts: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    signal?: AbortSignal
    model?: string
  }): AsyncIterable<LLMStreamEvent>
}
