import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Conversation, Message, SendMessageParams, ToolCallInfo, AgentMeta } from '../types/chat.js'
import {
  getConversations,
  getConversationById,
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  updateConversationTitle as updateConversationTitleApi,
  sendMessageStream,
  sendAgentMessageStream
} from '../api/chat.js'
import { useAuthStore } from './auth.js'

const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  get_cat_info: { label: '猫咪档案', icon: '🐱' },
  get_weight_trend: { label: '体重趋势', icon: '📈' },
  check_health: { label: '健康评估', icon: '✅' },
  check_vaccine: { label: '疫苗状态', icon: '💉' },
  rag_search: { label: '知识库检索', icon: '📚' },
  GET_allergy_records: { label: '过敏信息', icon: '🤧' },
  GENERATE_health_report: { label: '健康周报', icon: '📊' },
  ADD_allergy_record: { label: '记录过敏', icon: '📝' },
  default: { label: '正在处理', icon: '🧠' },
}

function getToolLabel(name: string): { label: string; icon: string } {
  const found = TOOL_LABELS[name]
  return found ?? { label: '正在处理', icon: '🧠' }
}

export const useChatStore = defineStore('chat', () => {
  const conversations = ref<Conversation[]>([])
  const currentConversation = ref<Conversation | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isStreaming = ref(false)
  const streamingContent = ref('')
  const useAgentMode = ref(true) // 默认启用 Agent 模式

  let cancelStream: (() => void) | null = null

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

  /**
   * Agent 驱动的消息发送函数（替代旧的 sendMessageStream）
   * 事件流：
   *   meta    → 工具调用准备阶段，告知前端 agent 将使用哪些工具
   *   content → 内容文本块 (流式追加)
   *   tool    → 工具完成通知 (附带结构化 output，可渲染卡片)
   *   done    → 结束事件，返回完整 citations/traceId
   *   error   → 错误
   */
  async function sendAgentMessage(params: SendMessageParams) {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      error.value = '请先登录后再发送消息'
      return
    }

    if (!params.conversationId && !currentConversation.value) {
      const newConversation = await createConversation()
      if (!newConversation) {
        error.value = '创建对话失败'
        return
      }
      params.conversationId = newConversation.id
    }

    const conversationId = params.conversationId || currentConversation.value?.id || ''
    const userMessage: Message = {
      id: 'temp-' + Date.now(),
      conversationId,
      role: 'user',
      content: params.content,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(userMessage)

    const aiMessageIndex = messages.value.length
    const startAt = Date.now()
    const initialAgentMeta: AgentMeta = {
      traceId: 'agent-' + startAt,
      toolsCalled: [],
      toolCalls: [],
      citations: [],
      confidence: 0,
      totalTimeMs: 0,
    }
    const aiMessage: Message = {
      id: 'temp-ai-' + startAt,
      conversationId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      agentMeta: initialAgentMeta,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(aiMessage)

    isStreaming.value = true
    streamingContent.value = ''

    cancelStream = sendAgentMessageStream(
      {
        conversationId: params.conversationId || currentConversation.value?.id,
        content: params.content,
        catId: params.catId,
      },
      {
        onConnected: () => {
          console.log('[Agent] SSE connected')
        },
        /**
         * meta 事件：提前告知前端将调用哪些工具，用户可感知 Agent 在思考
         */
        onMeta: (meta: any) => {
          console.log('[Agent] meta 事件:', meta)
          const messageRef = messages.value[aiMessageIndex]
          if (!messageRef) return

          const existing: AgentMeta = messageRef.agentMeta || { ...initialAgentMeta }
          if (meta.traceId) existing.traceId = meta.traceId
          if (meta.toolsCalled) existing.toolsCalled = meta.toolsCalled
          if (meta.toolCount != null) {
            if (!existing.toolCalls) existing.toolCalls = []
            if (!existing.toolsCalled) existing.toolsCalled = []
            if (existing.toolCalls.length === 0 && existing.toolsCalled.length > 0) {
              existing.toolCalls = existing.toolsCalled.map((name) => {
                const { label } = getToolLabel(name)
                const tool: ToolCallInfo = { name, label, status: 'running', startTime: Date.now() }
                return tool
              })
            }
          }
          messageRef.agentMeta = { ...existing }
        },
        /**
         * content 事件：纯文本流式内容块，追加到消息内容
         */
        onMessage: (text: string) => {
          streamingContent.value += text
          const messageRef = messages.value[aiMessageIndex]
          if (messageRef) {
            messageRef.content = streamingContent.value
          }
        },
        /**
         * tool 事件：某个工具完成调用，附带结构化结果
         */
        onTool: (toolData: any) => {
          const messageRef = messages.value[aiMessageIndex]
          if (!messageRef) return
          if (!messageRef.agentMeta) {
            messageRef.agentMeta = {
              traceId: 'agent-' + Date.now(),
              toolsCalled: [],
              toolCalls: [],
              citations: [],
            }
          }
          const meta = messageRef.agentMeta
          if (!meta.toolCalls) meta.toolCalls = []
          if (!meta.toolsCalled) meta.toolsCalled = []

          const toolName = toolData.toolName || toolData.name
          const { label } = getToolLabel(toolName)
          const existingIdx = meta.toolCalls.findIndex((t) => t.name === toolName)
          const endTime = Date.now()
          const costMs = endTime - startAt

          if (existingIdx >= 0) {
            const existing = meta.toolCalls[existingIdx]
            if (existing) {
              existing.status = toolData.status === 'error' ? 'error' : 'done'
              existing.output = toolData.output || toolData.result
              existing.endTime = endTime
              existing.costMs = existing.startTime ? endTime - existing.startTime : undefined
            }
          } else {
            const tool: ToolCallInfo = {
              name: toolName,
              label,
              status: toolData.status === 'error' ? 'error' : 'done',
              output: toolData.output || toolData.result,
              startTime: startAt,
              endTime,
              costMs,
            }
            meta.toolCalls.push(tool)
            if (!meta.toolsCalled.includes(toolName)) {
              meta.toolsCalled.push(toolName)
            }
          }
          messageRef.agentMeta = { ...meta }
        },
        /**
         * trace 事件：Agent 执行轨迹步骤（V2.0）
         */
        onTrace: (step: any) => {
          const messageRef = messages.value[aiMessageIndex]
          if (!messageRef) return
          if (!messageRef.agentMeta) {
            messageRef.agentMeta = {
              traceId: 'agent-' + Date.now(),
              toolsCalled: [],
              toolCalls: [],
              citations: [],
            }
          }
          if (!messageRef.agentMeta.executionTrace) {
            messageRef.agentMeta.executionTrace = []
          }
          messageRef.agentMeta.executionTrace.push(step)
          messageRef.agentMeta = { ...messageRef.agentMeta }
        },
        /**
         * pending_confirmation 事件：写入工具需要用户确认（V2.0）
         */
        onPendingConfirmation: (data: any) => {
          const messageRef = messages.value[aiMessageIndex]
          if (!messageRef) return
          if (!messageRef.agentMeta) {
            messageRef.agentMeta = {
              traceId: 'agent-' + Date.now(),
              toolsCalled: [],
              toolCalls: [],
              citations: [],
            }
          }
          messageRef.agentMeta.pendingConfirmation = {
            confirmationId: data.confirmationId,
            toolName: data.toolName,
            draft: data.draft || {},
            message: data.message || '',
            expiresAt: data.expiresAt || Date.now() + 5 * 60 * 1000,
          }
          messageRef.agentMeta = { ...messageRef.agentMeta }
        },
        /**
         * done 事件：完成，更新 citations 与耗时
         */
        onDone: (data: any) => {
          isStreaming.value = false
          const messageRef = messages.value[aiMessageIndex]
          if (messageRef) {
            messageRef.content = streamingContent.value
            messageRef.isStreaming = false
            if (messageRef.agentMeta) {
              messageRef.agentMeta.totalTimeMs = Date.now() - startAt
              messageRef.agentMeta.confidence = data?.confidence || 0.85
              messageRef.agentMeta.traceId = data?.traceId || messageRef.agentMeta.traceId
              if (data?.citations && data.citations.length > 0) {
                messageRef.agentMeta.citations = data.citations
              }
              // 把剩余 running 的工具状态标记 done
              if (messageRef.agentMeta.toolCalls) {
                messageRef.agentMeta.toolCalls = messageRef.agentMeta.toolCalls.map((t) =>
                  t.status === 'running' ? { ...t, status: 'done', endTime: Date.now() } : t
                )
              }
            }
          }

          if (!params.conversationId) {
            fetchConversations()
          }

          cancelStream = null
        },
        /**
         * error 事件：出错，在消息内容中插入错误提示
         */
        onError: (errorMsg: string) => {
          isStreaming.value = false
          error.value = errorMsg
          const messageRef = messages.value[aiMessageIndex]
          if (messageRef) {
            const prefix = messageRef.content.trim().length === 0 ? '' : '\n\n'
            messageRef.content = messageRef.content + prefix + '⚠️ ' + errorMsg
            messageRef.isStreaming = false
            if (messageRef.agentMeta) {
              messageRef.agentMeta.totalTimeMs = Date.now() - startAt
            }
          }
          cancelStream = null
        },
      }
    )
  }

  async function sendMessage(params: SendMessageParams) {
    if (useAgentMode.value) {
      return sendAgentMessage(params)
    }

    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      error.value = '请先登录后再发送消息'
      return
    }

    if (!params.conversationId && !currentConversation.value) {
      const newConversation = await createConversation()
      if (!newConversation) {
        error.value = '创建对话失败'
        return
      }
      params.conversationId = newConversation.id
    }

    const conversationId = params.conversationId || currentConversation.value?.id || ''
    const userMessage: Message = {
      id: 'temp-' + Date.now(),
      conversationId,
      role: 'user',
      content: params.content,
      createdAt: new Date().toISOString(),
    }
    messages.value.push(userMessage)

    const aiMessageIndex = messages.value.length
    const aiMessage: Message = {
      id: 'temp-ai-' + Date.now(),
      conversationId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }
    messages.value.push(aiMessage)

    isStreaming.value = true
    streamingContent.value = ''

    cancelStream = sendMessageStream(
      {
        conversationId: params.conversationId || currentConversation.value?.id,
        content: params.content,
        catId: params.catId,
      },
      {
        onConnected: () => {
          console.log('SSE connected')
        },
        onMessage: (content) => {
          streamingContent.value += content
          if (messages.value[aiMessageIndex]) {
            messages.value[aiMessageIndex].content = streamingContent.value
          }
        },
        onDone: (metadata) => {
          isStreaming.value = false
          if (messages.value[aiMessageIndex]) {
            messages.value[aiMessageIndex].content = streamingContent.value
            if (metadata?.citations) {
              messages.value[aiMessageIndex].citations = metadata.citations
            }
          }

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
        },
      }
    )
  }

  function stopStreaming() {
    if (cancelStream) {
      cancelStream()
      cancelStream = null
      isStreaming.value = false
    }
  }

  async function switchConversation(id: string) {
    stopStreaming()
    await fetchConversation(id)
  }

  function clearCurrentConversation() {
    currentConversation.value = null
    messages.value = []
    streamingContent.value = ''
    isStreaming.value = false
  }

  function toggleAgentMode(enabled: boolean) {
    useAgentMode.value = enabled
  }

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
    useAgentMode,

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
    sendAgentMessage,
    stopStreaming,
    switchConversation,
    clearCurrentConversation,
    toggleAgentMode,
  }
})
