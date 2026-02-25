import api from './index'
import type { ApiResponse } from '../types/common'
import type {
  Conversation,
  SendMessageParams,
  SendMessageResponse,
  CreateConversationParams
} from '../types/chat'

/**
 * 获取用户的所有对话
 */
export function getConversations(): Promise<ApiResponse<Conversation[]>> {
  return api.get('/chat/conversations')
}

/**
 * 获取单个对话详情（包含所有消息）
 */
export function getConversationById(id: string): Promise<ApiResponse<Conversation>> {
  return api.get(`/chat/conversations/${id}`)
}

/**
 * 创建新对话
 */
export function createConversation(params?: CreateConversationParams): Promise<ApiResponse<Conversation>> {
  return api.post('/chat/conversations', params || {})
}

/**
 * 删除对话
 */
export function deleteConversation(id: string): Promise<ApiResponse<null>> {
  return api.delete(`/chat/conversations/${id}`)
}

/**
 * 更新对话标题
 */
export function updateConversationTitle(id: string, title: string): Promise<ApiResponse<{ title: string }>> {
  return api.patch(`/chat/conversations/${id}`, { title })
}

/**
 * 发送消息（普通请求）
 */
export function sendMessage(params: SendMessageParams): Promise<ApiResponse<SendMessageResponse>> {
  return api.post('/chat/messages', params)
}

/**
 * 获取预设问题列表
 */
export function getSuggestedQuestions(): Promise<ApiResponse<string[]>> {
  return api.get('/chat/suggested-questions')
}

/**
 * SSE流式发送消息
 * 返回一个EventSource对象，可以监听流式响应
 */
export function sendMessageStream(
  params: SendMessageParams,
  callbacks: {
    onMessage?: (content: string, isFirst: boolean) => void
    onDone?: (metadata?: {
      tokensUsed?: number
      model?: string
      referencedGuides?: string[]
      citations?: Array<{ guideId: string; title: string; similarity: number }>
    }) => void
    onError?: (error: string) => void
    onConnected?: () => void
  }
): () => void {
  const token = localStorage.getItem('auth_token')
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

  // 创建EventSource（使用fetch模拟SSE，因为需要自定义headers）
  let controller: AbortController | null = new AbortController()

  // 使用fetch进行流式请求
  console.log('[Chat API] 发送SSE请求:', { baseURL, hasToken: !!token, params })

  fetch(`${baseURL}/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify(params),
    signal: controller.signal
  }).then(async response => {
    console.log('[Chat API] 收到响应:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    callbacks.onConnected?.()

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 处理SSE格式
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // 保留最后一个不完整的行

      let currentEvent: string | null = null
      let currentData = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.substring(7)
          console.log('[Chat API] 收到事件:', currentEvent)
        } else if (line.startsWith('data: ')) {
          currentData = line.substring(6)
          console.log('[Chat API] 收到数据:', currentData)

          if (currentEvent) {
            // 'connected' 事件是纯文本，不需要解析JSON
            if (currentEvent === 'connected') {
              console.log('[Chat API] SSE连接已建立')
              callbacks.onConnected?.()
            } else {
              // 其他事件需要解析JSON
              try {
                const data = JSON.parse(currentData)
                console.log('[Chat API] 解析后数据:', data)

                switch (currentEvent) {
                  case 'message_start':
                  case 'message_chunk':
                    callbacks.onMessage?.(data.content, currentEvent === 'message_start')
                    break
                  case 'message_done':
                    callbacks.onDone?.(data)
                    break
                  case 'error':
                    callbacks.onError?.(data.error)
                    break
                }
              } catch (e) {
                console.error('[Chat API] JSON解析失败:', e, 'data:', currentData)
              }
            }

            currentEvent = null
            currentData = ''
          }
        }
      }
    }
  }).catch(error => {
    console.error('[Chat API] 请求失败:', error)
    if (error.name !== 'AbortError') {
      callbacks.onError?.(error.message || '网络错误')
    }
  })

  // 返回取消函数
  return () => {
    controller?.abort()
    controller = null
  }
}
