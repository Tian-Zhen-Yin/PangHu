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

export interface AgentLoopRunInput {
  userMessage: string
  history: ChatMessage[]
  ctx: AgentContext
  onContent: (text: string) => void
  onToolResult: (result: ToolResult) => void
}

export interface AgentLoopResult {
  content: string
  toolNames: string[]
  toolResults: ToolResult[]
  iterations: number
  maxIterationsExceeded: boolean
  aborted: boolean
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
    const { userMessage, history, ctx, onContent, onToolResult } = input

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
