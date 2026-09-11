/**
 * 对话持久化服务 —— 会话解析/消息落库/历史拉取的唯一入口。
 * 之前这三块逻辑在 chat.controller 的三个 handler 里各复制了一份。
 */
import prisma from '../config/database'
import type { Conversation } from '@prisma/client'
import type { ChatMessage } from './ai.service'
import type { ToolResult } from '../agent/types/agent'

/** catAgent.handleStreaming 的返回形状(仅取持久化所需字段) */
export interface AgentStreamResult {
  content: string
  toolNames?: string[]
  toolResults?: ToolResult[]
  traceId?: string
  citations?: unknown
}

/**
 * 取出或创建会话;会话不存在或不属于该用户时返回 null(由 controller 决定 404)。
 * 返回完整会话记录——非流式 handler 的响应里要带它。
 */
export async function resolveConversation(
  conversationId: string | undefined,
  userId: string,
  content: string,
  catId?: string
): Promise<Conversation | null> {
  if (!conversationId) {
    const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')
    return prisma.conversation.create({
      data: { userId, title, catId: catId || null },
    })
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  })
  if (!conversation) return null

  // 会话尚无绑定猫而本次带了 catId 时补绑
  if (catId && !conversation.catId) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { catId } })
  }
  return conversation
}

/** 保存用户消息(attachments 存 metadata),返回消息记录 */
export async function saveUserMessage(
  conversationId: string,
  content: string,
  attachments: string[] = []
) {
  return prisma.message.create({
    data: {
      conversationId,
      role: 'user',
      content,
      metadata: attachments.length > 0 ? JSON.stringify({ attachments }) : null,
    },
    select: { id: true },
  })
}

/** 拉取对话历史(默认最近 20 条、剔除 system),excludeMessageId 用于排除刚存入的当前消息 */
export async function loadChatHistory(
  conversationId: string,
  excludeMessageId?: string,
  take = 20
): Promise<ChatMessage[]> {
  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      ...(excludeMessageId ? { id: { not: excludeMessageId } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take,
  })
  return rows
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as ChatMessage['role'], content: m.content }))
}

/**
 * 流式结束后持久化 assistant 回复。
 * content 为空(仅卡片)但存在工具结果时也落库,否则二次进入会话会丢失卡片;
 * 工具结果序列化进 metadata,供前端还原卡片。
 */
export async function persistAssistantMessage(
  conversationId: string,
  result: AgentStreamResult
): Promise<void> {
  const hasContent = result.content && result.content.trim().length > 0
  const hasToolResults = result.toolResults && result.toolResults.length > 0
  if (!hasContent && !hasToolResults) return

  const toolCallsForPersist = (result.toolResults || []).map((r) => ({
    name: r.toolName,
    status: r.success ? 'done' : 'error',
    output: r.output,
  }))

  await prisma.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content: result.content || '',
      markdownContent: result.content || '',
      referencedGuides: JSON.stringify(result.citations),
      metadata: JSON.stringify({
        traceId: result.traceId,
        tools: result.toolNames,
        agentMode: true,
        toolCalls: toolCallsForPersist,
        citations: result.citations,
      }),
    },
  })
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })
}
