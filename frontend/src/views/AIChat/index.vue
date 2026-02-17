<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../../stores/chat'
import { getSuggestedQuestions } from '../../api/chat'
import ChatMessage from '../../components/chat/ChatMessage.vue'
import ChatInput from '../../components/chat/ChatInput.vue'
import ConversationList from '../../components/chat/ConversationList.vue'

const router = useRouter()
const chatStore = useChatStore()

// UI状态
const showConversationList = ref(true)
const messagesContainer = ref<HTMLElement | null>(null)
const suggestedQuestions = ref<string[]>([])

// 检查是否为移动端
const isMobile = ref(window.innerWidth < 768)
window.addEventListener('resize', () => {
  isMobile.value = window.innerWidth < 768
})

// 监听错误状态
watch(() => chatStore.error, (newError) => {
  if (newError) {
    ElMessage.error(newError)
  }
})

// 初始化
onMounted(async () => {
  await chatStore.fetchConversations()

  // 获取预设问题
  try {
    const response = await getSuggestedQuestions()
    if (response.success) {
      suggestedQuestions.value = response.data
    }
  } catch (err) {
    console.error('Failed to load suggested questions:', err)
  }
})

// 监听消息变化，自动滚动到底部
watch(() => chatStore.messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 滚动到底部
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 发送消息
async function handleSend(content: string) {
  await chatStore.sendMessage({ content })
}

// 点击预设问题
function handleSuggestedQuestion(question: string) {
  handleSend(question)
}

// 新建对话
async function handleNewConversation() {
  await chatStore.createConversation()
  if (isMobile.value) {
    showConversationList.value = false
  }
}

// 选择对话
async function handleSelectConversation(id: string) {
  await chatStore.switchConversation(id)
  if (isMobile.value) {
    showConversationList.value = false
  }
}

// 删除对话
async function handleDeleteConversation(id: string) {
  const confirmed = confirm('确定要删除这个对话吗？')
  if (confirmed) {
    await chatStore.deleteConversation(id)
  }
}

// 重命名对话
async function handleRenameConversation(id: string, newTitle: string) {
  await chatStore.updateConversationTitle(id, newTitle)
}

// 返回对话列表（移动端）
function handleBackToList() {
  showConversationList.value = true
}

// 跳转到指南详情
function navigateToGuide(guideId: string) {
  router.push(`/guides/${guideId}`)
}
</script>

<template>
  <div class="ai-chat-page">
    <!-- 移动端对话列表 -->
    <div v-if="isMobile && showConversationList" class="conversation-list-panel mobile">
      <ConversationList
        :conversations="chatStore.conversations"
        :current-id="chatStore.currentConversationId"
        :loading="chatStore.loading"
        @select="handleSelectConversation"
        @new="handleNewConversation"
        @delete="handleDeleteConversation"
        @rename="handleRenameConversation"
      />
    </div>

    <!-- 桌面端对话列表 -->
    <div v-if="!isMobile" class="conversation-list-panel desktop">
      <ConversationList
        :conversations="chatStore.conversations"
        :current-id="chatStore.currentConversationId"
        :loading="chatStore.loading"
        @select="handleSelectConversation"
        @new="handleNewConversation"
        @delete="handleDeleteConversation"
        @rename="handleRenameConversation"
      />
    </div>

    <!-- 聊天区域 -->
    <div class="chat-area">
      <!-- 移动端返回按钮 -->
      <header v-if="isMobile && !showConversationList" class="chat-header mobile">
        <button class="back-button" @click="handleBackToList">
          <span class="icon">←</span>
          <span>对话列表</span>
        </button>
        <h1 class="chat-title">喵喵医生</h1>
        <div class="spacer"></div>
      </header>

      <!-- 桌面端标题 -->
      <header v-if="!isMobile" class="chat-header desktop">
        <div class="header-left">
          <div class="ai-avatar">
            <span>🐱</span>
          </div>
          <div class="header-info">
            <h1 class="chat-title">喵喵医生</h1>
            <p class="chat-subtitle">您的专业猫咪医疗顾问</p>
          </div>
        </div>
        <button v-if="chatStore.currentConversationId" class="new-chat-btn" @click="handleNewConversation">
          <span class="icon">+</span>
          <span>新对话</span>
        </button>
      </header>

      <!-- 消息列表 -->
      <div ref="messagesContainer" class="messages-container">
        <!-- 空状态 -->
        <div v-if="!chatStore.currentConversation && chatStore.messages.length === 0" class="empty-state">
          <div class="empty-icon">🐱</div>
          <h2>你好，我是喵喵医生</h2>
          <p>我是您的专业猫咪医疗顾问和养护专家</p>
          <div class="suggested-questions">
            <p class="suggested-title">您可以问我：</p>
            <div class="question-list">
              <button
                v-for="question in suggestedQuestions"
                :key="question"
                class="question-button"
                @click="handleSuggestedQuestion(question)"
              >
                {{ question }}
              </button>
            </div>
          </div>
        </div>

        <!-- 消息 -->
        <template v-else>
          <ChatMessage
            v-for="message in chatStore.messages"
            :key="message.id"
            :message="message"
            :is-streaming="chatStore.isStreaming && message.role === 'assistant' && message.id.includes('temp-ai')"
            @click-guide="navigateToGuide"
          />

          <!-- 流式输出指示器 -->
          <div v-if="chatStore.isStreaming" class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </template>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <ChatInput
          :disabled="chatStore.isStreaming"
          :placeholder="chatStore.currentConversation ? '继续对话...' : '请输入您的问题...'"
          @send="handleSend"
        />
        <p class="disclaimer">喵喵医生的建议仅供参考，严重问题请及时就医</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-page {
  display: flex;
  height: 100vh;
  background-color: #f5f7fa;
}

.conversation-list-panel {
  width: 280px;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.conversation-list-panel.mobile {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  width: 100%;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: 16px 24px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 16px;
}

.chat-header.mobile {
  height: 60px;
  padding: 0 16px;
}

.chat-header.desktop {
  height: 70px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.chat-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.chat-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.new-chat-btn {
  margin-left: auto;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  border-color: #667eea;
  color: #667eea;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 0;
  border: none;
  background: none;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
}

.spacer {
  width: 60px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 24px;
  color: #303133;
  margin: 0 0 8px 0;
}

.empty-state > p {
  font-size: 14px;
  color: #909399;
  margin: 0 0 32px 0;
}

.suggested-questions {
  max-width: 600px;
  width: 100%;
}

.suggested-title {
  font-size: 14px;
  color: #606266;
  margin: 0 0 16px 0;
}

.question-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.question-button {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.question-button:hover {
  border-color: #667eea;
  color: #667eea;
  background-color: #f0f4ff;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 16px 24px;
  align-items: center;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #dcdfe6;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}

.input-area {
  background-color: #fff;
  border-top: 1px solid #e4e7ed;
  padding: 16px 24px;
}

.disclaimer {
  font-size: 12px;
  color: #c0c4cc;
  text-align: center;
  margin: 8px 0 0 0;
}

@media (max-width: 767px) {
  .question-list {
    grid-template-columns: 1fr;
  }

  .messages-container {
    padding: 16px 0;
  }

  .input-area {
    padding: 12px 16px;
  }
}
</style>
