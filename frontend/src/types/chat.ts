/**
 * 聊天相关类型定义
 */

/**
 * 消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息
 */
export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  markdownContent?: string
  referencedGuides?: string[]
  metadata?: string
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
