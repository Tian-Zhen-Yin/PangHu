import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'
// @ts-ignore
import { sendMessageStream, sendMessage, type ChatMessage } from '../services/ai.service'
import { getKnowledgeContext } from '../services/knowledge.service'
import { isSSERequest } from '../utils/stream'

/**
 * 获取用户的所有对话
 */
export async function getConversations(req: Request, res: Response) {
  const userId = (req as any).user?.userId

  if (!userId) {
    return res.status(401).json(successResponse(null, '未授权'))
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  res.json(successResponse(conversations))
}

/**
 * 获取单个对话详情（包含所有消息）
 */
export async function getConversationById(req: Request, res: Response) {
  const { id } = req.params
  const conversationId = Array.isArray(id) ? id[0] : id
  const userId = (req as any).user?.userId

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!conversation) {
    return res.status(404).json(successResponse(null, '对话不存在'))
  }

  res.json(successResponse(conversation))
}

/**
 * 创建新对话
 */
export async function createConversation(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  const { title } = req.body

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: title || '新对话'
    }
  })

  res.json(successResponse(conversation, '对话创建成功'))
}

/**
 * 删除对话
 */
export async function deleteConversation(req: Request, res: Response) {
  const { id } = req.params
  const conversationId = Array.isArray(id) ? id[0] : id
  const userId = (req as any).user?.userId

  // 验证对话属于该用户
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId }
  })

  if (!conversation) {
    return res.status(404).json(successResponse(null, '对话不存在'))
  }

  await prisma.conversation.delete({
    where: { id: conversationId }
  })

  res.json(successResponse(null, '对话删除成功'))
}

/**
 * 更新对话标题
 */
export async function updateConversationTitle(req: Request, res: Response) {
  const { id } = req.params
  const conversationId = Array.isArray(id) ? id[0] : id
  const userId = (req as any).user?.userId
  const { title } = req.body

  if (!title) {
    return res.status(400).json(successResponse(null, '标题不能为空'))
  }

  const conversation = await prisma.conversation.updateMany({
    where: {
      id: conversationId,
      userId
    },
    data: { title }
  })

  if (conversation.count === 0) {
    return res.status(404).json(successResponse(null, '对话不存在'))
  }

  res.json(successResponse({ title }, '标题更新成功'))
}

/**
 * 发送消息（流式响应）
 */
export async function sendMessageHandler(req: Request, res: Response) {
  const { conversationId, content } = req.body
  const userId = (req as any).user?.userId

  if (!content || content.trim().length === 0) {
    return res.status(400).json(successResponse(null, '消息内容不能为空'))
  }

  // 如果是SSE请求，使用流式响应
  if (isSSERequest(req.headers.accept)) {
    return handleStreamingMessage(conversationId, content, userId, req, res)
  }

  // 否则使用普通响应（保持兼容性）
  return handleNormalMessage(conversationId, content, userId, res)
}

/**
 * 处理流式消息
 */
async function handleStreamingMessage(
  conversationId: string | undefined,
  content: string,
  userId: string,
  req: Request,
  res: Response
) {
  let conversation: any

  // 如果没有指定对话ID，创建新对话
  if (!conversationId) {
    // 使用消息的前20个字符作为标题
    const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')

    conversation = await prisma.conversation.create({
      data: {
        userId,
        title
      }
    })
  } else {
    conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId
      }
    })

    if (!conversation) {
      return res.status(404).json(successResponse(null, '对话不存在'))
    }
  }

  // 保存用户消息
  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content
    }
  })

  // 获取对话历史
  const history = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
      id: { not: userMessage.id } // 排除刚刚保存的消息
    },
    orderBy: { createdAt: 'asc' },
    take: 20 // 限制历史记录数量
  })

  const chatHistory: ChatMessage[] = history
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as ChatMessage['role'],
      content: m.content
    }))

  // 获取相关知识
  const knowledgeContext = await getKnowledgeContext(content)

  // 开始流式响应
  res.on('close', async () => {
    // 连接关闭时的处理
    console.log('SSE connection closed')
  })

  // 异步处理AI响应
  sendMessageStream(content, chatHistory, knowledgeContext.context, res)
}

/**
 * 处理普通消息（非流式）
 */
async function handleNormalMessage(
  conversationId: string | undefined,
  content: string,
  userId: string,
  res: Response
) {
  let conversation: any

  // 如果没有指定对话ID，创建新对话
  if (!conversationId) {
    const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')

    conversation = await prisma.conversation.create({
      data: {
        userId,
        title
      }
    })
  } else {
    conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId
      }
    })

    if (!conversation) {
      return res.status(404).json(successResponse(null, '对话不存在'))
    }
  }

  // 保存用户消息
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content
    }
  })

  // 获取对话历史
  const history = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
      role: { not: 'system' }
    },
    orderBy: { createdAt: 'asc' },
    take: 20
  })

  const chatHistory: ChatMessage[] = history.map(m => ({
    role: m.role as ChatMessage['role'],
    content: m.content
  }))

  // 获取相关知识
  const knowledgeContext = await getKnowledgeContext(content)

  try {
    const { content: aiContent, metadata } = await sendMessage(content, chatHistory, knowledgeContext.context)

    // 保存AI回复
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: aiContent,
        markdownContent: aiContent,
        referencedGuides: JSON.stringify(knowledgeContext.guides.map(g => g.id)),
        metadata: JSON.stringify(metadata)
      }
    })

    // 更新对话的更新时间
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    })

    res.json(successResponse({
      message: assistantMessage,
      conversation,
      referencedGuides: knowledgeContext.guides
    }))
  } catch (error: any) {
    res.status(500).json(successResponse(null, error.message || 'AI服务暂时不可用'))
  }
}

/**
 * 获取预设问题列表
 */
export async function getSuggestedQuestions(_req: Request, res: Response) {
  const questions = [
    '小猫应该吃什么食物？',
    '猫咪多大了需要打疫苗？',
    '猫咪不爱喝水怎么办？',
    '如何训练猫咪不抓家具？',
    '猫咪呕吐了怎么办？',
    '猫咪绝育后需要注意什么？',
    '如何给猫咪剪指甲？',
    '猫咪掉毛严重怎么办？'
  ]

  res.json(successResponse(questions))
}
