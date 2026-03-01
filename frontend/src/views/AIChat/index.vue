<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../../stores/chat'
import { useMyCatStore } from '../../stores/myCat'
import { getSuggestedQuestions } from '../../api/chat'
import ChatMessage from '../../components/chat/ChatMessage.vue'
import ChatInput from '../../components/chat/ChatInput.vue'
import ConversationList from '../../components/chat/ConversationList.vue'
import CatSelector from '../../components/cat/CatSelector.vue'
import MascotCharacter from '../../components/mascot/MascotCharacter.vue'
import { storeToRefs } from 'pinia'

const router = useRouter()
const chatStore = useChatStore()
const myCatStore = useMyCatStore()
const { currentCat } = storeToRefs(myCatStore)

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
  await Promise.all([
    chatStore.fetchConversations(),
    myCatStore.fetchCats()
  ])

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
  await chatStore.sendMessage({ content, catId: currentCat.value?.id })
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

// 根据对话上下文生成智能建议
const contextualSuggestions = computed(() => {
  const suggestions: string[] = []
  const catAge = currentCat.value?.ageMonths || 0

  // 根据猫咪年龄提供不同建议
  if (catAge < 3) {
    suggestions.push('如何给小猫保暖？', '小猫多久睁眼？', '新生幼猫喂多少奶？')
  } else if (catAge < 6) {
    suggestions.push('什么时候可以打疫苗？', '小猫开始吃辅食了吗？', '如何训练用猫砂？')
  } else if (catAge < 12) {
    suggestions.push('什么时候绝育？', '如何换牙期护理？', '驱虫多久做一次？')
  } else {
    suggestions.push('成年猫吃什么好？', '如何预防肥胖？', '老年猫要注意什么？')
  }

  // 根据最近对话内容添加建议
  const lastMessages = chatStore.messages.slice(-3)
  const hasWeightQuestion = lastMessages.some(m =>
    m.content.toLowerCase().includes('体重') || m.content.toLowerCase().includes('胖')
  )
  if (hasWeightQuestion) {
    suggestions.push('如何控制体重？', '猫咪肥胖有什么危害？')
  }

  return suggestions.slice(0, 3)
})
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
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          <span>对话列表</span>
        </button>
        <div class="header-mascot-mobile">
          <MascotCharacter expression="focused" size="small" :animated="false" />
        </div>
        <div class="spacer"></div>
      </header>

      <!-- 桌面端诊室头部 -->
      <header v-if="!isMobile" class="chat-header desktop">
        <div class="header-left">
          <div class="doctor-avatar-wrapper">
            <MascotCharacter expression="focused" size="small" :animated="false" />
            <div class="doctor-status-dot"></div>
          </div>
          <div class="header-info">
            <h1 class="chat-title">喵喵医生</h1>
            <div class="status-line">
              <span class="status-badge">在线咨询中</span>
              <span class="status-pulse"></span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <!-- 宠物上下文胶囊 -->
          <div v-if="currentCat" class="pet-context-pill">
            <div class="pet-avatar-placeholder">
              <MascotCharacter expression="default" size="small" :animated="false" />
            </div>
            <span class="pet-info">{{ currentCat.name }} · {{ currentCat.ageFormatted }}</span>
          </div>
          <CatSelector />
          <button v-if="chatStore.currentConversationId" class="new-chat-btn" @click="handleNewConversation">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>新对话</span>
          </button>
        </div>
      </header>

      <!-- 宠物上下文状态条（移动端） -->
      <div v-if="currentCat && isMobile" class="pet-context-bar">
        <div class="pet-avatar-placeholder small">
          <MascotCharacter expression="default" size="small" :animated="false" />
        </div>
        <div class="pet-context-info">
          <span class="pet-name">{{ currentCat.name }}</span>
          <span class="pet-meta">{{ currentCat.ageFormatted }} · {{ currentCat.weight ? `${currentCat.weight}kg` : '' }}</span>
        </div>
        <div class="consultation-status">
          <span class="status-dot"></span>
          <span class="status-text">咨询中</span>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="messagesContainer" class="messages-container">
        <!-- 空状态 -->
        <div v-if="!chatStore.currentConversation && chatStore.messages.length === 0" class="empty-state">
          <div class="empty-mascot-wrapper">
            <MascotCharacter
              expression="focused"
              size="large"
              :animated="false"
            />
            <div class="doctor-badge">
              <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              专业顾问
            </div>
          </div>
          <h2 class="empty-title">你好，我是喵喵医生</h2>
          <p class="empty-description">我是{{ currentCat?.name || '小猫咪' }}的专属健康顾问</p>
          <div class="suggested-questions">
            <p class="suggested-title">您可以问我：</p>
            <div class="question-chips">
              <button
                v-for="question in suggestedQuestions"
                :key="question"
                class="question-chip"
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
          <div v-if="chatStore.isStreaming" class="thinking-indicator">
            <MascotCharacter expression="yawning" size="small" :animated="false" class="thinking-mascot" />
            <div class="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="thinking-text">胖虎正在思考...</span>
          </div>
        </template>
      </div>

      <!-- 输入区域 -->
      <div class="input-area">
        <!-- 智能建议芯片 -->
        <div v-if="chatStore.currentConversation && chatStore.messages.length > 0 && !chatStore.isStreaming" class="smart-suggestions">
          <button
            v-for="(suggestion, index) in contextualSuggestions"
            :key="index"
            class="suggestion-chip"
            @click="handleSend(suggestion)"
          >
            {{ suggestion }}
          </button>
        </div>
        <ChatInput
          :disabled="chatStore.isStreaming"
          :placeholder="chatStore.currentConversation ? `继续聊聊关于${currentCat?.name || '小猫咪'}的健康...` : '请输入您的问题...'"
          @send="handleSend"
        />
        <p class="disclaimer">
          <svg class="disclaimer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          喵喵医生的建议仅供参考，严重问题请及时就医
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-page {
  display: flex;
  height: 100vh;
  background-color: #FAF8F5;
}

