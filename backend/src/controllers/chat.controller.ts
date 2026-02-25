import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'
// @ts-ignore
import { sendMessageStream, sendMessage, type ChatMessage } from '../services/ai.service'
import { getKnowledgeContext } from '../services/knowledge.service'
import { isSSERequest } from '../utils/stream'
import { getCatContext } from '../services/cat.service'

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
  const { conversationId, content, catId } = req.body
  const userId = (req as any).user?.userId

  if (!content || content.trim().length === 0) {
    return res.status(400).json(successResponse(null, '消息内容不能为空'))
  }

  // 如果是SSE请求，使用流式响应
  if (isSSERequest(req.headers.accept)) {
    return handleStreamingMessage(conversationId, content, userId, catId, req, res)
  }

  // 否则使用普通响应（保持兼容性）
  return handleNormalMessage(conversationId, content, userId, catId, res)
}

/**
 * 处理流式消息
 */
async function handleStreamingMessage(
  conversationId: string | undefined,
  content: string,
  userId: string,
  catId: string | undefined,
  req: Request,
  res: Response
) {
  let conversation: any

  if (!conversationId) {
    const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')
    conversation = await prisma.conversation.create({
      data: { userId, title, catId: catId || null }
    })
  } else {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId }
    })
    if (!conversation) {
      return res.status(404).json(successResponse(null, '对话不存在'))
    }
    // 如果对话没有关联猫咪但本次传入了catId，更新关联
    if (catId && !conversation.catId) {
      await prisma.conversation.update({ where: { id: conversation.id }, data: { catId } })
    }
  }

  const userMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: 'user', content }
  })

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id, id: { not: userMessage.id } },
    orderBy: { createdAt: 'asc' },
    take: 20
  })

  const chatHistory: ChatMessage[] = history
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as ChatMessage['role'], content: m.content }))

  const knowledgeContext = await getKnowledgeContext(content)

  // 获取猫咪上下文
  const effectiveCatId = catId || conversation.catId
  const catContext = effectiveCatId ? await getCatContext(effectiveCatId, userId) : undefined

  res.on('close', () => { console.log('SSE connection closed') })

  sendMessageStream(content, chatHistory, knowledgeContext.context, res, catContext || undefined)
}

/**
 * 处理普通消息（非流式）
 */
async function handleNormalMessage(
  conversationId: string | undefined,
  content: string,
  userId: string,
  catId: string | undefined,
  res: Response
) {
  let conversation: any

  if (!conversationId) {
    const title = content.substring(0, 20) + (content.length > 20 ? '...' : '')
    conversation = await prisma.conversation.create({
      data: { userId, title, catId: catId || null }
    })
  } else {
    conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId }
    })
    if (!conversation) {
      return res.status(404).json(successResponse(null, '对话不存在'))
    }
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: 'user', content }
  })

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id, role: { not: 'system' } },
    orderBy: { createdAt: 'asc' },
    take: 20
  })

  const chatHistory: ChatMessage[] = history.map(m => ({
    role: m.role as ChatMessage['role'],
    content: m.content
  }))

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
