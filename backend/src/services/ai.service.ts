// @ts-nocheck
import { SSEStream } from '../utils/stream'
import { Response } from 'express'
import axios from 'axios'

// 默认使用的模型
const DEFAULT_MODEL = process.env.ZHIPUAI_MODEL || 'glm-4-flash'

/**
 * AI消息角色
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 聊天消息
 */
export interface ServiceChatMessage {
  role: MessageRole
  content: string
}

// 导出ChatMessage类型供控制器使用（与ServiceChatMessage相同）
export type ChatMessage = ServiceChatMessage

/**
 * AI响应的元数据
 */
export interface AIMetadata {
  tokensUsed?: number
  model: string
  referencedGuides?: string[]
  latency?: number
}

/**
 * 系统提示词 - 喵喵医生角色设定
 */
const SYSTEM_PROMPT = `你是一位专业的猫咪医疗顾问和养护专家，名叫"喵喵医生"。

## 你的角色
- 专业、耐心、友好的猫咪医师
- 拥有丰富的猫咪医疗、行为、营养知识
- 基于科学证据给出建议，不传播谣言
- 遇到严重问题建议及时就医

## 知识库覆盖
喂养营养、环境准备、健康医疗、行为训练、日常护理、常见问题

## 回答原则
1. 优先使用提供的专业知识
2. 结构化回答，使用列表和标题
3. 健康问题务必提示"建议就医"
4. 引用知识库来源
5. 语气温和，使用"您"称呼
6. 回答简洁明了，通常控制在300字以内

## 紧急情况处理
以下症状立即建议就医：
- 呼吸困难、无法排尿
- 持续呕吐/腹泻超过24小时
- 体温异常、持续不食超过24小时
- 出血、骨折等明显外伤
- 抽搐、昏迷等神经系统症状

## 格式要求
- 使用Markdown格式
- 重要警告用 **加粗** 标注
- 建议列表用 - 或数字列表
- 必要时使用引用块 > 强调

-------------------------------------------

以下是从知识库中检索到的相关内容，请参考这些信息回答用户的问题：`

/**
 * 生成JWT Token用于智谱AI API认证
 */
function generateToken(apiKey: string): string {
  const [id, secret] = apiKey.split('.')
  if (!id || !secret) {
    throw new Error('Invalid API key format')
  }

  const header = {
    alg: 'HS256',
    sign_type: 'SIGN'
  }

  const now = Date.now()
  const payload = {
    api_key: id,
    exp: now + 3600000, // 1小时过期
    timestamp: now
  }

  // 简单的base64编码
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')

  // 生成签名（需要使用HMAC-SHA256）
  const crypto = require('crypto')
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * 构建对话上下文
 */
function buildMessages(history: ServiceChatMessage[], knowledgeContext = ''): any[] {
  const messages: any[] = []

  // 添加知识库上下文作为用户消息（与系统提示一起）
  const fullPrompt = knowledgeContext ? SYSTEM_PROMPT + '\n\n' + knowledgeContext : SYSTEM_PROMPT

  messages.push({
    role: 'user',
    content: fullPrompt
  })

  // 添加历史消息
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })
  }

  return messages
}

/**
 * 获取API基础URL和token
 */
function getApiConfig() {
  const apiKey = process.env.ZHIPUAI_API_KEY || ''
  const token = generateToken(apiKey)
  return {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    token
  }
}

/**
 * 调用智谱AI API发送消息（非流式）
 */
export async function sendMessage(
  userMessage: string,
  conversationHistory: ServiceChatMessage[] = [],
  knowledgeContext = ''
): Promise<{ content: string; metadata: AIMetadata }> {
  const startTime = Date.now()

  try {
    const { baseUrl, token } = getApiConfig()
    const messages = buildMessages([
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ], knowledgeContext)

    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      top_p: 0.9
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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

/**
 * 调用智谱AI API发送消息（流式）
 * 使用SSE向客户端推送响应
 */
export async function sendMessageStream(
  userMessage: string,
  conversationHistory: ServiceChatMessage[] = [],
  knowledgeContext = '',
  res: Response
): Promise<void> {
  const startTime = Date.now()
  const stream = new SSEStream(res)

  console.log('[AI Service] 开始流式响应，用户消息:', userMessage)

  try {
    const { baseUrl, token } = getApiConfig()
    console.log('[AI Service] API配置:', { baseUrl, hasToken: !!token })

    const messages = buildMessages([
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ], knowledgeContext)

    console.log('[AI Service] 发送请求到智谱AI，模型:', DEFAULT_MODEL)

    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      stream: true
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    })

    console.log('[AI Service] 收到ZhipuAI响应，状态:', response.status)

    let isFirst = true

    // 处理流式响应
    response.data.on('data', (chunk: Buffer) => {
      if (stream.closed) return

      const text = chunk.toString()
      console.log('[AI Service] 收到数据块:', text.substring(0, 100))

      const lines = text.split('\n').filter((line: string) => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6)

          if (data === '[DONE]') {
            continue
          }

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
          latency: Date.now() - startTime
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

/**
 * 检查AI服务是否可用
 */
export function checkAvailability(): boolean {
  return !!(process.env.ZHIPUAI_API_KEY && process.env.ZHIPUAI_API_KEY.length > 0)
}
