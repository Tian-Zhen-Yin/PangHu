/**
 * 聊天相关类型定义
 */

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 引用的指南来源
 */
export interface Citation {
  guideId: string
  title: string
  similarity: number
}

/**
 * Agent 正在调用的工具信息
 */
export interface ToolCallInfo {
  name: string              // 工具名（英文）
  label?: string            // 中文标签（用于显示，如"猫咪档案"）
  reason?: string           // agent 为什么调用这个工具
  status: 'running' | 'done' | 'error'
  output?: any              // 工具执行返回的原始数据
  startTime?: number        // 开始时间戳
  endTime?: number          // 结束时间戳
  costMs?: number
}

/**
 * 执行轨迹步骤（Agent 管道执行日志，非 LLM 推理）
 */
export interface TraceStep {
  stepId: number
  type: 'intent' | 'plan' | 'execute' | 'report'
  title: string
  content: string
  timestamp: number
  durationMs?: number
  data?: Record<string, unknown>
}

/**
 * 挂起的确认请求（写入工具需要用户确认时产生）
 */
export interface PendingConfirmation {
  confirmationId: string
  toolName: string
  draft: Record<string, unknown>
  message: string
  expiresAt: number
}

/**
 * Agent 消息元信息
 */
export interface AgentMeta {
  traceId: string           // 全链路追踪 ID
  toolsCalled?: string[]    // 工具名列表（简化）
  toolCalls?: ToolCallInfo[] // 详细工具调用信息，含输出
  citations?: string[]      // 知识库引用标题
  confidence?: number       // 置信度
  totalTimeMs?: number      // 总耗时
  executionTrace?: TraceStep[]          // V2.0 执行轨迹
  pendingConfirmation?: PendingConfirmation  // V2.0 挂起的确认请求
}

/**
 * 单条过敏记录
 */
export interface AllergyRecord {
  id: string
  allergen: string          // 过敏原
  symptoms: string          // 症状描述
  severity: 'mild' | 'moderate' | 'severe'  // 严重程度（与后端 enum 对齐）
  occurrenceDate: string    // ISO 日期字符串
  treatment?: string | null // 处理方式
  notes?: string | null     // 备注
}

/**
 * GET_allergy_records 工具的输出
 */
export interface AllergyToolOutput {
  success: boolean
  message?: string
  catId?: string
  catName?: string
  totalRecords: number
  records: AllergyRecord[]
  allergens: string[]       // 所有过敏原列表
  patternAnalysis: {
    uniqueAllergens: string[]
    topAllergens: string[]
    seasonalPattern?: string
    recentCount: number
  }
  lastOccurrence: string | null
}

/**
 * 健康周报数据（GENERATE_health_report 工具输出）
 */
export interface HealthWeeklyReport {
  reportType: 'weekly'
  timeRange: { startDate: string; endDate: string; durationDays: number }
  catInfo: { id: string; name: string; breed: string | null; age: string; gender: string }
  weightTrend: {
    currentWeight: number
    previousWeight: number | null
    changePercent: number | null
    trend: 'up' | 'down' | 'stable'
    dailyRecords: Array<{ date: string; weight: number }>
    standardRange: { min: number; max: number } | null
    unit: string
  } | null
  healthScore: {
    total: number
    level: 'excellent' | 'good' | 'fair' | 'poor'
    breakdown: {
      weight?: { score: number; maxScore: number }
      vaccine?: { score: number; maxScore: number }
      allergy?: { score: number; maxScore: number }
    }
    weightingMode: 'full' | 'without_activity'
  }
  vaccineStatus: {
    upToDate: boolean
    totalVaccines: number
    recentVaccinations: Array<{ name: string; date: string }>
    nextDueDate: string | null
    nextDueVaccine: string | null
  } | null
  allergySummary: {
    totalRecords: number
    recentOccurrences: number
    topAllergens: string[]
    alert: string | null
  }
  activityLevel: null  // P2 阶段无数据源
  highlights: Array<{
    type: 'positive' | 'neutral' | 'warning'
    title: string
    detail: string
  }>
  suggestions: Array<{
    priority: 'high' | 'medium' | 'low'
    category: 'diet' | 'exercise' | 'vaccine' | 'allergy' | 'general'
    title: string
    detail: string
  }>
  toDoList: Array<{
    id: string
    text: string
    completed: boolean
    category: 'vaccine' | 'checkup' | 'diet' | 'allergy' | 'general'
  }>
}

/**
 * 消息（agent 感知）
 */
export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  markdownContent?: string
  referencedGuides?: string[]
  citations?: Citation[]    // RAG 检索到的引用来源
  metadata?: string          // 向后兼容
  agentMeta?: AgentMeta      // agent 调用信息
  isStreaming?: boolean
  createdAt: string
}

/**
 * 对话
 */
export interface Conversation {
  id: string
  userId: string
  title: string
  messages?: Message[]
  createdAt: string
  updatedAt: string
  _count?: {
    messages: number
  }
}

/**
 * 参考的指南摘要
 */
export interface ReferencedGuide {
  id: string
  title: string
  slug: string
  excerpt: string
  category: {
    id: string
    name: string
    slug: string
  }
}

/**
 * 发送消息参数
 */
export interface SendMessageParams {
  conversationId?: string
  content: string
  catId?: string
}

/**
 * 发送消息响应
 */
export interface SendMessageResponse {
  message: Message
  conversation: Conversation
  referencedGuides?: ReferencedGuide[]
}

/**
 * 创建对话参数
 */
export interface CreateConversationParams {
  title?: string
}

/**
 * SSE事件类型
 */
export type SSEEventType = 'connected' | 'message_start' | 'message_chunk' | 'message_done' | 'error'

/**
 * SSE事件
 */
export interface SSEEvent {
  event: SSEEventType
  data: any
}
