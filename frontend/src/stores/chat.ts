import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Conversation, Message, SendMessageParams } from '../types/chat'
import {
  getConversations,
  getConversationById,
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  updateConversationTitle as updateConversationTitleApi,
  sendMessageStream
} from '../api/chat'
import { useAuthStore } from './auth'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const conversations = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isStreaming = ref(false)
  const streamingContent = ref('')

  // 取消流式请求的函数
  let cancelStream: (() => void) | null = null

  // 获取所有对话
  async function fetchConversations() {
    loading.value = true
    error.value = null
    try {
      const response = await getConversations()
      if (response.success) {
        conversations.value = response.data
      }
    } catch (err: any) {
      error.value = err.message || '获取对话列表失败'
    } finally {
      loading.value = false
    }
  }

  // 获取单个对话详情
  async function fetchConversation(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await getConversationById(id)
      if (response.success) {
        currentConversation.value = response.data
        messages.value = response.data.messages || []
      }
    } catch (err: any) {
      error.value = err.message || '获取对话详情失败'
    } finally {
      loading.value = false
    }
  }

  // 创建新对话
  async function createConversation(title?: string): Promise<Conversation | null> {
    loading.value = true
    error.value = null
    try {
      const params = title ? { title } : undefined
      const response = await createConversationApi(params)
      if (response.success) {
        conversations.value.unshift(response.data)
        currentConversation.value = response.data
        messages.value = []
        return response.data
      }
      error.value = response.message || '创建对话失败'
      return null
    } catch (err: any) {
      error.value = err.message || '创建对话失败'
      return null
    } finally {
      loading.value = false
    }
  }

  // 删除对话
  async function deleteConversation(id: string) {
    try {
      const response = await deleteConversationApi(id)
      if (response.success) {
        conversations.value = conversations.value.filter(c => c.id !== id)
        if (currentConversation.value?.id === id) {
          currentConversation.value = null
          messages.value = []
        }
        return true
      }
      return false
    } catch (err: any) {
      console.error('删除对话失败:', err)
      return false
    }
  }

  // 更新对话标题
  async function updateConversationTitle(id: string, title: string) {
    try {
      const response = await updateConversationTitleApi(id, title)
      if (response.success) {
        const index = conversations.value.findIndex(c => c.id === id)
        if (index !== -1) {
          const conversation = conversations.value[index]
          if (conversation) {
            conversation.title = title
          }
        }
        if (currentConversation.value?.id === id) {
          currentConversation.value.title = title
        }
        return true
      }
      return false
    } catch (err: any) {
      console.error('更新标题失败:', err)
      return false
    }
  }

  // 发送消息（流式）
  async function sendMessage(params: SendMessageParams) {
    // 检查用户是否已登录
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      error.value = '请先登录后再发送消息'
      return
    }

    // 如果没有指定对话，创建新对话
    if (!params.conversationId && !currentConversation.value) {
      const newConversation = await createConversation()
      if (!newConversation) {
        error.value = '创建对话失败'
        return
      }
      params.conversationId = newConversation.id
    }

    // 添加用户消息到列表
    const conversationId = params.conversationId || currentConversation.value?.id || ''
    const userMessage: Message = {
      id: 'temp-' + Date.now(),
      conversationId,
      role: 'user',
      content: params.content,
      createdAt: new Date().toISOString()
    }
    messages.value.push(userMessage)

    // 准备AI消息占位符 - 使用响应式引用
    const aiMessageIndex = messages.value.length
    const aiMessage: Message = {
      id: 'temp-ai-' + Date.now(),
      conversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    }
    messages.value.push(aiMessage)

    // 开始流式响应
    isStreaming.value = true
    streamingContent.value = ''

    cancelStream = sendMessageStream(
      {
        conversationId: params.conversationId || currentConversation.value?.id,
        content: params.content
      },
      {
        onConnected: () => {
          console.log('SSE connected')
        },
        onMessage: (content) => {
          streamingContent.value += content
          // 使用数组索引直接修改以确保Vue响应式更新
          if (messages.value[aiMessageIndex]) {
            messages.value[aiMessageIndex].content = streamingContent.value
          }
        },
        onDone: () => {
          isStreaming.value = false
          if (messages.value[aiMessageIndex]) {
            messages.value[aiMessageIndex].content = streamingContent.value
          }

          // 更新对话列表（如果有新对话）
          if (!params.conversationId) {
            fetchConversations()
          }

          cancelStream = null
        },
        onError: (errorMsg) => {
          isStreaming.value = false
          error.value = errorMsg
          if (messages.value[aiMessageIndex]) {
            messages.value[aiMessageIndex].content = '抱歉，发生了错误：' + errorMsg
          }
          cancelStream = null
        }
      }
    )
  }

  // 停止流式响应
  function stopStreaming() {
    if (cancelStream) {
      cancelStream()
      cancelStream = null
      isStreaming.value = false
    }
  }

  // 切换当前对话
  async function switchConversation(id: string) {
    stopStreaming()
    await fetchConversation(id)
  }

  // 清空当前对话
  function clearCurrentConversation() {
    currentConversation.value = null
    messages.value = []
    streamingContent.value = ''
    isStreaming.value = false
  }

  // 计算属性
  const hasConversations = computed(() => conversations.value.length > 0)
  const currentConversationId = computed(() => currentConversation.value?.id || null)
  const messageCount = computed(() => messages.value.length)

  return {
    // 状态
    conversations,
    currentConversation,
    messages,
    loading,
    error,
    isStreaming,
    streamingContent,

    // 计算属性
    hasConversations,
    currentConversationId,
    messageCount,

    // 方法
    fetchConversations,
    fetchConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    sendMessage,
    stopStreaming,
    switchConversation,
    clearCurrentConversation
  }
})
