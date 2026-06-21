import { Request, Response } from 'express'
import prisma from '../config/database'
import { successResponse } from '../utils/response'
// @ts-ignore
import { sendMessageStream, sendMessage, type ChatMessage } from '../services/ai.service'
import { getKnowledgeContext } from '../services/knowledge.service'
import { isSSERequest } from '../utils/stream'
import { getCatContext } from '../services/cat.service'
import { catAgent } from '../agent'
import { resolveUserSegment } from '../config/featureFlags'
import { consumeConfirmation, cancelConfirmation } from '../services/confirmation.service'
import { AllergyRecordTool } from '../agent/tools/allergyRecord.tool'
import { GrowthRecordTool } from '../agent/tools/growthRecord.tool'
import { VaccineRecordTool } from '../agent/tools/vaccineRecord.tool'
import { WeightRecordTool } from '../agent/tools/weightRecord.tool'
import type { AgentContext } from '../agent/types/agent'
import { getTodoStatus, setTodoCompleted } from '../services/todo.service'

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
 * 发送消息（流式响应）— 支持 Agent 框架
 */
export async function sendMessageHandler(req: Request, res: Response) {
  const { conversationId, content, catId, useAgent, attachments } = req.body
  const userId = (req as any).user?.userId

  if (!content || content.trim().length === 0) {
    return res.status(400).json(successResponse(null, '消息内容不能为空'))
  }

  const agentEnabled = useAgent !== false
  const safeAttachments: string[] = Array.isArray(attachments)
    ? attachments.filter((a: unknown) => typeof a === 'string')
    : []

  if (agentEnabled && isSSERequest(req.headers.accept)) {
    return handleAgentStreamingMessage(conversationId, content, userId, catId, res, safeAttachments)
  }

  if (isSSERequest(req.headers.accept)) {
    return handleStreamingMessage(conversationId, content, userId, catId, req, res)
  }

  return handleNormalMessage(conversationId, content, userId, catId, res)
}

/**
 * Agent 驱动的流式消息处理
 *
 * 流程：Router → Planner → Executor (SSE 实时推送) → LLM 流式输出 (逐 token)
 * 客户端断开自动取消 pipeline
 *
 * P0 #1: 真正拉取历史并传入 catAgent.handleStreaming，恢复上下文记忆。
 * P0 #2: 流式结束后累积文本入库，保证刷新页面不丢失 AI 回复。
 */
async function handleAgentStreamingMessage(
  conversationId: string | undefined,
  content: string,
  userId: string,
  catId: string | undefined,
  res: Response,
  attachments: string[] = []
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
    if (catId && !conversation.catId) {
      await prisma.conversation.update({ where: { id: conversation.id }, data: { catId } })
    }
  }

  // 保存用户消息（在拉取历史之前，确保历史不含当前消息）
  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'user',
      content,
      metadata: attachments.length > 0 ? JSON.stringify({ attachments }) : null,
    }
  })

  // P0 #1: 拉取对话历史（最多 20 条），传入 Agent
  const historyRows = await prisma.message.findMany({
    where: { conversationId: conversation.id, id: { not: userMessage.id } },
    orderBy: { createdAt: 'asc' },
    take: 20
  })
  const chatHistory: ChatMessage[] = historyRows
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as ChatMessage['role'], content: m.content }))

  const effectiveCatId = catId || conversation.catId

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // 委托给 CatAgent 流式方法，其内部处理：
  // - Router → Planner → Executor（每步 SSE 实时推送）→ LLM 逐 token 输出
  // - 客户端断开自动 abort
  // - 返回累积的回复文本以供持久化
  // userSegment 由 INTERNAL_USER_IDS / BETA_USER_IDS 白名单解析,驱动 V3.0 LLM_TOOL_CALLING_LOOP 灰度
  const result = await catAgent.handleStreaming(
    content,
    userId,
    conversationId || 'adhoc',
    res,
    effectiveCatId,
    chatHistory,
    resolveUserSegment(userId),
    attachments,
  )

  // P0 #2: 持久化 assistant 回复，避免刷新页面丢失
  // 即使 content 为空（仅卡片），只要有工具结果也持久化，否则二次进入会话会丢失卡片
  const hasContent = result.content && result.content.trim().length > 0
  const hasToolResults = result.toolResults && result.toolResults.length > 0
  if (hasContent || hasToolResults) {
    try {
      // 把工具调用结果序列化进 metadata，供前端二次加载会话时还原卡片
      const toolCallsForPersist = (result.toolResults || []).map((r) => ({
        name: r.toolName,
        status: r.success ? 'done' : 'error',
        output: r.output,
      }))
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
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
          })
        }
      })
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() }
      })
    } catch (err: any) {
      console.error('[Chat] Failed to persist agent assistant message:', err.message)
    }
  }
}

/**
 * 处理流式消息（旧版本 - 保留兼容）
 */
async function handleStreamingMessage(
  conversationId: string | undefined,
  content: string,
  userId: string,
  catId: string | undefined,
  _req: Request,
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
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as ChatMessage['role'], content: m.content }))

  const knowledgeContext = await getKnowledgeContext(content)

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

/**
 * V2.0 确认写入操作（过敏录入等）
 * POST /api/chat/confirm
 * @body { confirmationId, action: 'confirm' | 'cancel', edits?: {...} }
 */
