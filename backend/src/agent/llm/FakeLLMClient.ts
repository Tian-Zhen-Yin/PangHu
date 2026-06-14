import type { LLMClient, LLMStreamEvent, ToolDefinition } from './LLMClient'
import type { ChatMessage } from '../types/agent'

/**
 * 测试用 LLM 客户端。
 *
 * 用法:
 *   const fake = new FakeLLMClient([
 *     [{ type: 'content', delta: '...' }, { type: 'finish', reason: 'stop' }],
 *     [{ type: 'tool_call_start', id: 'c1', name: 'get_cat_info' }, ...],
 *   ])
 *
 * 每次 chatStream 调用消费 scripts 数组的下一条脚本。
 */
export class FakeLLMClient implements LLMClient {
  private callIndex = 0
  public capturedCalls: Array<{ messages: ChatMessage[]; tools?: ToolDefinition[] }> = []

  constructor(private scripts: LLMStreamEvent[][]) {}

  async *chatStream(opts: {
    messages: ChatMessage[]
    tools?: ToolDefinition[]
    signal?: AbortSignal
  }): AsyncIterable<LLMStreamEvent> {
    this.capturedCalls.push({ messages: opts.messages, tools: opts.tools })
    const script = this.scripts[this.callIndex++] ?? [{ type: 'finish', reason: 'stop' }]
    for (const ev of script) {
      if (opts.signal?.aborted) {
        yield { type: 'finish', reason: 'error', error: 'aborted' }
        return
      }
      yield ev
    }
  }

  reset() {
    this.callIndex = 0
    this.capturedCalls = []
  }
}
