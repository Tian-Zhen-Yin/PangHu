// @ts-nocheck
import { SSEStream } from '../utils/stream'
import { Response } from 'express'
import axios from 'axios'
import https from 'https'
import { retrieveKnowledge, type Citation } from './rag.service'

// 创建忽略证书验证的 https agent（仅用于开发环境）
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
})

// 默认使用的模型
const DEFAULT_MODEL = process.env.ZHIPUAI_MODEL || 'glm-4-flash'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ServiceChatMessage {
  role: MessageRole
  content: string
}

export type ChatMessage = ServiceChatMessage

export interface AIMetadata {
  tokensUsed?: number
  model: string
  referencedGuides?: Citation[]
  latency?: number
}

export interface CatContext {
  id: string
  name: string
  breed?: string | null
  gender: string
  ageMonths: number
  ageFormatted: string
  weight?: number | null
  isNeutered: boolean
  allergies?: string | null
  diseases?: string | null
  recentVaccines: Array<{ name: string; date: string; nextDueDate?: string | null }>
  lastRecord?: { date: string; weight?: number | null; notes?: string | null } | null
}

const SYSTEM_PROMPT = `你是"喵喵医生"，一位专业的猫咪医疗顾问和养护专家。

## ⚠️ 核心原则：按顺序判断，匹配即停止

### 步骤1：判断信息是否完整
**如果用户提到症状但未说明持续时间/严重程度，必须追问！**

⚠️ 重要：先检查用户是否已经提供了时间信息
时间关键词包括：超过、持续、已经、X小时、X天、从X开始、一直等

问诊触发条件（症状关键词 + 无时间信息）：
- 不吃东西/不喝水 + 无时间 → 追问"持续多久了？"
- 呕吐/拉稀 + 无时间 → 追问"几次了？持续多久？"
- 没精神/精神差 + 无时间 → 追问"从什么时候开始？"
- 咳嗽/喘气 + 无时间 → 追问"持续多久了？"

问诊格式：
<ask>单个问题</ask>

示例：
- 用户："我的猫不吃东西" → 你：<ask>这种情况持续多久了？</ask> ❌追问
- 用户："我的猫持续呕吐超过24小时" → 直接进入步骤2 ✅不追问
- 用户："它呕吐了" → 你：<ask>呕吐几次了？持续多久？</ask> ❌追问

**严禁：在追问时给诊断、建议或判断是否紧急**

### 步骤2：判断是否紧急
用户明确说了以下【已持续】的症状：
- "呼吸困难" + 持续进行中
- "无法排尿" / 憋尿
- "呕吐/腹泻" + "超过24小时" / "一天多" / "两天了"
- "不食/不吃" + "超过24小时" / "一天多" / "两天了"
- 出血 / 骨折 / 抽搐 / 昏迷

→ 第一句必须是"**请立即就医！**"

### 步骤3：正常回答
症状清晰、信息完整、非紧急情况

→ 基于知识库片段回答
→ 片段不足时说："我的知识库暂时没有这方面的记录，建议咨询专业兽医"

## 知识库使用规则
每次对话中，我会提供标注了编号的【知识库参考片段】：
1. 每个片段开头都会标明来源，例如"【片段1】来源：《指南标题》"
2. 优先且只基于这些片段回答，不允许凭空推断
3. 回答末尾必须列出所有参考的指南标题，格式："参考来源：《指南标题1》、《指南标题2》"
4. 片段为空或不相关时，声明"知识库无记录"

## 输出格式
- Markdown，300字以内
- 重要警告加粗
- 末尾必须有"参考来源：《指南标题1》、《指南标题2》"或"知识库无记录"声明`

export function buildCatContextPrompt(catContext: CatContext): string {
  const genderText = catContext.gender === 'male' ? '公猫' : catContext.gender === 'female' ? '母猫' : '未知性别'
  const vaccineText = catContext.recentVaccines.length > 0
    ? catContext.recentVaccines.map(v => `${v.name}(${v.date})`).join('、')
    : '暂无记录'

  return `
## 当前咨询的猫咪档案
- 名字：${catContext.name}
- 品种：${catContext.breed || '未知'}
- 性别：${genderText}
- 年龄：${catContext.ageFormatted}
- 体重：${catContext.weight ? `${catContext.weight}kg` : '未记录'}
- 绝育状态：${catContext.isNeutered ? '已绝育' : '未绝育'}${catContext.allergies ? `\n- 过敏信息：${catContext.allergies}` : ''}${catContext.diseases ? `\n- 既往病史：${catContext.diseases}` : ''}
- 近期疫苗：${vaccineText}

**请根据以上猫咪的具体情况提供个性化建议。**`
}