export async function confirmActionHandler(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  if (!userId) {
    return res.status(401).json(successResponse(null, '未授权'))
  }

  const { confirmationId, action, edits } = req.body

  if (!confirmationId || !action) {
    return res.status(400).json(successResponse(null, '缺少 confirmationId 或 action'))
  }

  // 取消操作
  if (action === 'cancel') {
    const cancelled = cancelConfirmation(confirmationId, userId)
    if (!cancelled) {
      return res.status(404).json(successResponse(null, '确认请求不存在或已过期'))
    }
    return res.json(successResponse({ cancelled: true }, '操作已取消'))
  }

  // 确认操作
  if (action === 'confirm') {
    const session = consumeConfirmation(confirmationId, userId)
    if (!session) {
      return res.status(410).json(successResponse(null, '确认请求不存在或已过期'))
    }

    // 构造带确认令牌的 AgentContext
    const ctx: AgentContext = {
      userId,
      sessionId: 'confirm-' + confirmationId,
      selectedCatId: session.catId,
      traceId: 'confirm-' + Date.now(),
      logger: console,
      cache: new Map(),
      confirmationToken: {
        verified: true,
        confirmedAt: new Date(),
        confirmationId,
      },
    }

    // 合并草稿数据与用户编辑（edits 优先覆盖）
    const draft = (session.draft || {}) as Record<string, any>
    const merged = { ...draft, ...(edits || {}) }

    let result
    switch (session.toolName) {
      case 'ADD_growth_record': {
        const input = {
          catId: session.catId || undefined,
          type: merged.type,
          notes: merged.notes || '',
          photos: Array.isArray(merged.photos) ? merged.photos : [],
          weight: merged.weight,
          isAdoptionDay: merged.isAdoptionDay,
          recordDate: merged.recordDate,
        }
        if (!input.notes && input.photos.length === 0) {
          return res.status(400).json(successResponse(null, '成长记录内容不能为空'))
        }
        result = await GrowthRecordTool.call(input, ctx)
        break
      }
      case 'ADD_vaccine_record': {
        const input = {
          catId: session.catId || undefined,
          vaccineName: merged.vaccineName || '',
          vaccineType: merged.vaccineType,
          vaccinatedAt: merged.vaccinatedAt,
          nextDueDate: merged.nextDueDate,
          manufacturer: merged.manufacturer,
          veterinarian: merged.veterinarian,
          clinic: merged.clinic,
          notes: merged.notes,
        }
        if (!input.vaccineName) {
          return res.status(400).json(successResponse(null, '疫苗名称不能为空'))
        }
        result = await VaccineRecordTool.call(input, ctx)
        break
      }
      case 'ADD_weight_record': {
        const input = {
          catId: session.catId || undefined,
          weight: typeof merged.weight === 'number' ? merged.weight : parseFloat(merged.weight),
          notes: merged.notes,
          recordDate: merged.recordDate,
        }
        if (!input.weight || Number.isNaN(input.weight)) {
          return res.status(400).json(successResponse(null, '体重数值不能为空'))
        }
        result = await WeightRecordTool.call(input, ctx)
        break
      }
      case 'ADD_allergy_record':
      default: {
        const input = {
          catId: session.catId,
          allergen: merged.allergen || '',
          symptoms: merged.symptoms || '',
          severity: merged.severity || 'moderate',
          occurrenceDate: merged.occurrenceDate,
          treatment: merged.treatment,
          notes: merged.notes,
        }
        if (!input.allergen) {
          return res.status(400).json(successResponse(null, '过敏原不能为空'))
        }
        result = await AllergyRecordTool.call(input, ctx)
      }
    }

    return res.json(successResponse(result, result.message))
  }

  return res.status(400).json(successResponse(null, '未知的 action 类型'))
}

/**
 * 对话框图片上传
 * POST /api/chat/upload  (multipart, field: photos, 最多 9 张)
 * 返回图片 URL 数组，供前端随消息一起作为 attachments 发送
 */
export async function uploadChatImagesHandler(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  if (!userId) {
    return res.status(401).json(successResponse(null, '未授权'))
  }

  const files = (req as any).files as Express.Multer.File[] | undefined
  if (!files || files.length === 0) {
    return res.status(400).json(successResponse(null, '未检测到上传的图片'))
  }

  const urls = files.map((f) => `/uploads/pets/${f.filename}`)
  return res.json(successResponse({ urls }, '上传成功'))
}


/**
 * V2.0 P4 待办事项切换
 * POST /api/chat/todo/toggle
 * @body { todoId, completed }
 */
export async function todoToggleHandler(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  if (!userId) {
    return res.status(401).json(successResponse(null, '未授权'))
  }

  const { todoId, completed } = req.body

  if (!todoId || typeof completed !== 'boolean') {
    return res.status(400).json(successResponse(null, '缺少 todoId 或 completed 字段'))
  }

  // 持久化到数据库（使用 raw SQL / todo service）
  try {
    await setTodoCompleted(userId, todoId, completed)
    return res.json(successResponse({ todoId, completed }, completed ? '待办已标记完成' : '待办已取消'))
  } catch (error: any) {
    console.error('[TodoToggle] Error:', error.message)
    return res.status(500).json(successResponse(null, '操作失败'))
  }
}

/**
 * V2.0 P4 获取待办状态
 * POST /api/chat/todo/status
 * @body { todoIds: string[] }
 */
export async function todoStatusHandler(req: Request, res: Response) {
  const userId = (req as any).user?.userId
  if (!userId) {
    return res.status(401).json(successResponse(null, '未授权'))
  }

  const { todoIds } = req.body
  if (!Array.isArray(todoIds) || todoIds.length === 0) {
    return res.status(400).json(successResponse(null, '缺少 todoIds 数组'))
  }

  try {
    const statusMap = await getTodoStatus(userId, todoIds)
    return res.json(successResponse(statusMap))
  } catch (error: any) {
    console.error('[TodoStatus] Error:', error.message)
    return res.status(500).json(successResponse(null, '获取失败'))
  }
}
