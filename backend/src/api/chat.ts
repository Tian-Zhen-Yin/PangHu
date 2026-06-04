import { Request, Response } from 'express'
import { sendMessage, CatContext } from '../services/ai.service'
import { retrieveKnowledge } from '../services/rag.service'

// ===== 对话上下文类型 =====

interface ConversationContext {
  catProfileId: string
  symptoms: string[]
  duration?: string
  frequency?: string
  severity?: string
  otherInfo: string[]
  turnCount: number
  isAsking: boolean
  currentQuestion?: string
  collectedInfo: Record<string, string>
}

// ===== 问诊信息收集配置 =====

const QUESTION_KEY_MAP: Record<string, string> = {
  '多久': 'duration',
  '持续': 'duration',
  '几次': 'frequency',
  '频率': 'frequency',
  '精神': 'severity',
  '状态': 'severity',
  '严重': 'severity',
}

// 从问诊问题中提取信息键名
function extractCollectedKey(question: string): string | undefined {
  for (const [keyword, key] of Object.entries(QUESTION_KEY_MAP)) {
    if (question.includes(keyword)) {
      return key
    }
  }
  return undefined
}

// 解析 AI 响应中的问诊标记
function parseAskTag(content: string): {
  cleanContent: string
  askQuestion?: string
  collectedKey?: string
  isEmergency: boolean
} {
  const askMatch = content.match(/<ask>(.*?)<\/ask>/s)
  const askQuestion = askMatch ? askMatch[1].trim() : undefined
  const cleanContent = content.replace(/<ask>.*?<\/ask>/gs, '').trim()

  // 判断是否为紧急情况
  const isEmergency = cleanContent.includes('**请立即就医！**') ||
                      cleanContent.includes('请立即就医') ||
                      (askMatch && cleanContent.includes('紧急'))

  return {
    cleanContent,
    askQuestion,
    collectedKey: askQuestion ? extractCollectedKey(askQuestion) : undefined,
    isEmergency,
  }
}

// ===== API 路由处理器 =====

export async function handleChatRequest(req: Request, res: Response) {
  try {
    const { message, conversationContext, catProfile } = req.body

    // 检查是否处于问诊状态
    if (conversationContext?.isAsking) {
      // 用户正在回答问诊问题，将答案添加到已收集信息中
      const updatedContext = {
        ...conversationContext,
        collectedInfo: {
          ...conversationContext.collectedInfo,
          [conversationContext.currentQuestion || 'other']: message,
        },
        isAsking: false,
        currentQuestion: undefined,
        turnCount: conversationContext.turnCount + 1,
      }

      // 构建增强的用户消息，包含已收集的信息
      const enhancedMessage = buildEnhancedMessage(
        message,
        updatedContext.collectedInfo,
        catProfile
      )

      // 调用 AI 获取最终建议
      const { content, metadata } = await sendMessage(
        enhancedMessage,
        [], // 暂不传递历史，避免 token 消耗过大
        '',
        catProfile
      )

      const parsed = parseAskTag(content)

      return res.json({
        content: parsed.cleanContent,
        isEmergency: parsed.isEmergency,
        citations: metadata.referencedGuides,
        askQuestion: parsed.askQuestion,
        collectedKey: parsed.collectedKey,
        conversationContext: parsed.askQuestion
          ? { ...updatedContext, isAsking: true, currentQuestion: parsed.askQuestion }
          : updatedContext,
      })
    }

    // 新对话或正常对话流程
    const { content, metadata } = await sendMessage(
      message,
      [],
      '',
      catProfile
    )

    const parsed = parseAskTag(content)

    // 构建新的对话上下文
    const newContext: ConversationContext = {
      catProfileId: catProfile?.id || '',
      symptoms: [],
      otherInfo: [],
      turnCount: 1,
      isAsking: !!parsed.askQuestion,
      currentQuestion: parsed.askQuestion,
      collectedInfo: parsed.collectedKey ? { [parsed.collectedKey]: '' } : {},
    }

    return res.json({
      content: parsed.cleanContent,
      isEmergency: parsed.isEmergency,
      citations: metadata.referencedGuides,
      askQuestion: parsed.askQuestion,
      collectedKey: parsed.collectedKey,
      conversationContext: newContext,
    })

  } catch (error: any) {
    console.error('[Chat API] Error:', error)
    return res.status(500).json({
      error: '处理请求时出错',
      message: error.message,
    })
  }
}

// 构建包含已收集信息的增强消息
function buildEnhancedMessage(
  currentMessage: string,
  collectedInfo: Record<string, string>,
  catProfile?: CatContext
): string {
  const infoParts: string[] = []

  // 添加猫咪名字（如果有）
  if (catProfile) {
    infoParts.push(`【${catProfile.name}的情况】`)
  }

  // 添加已收集的信息
  const infoLabels: Record<string, string> = {
    duration: '持续时间',
    frequency: '发作频率',
    severity: '严重程度/精神状态',
  }

  for (const [key, value] of Object.entries(collectedInfo)) {
    if (value) {
      const label = infoLabels[key] || key
      infoParts.push(`- ${label}：${value}`)
    }
  }

  // 组合最终消息
  if (infoParts.length > 0) {
    return `${infoParts.join('\n')}\n\n【最新补充】\n${currentMessage}`
  }

  return currentMessage
}

// ===== 路由导出 =====

export default function registerChatRoutes(app: any) {
  app.post('/api/chat', handleChatRequest)

  // 获取对话历史（可选实现）
  app.get('/api/chat/history/:sessionId', async (req: Request, res: Response) => {
    // TODO: 从数据库获取对话历史
    res.json({ messages: [] })
  })

  // 重置对话上下文
  app.post('/api/chat/reset', (req: Request, res: Response) => {
    res.json({
      conversationContext: {
        catProfileId: '',
        symptoms: [],
        otherInfo: [],
        turnCount: 0,
        isAsking: false,
        collectedInfo: {},
      },
    })
  })
}
