import { z } from 'zod'

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ChatMessage {
  role: MessageRole
  content: string
}

export interface AgentContext {
  userId: string
  sessionId: string
  selectedCatId?: string
  traceId: string
  logger: Console
  signal?: AbortSignal           // 客户端断开时取消
  cache: Map<string, any>        // 请求级缓存，避免重复查询
  confirmationToken?: {          // V2.0 写入工具确认令牌
    verified: boolean
    confirmedAt: Date
    confirmationId: string
  }
}

export interface IntentResult {
  intent: IntentType
  confidence: number              // 0-1
}

export interface PlanStep {
  toolName: string
  reason: string
  parameters: Record<string, any>
  requiresConfirmation?: boolean  // V2.0 写入工具标记
}

export interface ToolResult {
  toolName: string
  success: boolean
  output?: any
  error?: string
  reason?: string
  requiresConfirmation?: boolean          // V2.0 需要用户确认
  draft?: Record<string, unknown>         // V2.0 待确认的草稿数据
}

export interface AgentState {
  userId: string
  sessionId: string
  userMessage: string
  selectedCatId?: string
  history: ChatMessage[]
  attachments?: string[]
  plan: PlanStep[]
  toolResults: ToolResult[]
  finalAnswer?: string
  traceId: string
}

export interface Tool<Input = any, Output = any> {
  name: string
  description: string
  schema: z.ZodType<Input>
  permissions: ('read' | 'write')[]
  call: (input: Input, ctx: AgentContext) => Promise<Output>
}

export type IntentType =
  | 'greeting'
  | 'cat_info_query'
  | 'health_consultation'
  | 'allergy_query'
  | 'allergy_record'
  | 'health_report_request'
  | 'play_recommendation'
  | 'growth_record'
  | 'growth_query'
  | 'vaccine_record'
  | 'weight_record'
  | 'general_knowledge'
  | 'mixed'
  | 'unknown'

export interface AgentResponse {
  answer: string
  toolResults: ToolResult[]
  traceId: string
  confidence: number
}