function generateToken(apiKey: string): string {
  const [id, secret] = apiKey.split('.')
  if (!id || !secret) throw new Error('Invalid API key format')

  const header = { alg: 'HS256', sign_type: 'SIGN' }
  const now = Date.now()
  const payload = { api_key: id, exp: now + 3600000, timestamp: now }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')

  const crypto = require('crypto')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function buildMessages(
  history: ServiceChatMessage[],
  knowledgeContext = '',
  useRAG: boolean = true,
  apiKey: string = '',
  catContext?: CatContext
): Promise<{ messages: any[]; citations?: Citation[] }> {
  const userQuery = history.length > 0
    ? history[history.length - 1].content
    : '请介绍一下猫咪养护知识'

  // ✅ system message 永远存在，不受 RAG 开关影响
  const systemMessage = {
    role: 'system',
    content: SYSTEM_PROMPT
  }

  let knowledgeBlock = ''
  let citations: Citation[] = []

  // ✅ RAG 只负责取回知识片段，不再负责拼 Prompt
  if (useRAG && apiKey) {
    try {
      const ageStage = catContext
        ? catContext.ageMonths < 12 ? '幼猫期'
          : catContext.ageMonths < 84 ? '成年期' : '老年期'
        : undefined

      const ragResult = await retrieveKnowledge(userQuery, apiKey, {
        topK: 3,
        minScore: 0.2,
        ageStage
      })

      if (ragResult.chunks.length > 0) {
        // 给每个片段加编号，使用更明显的格式
        knowledgeBlock = '## 知识库参考片段\n' +
          ragResult.chunks.map((chunk, i) =>
            `【片段${i + 1}】来源：《${chunk.metadata.title || '养护指南'}》\n${chunk.content}`
          ).join('\n\n')

        citations = ragResult.citations
      } else {
        knowledgeBlock = '## 知识库参考片段\n（本次检索未找到相关内容，请基于通用知识回答，并说明来源不确定）'
      }
    } catch (error) {
      console.error('[AI Service] RAG检索失败，使用默认模式:', error)
      knowledgeBlock = '## 知识库参考片段\n（检索服务暂时不可用）'
    }
  }

  // ✅ 猫咪档案、知识片段、问题分别是独立的块，结构清晰
  const catBlock = catContext ? buildCatContextPrompt(catContext) : ''

  const userMessage = {
    role: 'user',
    content: [
      catBlock,
      knowledgeBlock,
      `## 用户问题\n${userQuery}`
    ].filter(Boolean).join('\n\n')
  }

  // ✅ 历史对话正确放在 system 和最新 user message 之间
  const historyMessages = history.slice(0, -1).map(msg => ({
    role: msg.role,
    content: msg.content
  }))

  return {
    messages: [systemMessage, ...historyMessages, userMessage],
    citations
  }
}

export function getApiConfig() {
  const apiKey = process.env.ZHIPUAI_API_KEY || ''
  const token = generateToken(apiKey)
  return { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', token, apiKey }
}

export { generateToken }

export async function sendMessage(
  userMessage: string,
  conversationHistory: ServiceChatMessage[] = [],
  knowledgeContext = '',
  catContext?: CatContext
): Promise<{ content: string; metadata: AIMetadata }> {
  const startTime = Date.now()

  try {
    const { baseUrl, token, apiKey } = getApiConfig()
    const { messages } = await buildMessages(
      [...conversationHistory, { role: 'user', content: userMessage }],
      knowledgeContext,
      true,
      apiKey,
      catContext
    )

    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      top_p: 0.9
    }, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      httpsAgent
    })

    const content = response.data.choices?.[0]?.message?.content || ''
    return {
      content,
      metadata: {
        tokensUsed: response.data.usage?.total_tokens,
        model: DEFAULT_MODEL,
        latency: Date.now() - startTime
      }
    }
  } catch (error: any) {
    console.error('AI服务错误:', error.response?.data || error.message)
    throw new Error(error.response?.data?.error?.message || error.message || 'AI服务暂时不可用')
  }
}

