import type { LLMClient, ToolCall } from '../llm/LLMClient'
import type { AgentContext, ChatMessage, Tool, ToolResult } from '../types/agent'
import { toolsToDefinitions } from './toolAdapter'
import { formatToolOutput } from './toolOutputFormatter'
import { AGENT_SYSTEM_PROMPT } from '../prompts/systemPrompt'
import { callTool } from './AgentExecutor'

export interface AgentLoopOptions {
  maxIterations?: number
  model?: string
}

export interface PendingConfirmation {
  toolName: string
  parameters: Record<string, unknown>
}

export interface AgentLoopRunInput {
  userMessage: string
  history: ChatMessage[]
  ctx: AgentContext
  onContent: (text: string) => void
  onToolResult: (result: ToolResult) => void
  /** 写工具被 LLM 选中且未确认时回调,返回 true 表示已外部接管(中断 loop) */
  onPendingConfirmation?: (pending: PendingConfirmation) => boolean | void
}

export interface AgentLoopResult {
  content: string
  toolNames: string[]
  toolResults: ToolResult[]
  iterations: number
  maxIterationsExceeded: boolean
  aborted: boolean
  /** 因写工具待确认而中断 */
  pendingConfirmation?: PendingConfirmation
}

interface ChatMessageWithTools extends ChatMessage {
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export class AgentLoop {
  private readonly maxIterations: number
  private readonly model?: string
  private readonly toolMap: Map<string, Tool>

  constructor(
    private readonly llm: LLMClient,
    private readonly tools: Tool[],
    options: AgentLoopOptions = {}
  ) {
    this.maxIterations = options.maxIterations ?? 5
    this.model = options.model
    this.toolMap = new Map(tools.map((tool) => [tool.name, tool]))
  }

  async run(input: AgentLoopRunInput): Promise<AgentLoopResult> {
    const { userMessage, history, ctx, onContent, onToolResult, onPendingConfirmation } = input

    const messages: ChatMessageWithTools[] = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userMessage },
    ]

    const toolDefs = toolsToDefinitions(this.tools)
    const toolNames: string[] = []
    const toolResults: ToolResult[] = []
    const contentParts: string[] = []

    let iteration = 0
    let maxIterationsExceeded = false
    let aborted = false
    let pendingConfirmation: PendingConfirmation | undefined

    while (iteration < this.maxIterations) {
      iteration += 1

      if (ctx.signal?.aborted) { aborted = true; break }

      const pendingCalls = new Map<string, { name: string; args: string }>()
      let finishReason: 'stop' | 'tool_calls' | 'length' | 'error' | null = null
      let llmError: string | undefined

      for await (const ev of this.llm.chatStream({
        messages: messages as ChatMessage[],
        tools: toolDefs,
        signal: ctx.signal,
        model: this.model,
      })) {
        if (ctx.signal?.aborted) { aborted = true; break }

        switch (ev.type) {
          case 'content':
            contentParts.push(ev.delta)
            onContent(ev.delta)
            break
          case 'tool_call_start':
            pendingCalls.set(ev.id, { name: ev.name, args: '' })
            break
          case 'tool_call_args': {
            const cur = pendingCalls.get(ev.id)
            if (cur) cur.args += ev.argsDelta
            break
          }
          case 'tool_call_done':
            break
          case 'finish':
            finishReason = ev.reason
            llmError = ev.error
            break
        }
      }

      if (aborted) break

      if (finishReason === 'error') throw new Error(`LLM error: ${llmError ?? 'unknown'}`)

      if (pendingCalls.size === 0) break

      const callsInOrder = Array.from(pendingCalls.entries())
        .map(([id, v]) => ({ id, name: v.name, args: v.args }))

      // 优先扫描写工具:若 LLM 选了 write 工具且未确认,推送 pending_confirmation 并中断 loop
      const writePending = callsInOrder.find((c) => {
        const t = this.toolMap.get(c.name)
        return t?.permissions?.includes('write') && !ctx.confirmationToken?.verified
      })
      if (writePending) {
        const args = this.parseToolArgs(writePending.args)
        pendingConfirmation = { toolName: writePending.name, parameters: args }
        ctx.logger.log(`[AgentLoop] write tool ${writePending.name} requires confirmation, breaking loop`)
        onPendingConfirmation?.(pendingConfirmation)
        break
      }

      messages.push({
        role: 'assistant',
        content: '',
        tool_calls: callsInOrder.map((c) => ({ id: c.id, name: c.name, arguments: c.args })),
      })

      const execResults = await Promise.all(
        callsInOrder.map(async (c) => {
          const parsedArgs = this.parseToolArgs(c.args)
          const injected = this.toolMap.get(c.name)
          const result = await callTool(c.name, parsedArgs, ctx, 'LLM tool-calling', injected)
          onToolResult(result)
          toolNames.push(c.name)
          toolResults.push(result)
          return { id: c.id, result }
        })
      )

      for (const er of execResults) {
        const text = er.result.success
          ? formatToolOutput(er.result.toolName, er.result.output)
          : `工具 ${er.result.toolName} 失败:${er.result.error ?? '未知错误'}`
        messages.push({
          role: 'tool',
          tool_call_id: er.id,
          name: er.result.toolName,
          content: text,
        } as ChatMessageWithTools)
      }

      if (finishReason !== 'tool_calls') break
    }

    if (iteration >= this.maxIterations && !aborted) maxIterationsExceeded = true

    return {
      content: contentParts.join(''),
      toolNames,
      toolResults,
      iterations: iteration,
      maxIterationsExceeded,
      aborted,
      pendingConfirmation,
    }
  }

  private parseToolArgs(rawArgs: string): Record<string, unknown> {
    try {
      return rawArgs ? JSON.parse(rawArgs) : {}
    } catch {
      return {}
    }
  }
}