/* ================= 诊室头部 ================= */
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 医生头像包装器 */
.doctor-avatar-wrapper {
  position: relative;
}

.doctor-status-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #22C55E;
  border: 2px solid #FFFFFF;
  border-radius: 50%;
}

/* 宠物上下文胶囊 */
.pet-context-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: #FFFFFF;
  border: 1px solid #F5F0E8;
  border-radius: 100px;
}

.pet-avatar-placeholder {
  width: 28px;
  height: 28px;
}

.pet-avatar-placeholder.small {
  width: 24px;
  height: 24px;
}

.pet-info {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

/* 宠物上下文条（移动端） */
.pet-context-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #FFFBF7 0%, #FFF9F0 100%);
  border-bottom: 1px solid #F5F0E8;
}

.pet-context-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.pet-name {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.pet-meta {
  font-size: 12px;
  color: #9CA3AF;
}

.consultation-status {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #DCFCE7;
  border-radius: 100px;
}

.status-dot {
  width: 6px;
  height: 6px;
  background: #22C55E;
  border-radius: 50%;
}

.status-text {
  font-size: 11px;
  font-weight: 600;
  color: #22C55E;
}

/* 状态行 */
.status-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-badge {
  padding: 4px 10px;
  background: #DCFCE7;
  color: #22C55E;
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
}

.status-pulse {
  width: 8px;
  height: 8px;
  background: #22C55E;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.conversation-list-panel {
  width: 280px;
  background-color: #fff;
  border-right: 1px solid #E5E7EB;
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
  border-bottom: 1px solid #E5E7EB;
  display: flex;
  align-items: center;
  gap: 16px;
}

.chat-header.mobile {
  height: 56px;
  padding: 0 16px;
}

.chat-header.desktop {
  height: 72px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-mascot-mobile {
  width: 40px;
  height: 40px;
}

.chat-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.new-chat-btn {
  padding: 8px 16px;
  border-radius: 100px;
  border: 1px solid #E5E7EB;
  background-color: #fff;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.new-chat-btn:hover {
  border-color: #F4A261;
  color: #F4A261;
  background: #FFF7ED;
}

.new-chat-btn .icon {
  width: 16px;
  height: 16px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
}

.back-icon {
  width: 20px;
  height: 20px;
}

.spacer {
  width: 60px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

/* ================= 空状态 ================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 24px;
  text-align: center;
}

.empty-mascot-wrapper {
  position: relative;
  margin-bottom: 20px;
}

.doctor-badge {
  position: absolute;
  bottom: -4px;
  right: -8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #F4A261;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 700;
  border-radius: 100px;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.3);
}

.badge-icon {
  width: 12px;
  height: 12px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #9CA3AF;
  margin: 0 0 24px 0;
}

.suggested-questions {
  max-width: 500px;
  width: 100%;
}

.suggested-title {
  font-size: 13px;
  color: #6B7280;
  margin: 0 0 16px 0;
}

.question-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.question-chip {
  padding: 10px 18px;
  border-radius: 100px;
  border: 1px solid #E5E7EB;
  background: #FFFFFF;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.question-chip:hover {
  border-color: #F4A261;
  background: #FFF7ED;
  color: #F4A261;
  transform: translateY(-2px);
}

/* ================= 思考指示器 ================= */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
}

.thinking-mascot {
  width: 28px;
  height: 28px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #F4A261;
  animation: bounce 1.4s infinite;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-8px);
  }
}

.thinking-text {
  font-size: 13px;
  color: #9CA3AF;
}

/* ================= 输入区域 ================= */
.input-area {
  background-color: #fff;
  border-top: 1px solid #E5E7EB;
  padding: 16px 24px 20px;
}

/* 智能建议芯片 */
.smart-suggestions {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 0 12px 0;
  scrollbar-width: none;
}

.smart-suggestions::-webkit-scrollbar {
  display: none;
}

.suggestion-chip {
  white-space: nowrap;
  padding: 8px 16px;
  border-radius: 100px;
  border: 1px solid #F5F0E8;
  background: #FFFBF7;
  color: #F4A261;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.suggestion-chip:hover {
  background: #FFF7ED;
  border-color: #F4A261;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.15);
}

.disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #9CA3AF;
  text-align: center;
  margin: 12px 0 0 0;
}

.disclaimer-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .question-chips {
    flex-direction: column;
  }

  .question-chip {
    width: 100%;
    text-align: center;
  }

  .messages-container {
    padding: 16px 0;
  }

  .input-area {
    padding: 12px 16px 16px;
  }
}
</style>