export async function sendMessageStream(
  userMessage: string,
  conversationHistory: ServiceChatMessage[] = [],
  knowledgeContext = '',
  res: Response,
  catContext?: CatContext
): Promise<void> {
  const startTime = Date.now()
  const stream = new SSEStream(res)
  let retrievedCitations: Citation[] = []

  console.log('[AI Service] 开始流式响应，用户消息:', userMessage)
  if (catContext) console.log('[AI Service] 猫咪上下文:', catContext.name, catContext.ageFormatted)

  try {
    const { baseUrl, token, apiKey } = getApiConfig()
    console.log('[AI Service] API配置:', { baseUrl, hasToken: !!token })

    const { messages, citations } = await buildMessages(
      [...conversationHistory, { role: 'user', content: userMessage }],
      knowledgeContext,
      true,
      apiKey,
      catContext
    )

    if (citations) {
      retrievedCitations = citations
      console.log('[AI Service] RAG检索到引用:', citations.length)
    }

    console.log('[AI Service] 发送请求到智谱AI，模型:', DEFAULT_MODEL)

    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      stream: true
    }, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      responseType: 'stream',
      httpsAgent
    })

    console.log('[AI Service] 收到ZhipuAI响应，状态:', response.status)

    let isFirst = true

    response.data.on('data', (chunk: Buffer) => {
      if (stream.closed) return

      const text = chunk.toString()
      console.log('[AI Service] 收到数据块:', text.substring(0, 100))

      const lines = text.split('\n').filter((line: string) => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              stream.sendChunk(content, isFirst)
              if (isFirst) isFirst = false
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    })

    response.data.on('end', () => {
      if (!stream.closed) {
        stream.sendDone({
          model: DEFAULT_MODEL,
          latency: Date.now() - startTime,
          citations: retrievedCitations,
          catContext: catContext ? { id: catContext.id, name: catContext.name } : undefined
        })
        stream.close()
      }
    })

    response.data.on('error', (err: Error) => {
      console.error('[AI Service] ZhipuAI流式响应错误:', err)
      if (!stream.closed) {
        stream.sendError(err.message || 'AI服务暂时不可用')
        stream.close()
      }
    })

    response.data.on('close', () => {
      console.log('[AI Service] ZhipuAI连接关闭')
    })
  } catch (error: any) {
    console.error('AI流式服务错误:', error.response?.data || error.message)
    stream.sendError(error.response?.data?.error?.message || error.message || 'AI服务暂时不可用')
    stream.close()
  }
}

export function checkAvailability(): boolean {
  return !!(process.env.ZHIPUAI_API_KEY && process.env.ZHIPUAI_API_KEY.length > 0)
}

/**
 * 主动健康建议接口
 */
export interface WeightAdvice {
  status: 'thin' | 'normal' | 'overweight'
  suggestion: string
}

export interface VaccineAdvice {
  nextAction: string
  upcoming: Array<{ name: string; date: string; daysLeft: number }>
}

export interface AgeAdvice {
  stage: string
  tips: string[]
}

export interface ProactiveAdviceResponse {
  weightAdvice?: WeightAdvice
  vaccineAdvice?: VaccineAdvice
  ageAdvice?: AgeAdvice
  generalAdvice?: string
}

/**
 * 分析猫咪数据并生成主动健康建议
 */
export async function generateProactiveAdvice(
  catId: string,
  userId: string,
  types: ('weight' | 'vaccine' | 'age' | 'general')[] = ['weight', 'vaccine', 'age', 'general']
): Promise<ProactiveAdviceResponse> {
  const { PrismaClient } = require('@prisma/client')
  const prisma = new PrismaClient()
  const { analyzeWeight } = require('./weightStandard.service')

  // 获取猫咪档案
  const cat = await prisma.cat.findFirst({
    where: { id: catId, userId, isActive: true },
    include: {
      vaccines: {
        where: { nextDueDate: { not: null } },
        orderBy: { nextDueDate: 'asc' },
        take: 3,
      },
    },
  })

  if (!cat) {
    throw new Error('猫咪不存在')
  }

  const result: ProactiveAdviceResponse = {}

  // 体重分析
  if (types.includes('weight')) {
    const weightAnalysis = await analyzeWeight(catId, userId)
    if (weightAnalysis) {
      result.weightAdvice = {
        status: weightAnalysis.status,
        suggestion: weightAnalysis.message,
      }
    }
  }

  // 疫苗提醒
  if (types.includes('vaccine')) {
    const upcomingVaccines: Array<{ name: string; date: string; daysLeft: number }> = []
    const now = new Date()

    for (const vaccine of cat.vaccines) {
      if (vaccine.nextDueDate) {
        const daysLeft = Math.floor((vaccine.nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysLeft <= 60) { // 60天内到期
          upcomingVaccines.push({
            name: vaccine.vaccineName,
            date: vaccine.nextDueDate.toISOString().split('T')[0],
            daysLeft,
          })
        }
      }
    }

    if (upcomingVaccines.length > 0) {
      const nearest = upcomingVaccines[0]
      result.vaccineAdvice = {
        nextAction: nearest.daysLeft <= 7
          ? `${nearest.name}将在${nearest.daysLeft}天后到期，请尽快预约接种`
          : `${nearest.name}将于${nearest.date}到期，建议提前一周预约`,
        upcoming: upcomingVaccines,
      }
    }
  }

  // 年龄阶段建议 - 根据领养状态调整
  if (types.includes('age')) {
    const ageMonths = Math.floor(
      (Date.now() - cat.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )

    let stage: string
    let tips: string[]

    // 根据领养状态调整建议
    const adoptStatus = cat.adoptStatus || 'raisedFromBaby'

    if (adoptStatus === 'adoptedAdult' || adoptStatus === 'unknownAge') {
      // 成年领养或年龄不详 - 重点关注健康和适应
      stage = '成年期'
      tips = [
        '刚到家需要适应期，提供安静舒适的环境',
        '建议领养后1-2周进行体检，建立健康档案',
        '观察饮食习惯，逐步过渡到新食物',
        '建立规律的作息习惯，帮助猫咪适应新家',
        '注意观察行为和健康状况变化',
      ]
    } else if (adoptStatus === 'adoptedYoung' && ageMonths >= 6) {
      // 领养的幼年猫（已超过幼猫期）
      stage = '青少年期'
      tips = [
        '刚到新环境需要适应期，给予耐心和关爱',
        '检查并完成必要的疫苗接种',
        '观察饮食和排便情况，确保健康',
        '提供安全的环境，防止应激反应',
      ]
    } else if (ageMonths < 6) {
      stage = '幼猫期'
      tips = [
        '幼猫需要高蛋白饮食支持快速发育',
        '建议每月进行一次体重检查',
        '按时完成核心疫苗接种',
        '注意保暖，避免着凉',
      ]
    } else if (ageMonths < 12) {
      stage = '青少年期'
      tips = [
        '逐渐过渡到成猫粮',
        '是绝育手术的理想时期',
        '保持良好的运动习惯',
        '定期驱虫和疫苗接种',
      ]
    } else if (ageMonths < 84) { // 7岁以下
      stage = '成年期'
      tips = [
        '保持稳定规律的饮食',
        '每年至少一次全面体检',
        '注意口腔健康，建议定期刷牙',
        '保持适量运动防止肥胖',
      ]
    } else {
      stage = '老年期'
      tips = [
        '建议每年两次体检',
        '关注肾脏和关节健康',
        '提供易消化的老年猫粮',
        '注意观察行为变化',
      ]
    }

    result.ageAdvice = { stage, tips }
  }

  // 综合建议
  if (types.includes('general')) {
    const healthScore = calculateHealthScore(cat, result)
    if (healthScore >= 80) {
      result.generalAdvice = `${cat.name}整体健康状况良好，继续保持当前的养护方式。`
    } else if (healthScore >= 60) {
      result.generalAdvice = `${cat.name}健康状况基本正常，建议关注上述提示事项。`
    } else {
      result.generalAdvice = `${cat.name}需要特别关注上述健康建议，如有异常请及时就医。`
    }
  }

  return result
}

/**
 * 计算健康评分（简单算法）
 */
function calculateHealthScore(cat: any, advice: ProactiveAdviceResponse): number {
  let score = 100

  // 体重异常扣分
  if (advice.weightAdvice?.status === 'thin') score -= 20
  if (advice.weightAdvice?.status === 'overweight') score -= 15

  // 即将到期的疫苗扣分
  if (advice.vaccineAdvice?.upcoming && advice.vaccineAdvice.upcoming.length > 0) {
    const daysLeft = advice.vaccineAdvice.upcoming[0].daysLeft
    if (daysLeft < 0) score -= 30
    else if (daysLeft < 7) score -= 10
    else if (daysLeft < 30) score -= 5
  }

  return Math.max(0, score)
}
