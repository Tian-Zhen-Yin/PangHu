<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
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
const isConversationListHidden = ref(false) // 桌面端对话列表隐藏状态
const messagesContainer = ref<HTMLElement | null>(null)
const suggestedQuestions = ref<string[]>([])

// 检查是否为移动端
const isMobile = ref(window.innerWidth < 768)
function handleResize() {
  isMobile.value = window.innerWidth < 768
}
window.addEventListener('resize', handleResize)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
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

    <!-- 桌面端对话列表容器 -->
    <div v-if="!isMobile" class="conversation-list-wrapper" :class="{ 'collapsed': isConversationListHidden }">
      <Transition name="slide-fade">
        <div v-if="!isConversationListHidden" class="conversation-list-panel desktop">
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
      </Transition>

      <!-- 对话列表切换按钮 -->
      <button
        class="conversation-toggle-btn"
        :class="{ 'collapsed': isConversationListHidden }"
        @click="isConversationListHidden = !isConversationListHidden"
        :title="isConversationListHidden ? '显示对话列表' : '隐藏对话列表'"
      >
        <svg v-if="isConversationListHidden" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
        </svg>
      </button>
    </div>

    <!-- 聊天区域 -->
    <div class="chat-area" :class="{ 'full-width': isConversationListHidden }">
      <!-- 移动端头部 -->
      <header v-if="isMobile && !showConversationList" class="chat-header mobile">
        <!-- 返回按钮 -->
        <button class="back-button" @click="handleBackToList">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <!-- 中间：医生信息 + 宠物信息 -->
        <div class="header-center">
          <div class="doctor-info-compact">
            <div class="doctor-avatar-mini">
              <MascotCharacter expression="focused" size="tiny" :animated="false" />
            </div>
            <div class="info-text">
              <span class="doctor-name">喵喵医生</span>
              <span class="doctor-role">宠物健康助手</span>
            </div>
          </div>
        </div>

        <!-- 右侧：猫咪切换按钮 -->
        <button v-if="currentCat" class="cat-switch-btn" @click="router.push('/my-cats')">
          <MascotCharacter expression="default" size="tiny" :animated="false" />
        </button>
      </header>

      <!-- 桌面端诊室头部 -->
      <header v-if="!isMobile" class="chat-header desktop">
        <div class="doctor-header">
          <MascotCharacter expression="focused" size="small" :animated="false" />
          <div class="doctor-info">
            <span class="doctor-name">喵喵医生</span>
            <div class="doctor-status">
              <span class="status-dot"></span>
              <span class="status-text">在线咨询中</span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <CatSelector />
        </div>
      </header>

      <!-- 消息列表 -->
      <div ref="messagesContainer" class="messages-container">
        <!-- 空状态 -->
        <div v-if="!chatStore.currentConversation && chatStore.messages.length === 0" class="empty-state">
          <!-- 医生介绍卡片 -->
          <div class="doctor-card">
            <div class="doctor-avatar-large">
              <MascotCharacter
                expression="focused"
                size="large"
                :animated="true"
              />
              <div class="doctor-badge">专业顾问</div>
            </div>
            <h2 class="empty-title">你好，我是喵喵医生</h2>
            <p class="empty-description">我是 {{ currentCat?.name || '小猫咪' }} 的专属健康顾问</p>
            <p class="empty-hint">选择下方问题开始咨询，或直接输入您的问题</p>
          </div>

          <!-- 快速入口问题 -->
          <div class="quick-questions">
            <div class="section-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <span>您可以问我</span>
            </div>
            <div class="question-grid">
              <button
                v-for="question in suggestedQuestions"
                :key="question"
                class="question-card"
                @click="handleSuggestedQuestion(question)"
              >
                <span class="question-icon">💬</span>
                <span class="question-text">{{ question }}</span>
                <svg class="question-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 功能引导 -->
          <div class="feature-guides">
            <div class="guide-item">
              <div class="guide-icon chart-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17V9"/>
                  <path d="M13 17V5"/>
                  <path d="M8 17v-3"/>
                </svg>
              </div>
              <div class="guide-text">
                <span class="guide-title">成长记录分析</span>
                <span class="guide-desc">基于猫咪成长数据提供专业建议</span>
              </div>
            </div>
            <div class="guide-item">
              <div class="guide-icon book-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <div class="guide-text">
                <span class="guide-title">养猫知识库</span>
                <span class="guide-desc">引用权威来源，确保建议可靠</span>
              </div>
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
            <MascotCharacter expression="yawning" size="tiny" :animated="false" class="thinking-mascot" />
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
          :placeholder="chatStore.currentConversation ? `描述症状，例如：不吃饭、呕吐、精神差…` : '可以问：猫咪不吃饭怎么办？'"
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
  position: fixed;
  inset: 0;
  z-index: 1;
  background-color: var(--color-bg-page);
}

/* ================= 诊室头部 ================= */
.doctor-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.doctor-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.doctor-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.doctor-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doctor-status .status-dot {
  width: 8px;
  height: 8px;
  background-color: #10B981;
  border-radius: 50%;
}

.doctor-status .status-text {
  font-size: 12px;
  color: var(--color-text-regular);
  font-weight: 500;
  line-height: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-left: auto;
}

/* 对话列表容器 */
.conversation-list-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 280px;
  overflow: visible;
  transition: width 0.3s ease;
}

.conversation-list-wrapper.collapsed {
  width: 0;
  overflow: visible;
}

.conversation-list-panel {
  width: 280px;
  min-width: 240px;
  max-width: 400px;
  height: 100%;
  overflow-y: auto;
  background: linear-gradient(180deg, var(--color-bg-card) 0%, var(--color-bg-block) 100%);
  border-right: 1px solid var(--color-border);
  flex-shrink: 0;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
}

/* 隐藏/显示过渡动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-100%);
  width: 0;
  min-width: 0;
  border: none;
}

/* 聊天区域全宽模式 */
.chat-area.full-width {
  margin-left: 0;
}

/* 基础图标按钮样式 */
.icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.icon-btn svg {
  width: 18px;
  height: 18px;
}

/* 折叠按钮使用 icon-btn 基础样式 */

/* 对话列表切换按钮 */
.conversation-toggle-btn {
  position: absolute;
  bottom: 20px;
  right: -12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-left: none;
  border-radius: 0 50% 50% 50%;
  cursor: pointer;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);
  transition: right 0.3s ease;
}

/* 列表隐藏时，按钮定位 */
.conversation-toggle-btn.collapsed {
  right: auto;
  left: -16px;
  border-left: 1px solid var(--color-border);
  border-right: none;
  border-radius: 50% 50% 50% 0;
}

.conversation-toggle-btn:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.conversation-toggle-btn svg {
  width: 16px;
  height: 16px;
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
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  padding: var(--space-md) var(--space-xl);
  background: linear-gradient(180deg, var(--color-bg-card) 0%, var(--color-bg-block) 100%);
  border-bottom: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  position: relative;
  flex-shrink: 0;
}

.chat-header::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-primary);
}

.chat-header.mobile {
  height: 56px;
  padding: 0 var(--space-md);
}

.chat-header.mobile::before {
  width: 3px;
}

.chat-header.desktop {
  height: 64px;
  padding: 0 var(--space-xl);
  justify-content: space-between;
}

.new-chat-btn {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-full);
  border: 2px solid var(--color-border);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.new-chat-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 138, 76, 0.2);
}

.new-chat-btn .icon {
  width: 16px;
  height: 16px;
}

.back-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.back-button:hover {
  color: var(--color-primary);
}

.back-icon {
  width: 20px;
  height: 20px;
}

/* 移动端头部中心区域 */
.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.doctor-info-compact {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.doctor-avatar-mini {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  border: 2px solid var(--color-primary);
  overflow: hidden;
}

.info-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.doctor-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.doctor-role {
  font-size: 11px;
  color: var(--color-text-placeholder);
  line-height: 1.2;
}

.pet-name-mini {
  font-size: 11px;
  color: var(--color-text-secondary);
  line-height: 1.2;
}

.cat-switch-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  cursor: pointer;
  transition: all 0.2s ease;
}

.cat-switch-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: var(--space-lg) 0;
  background: linear-gradient(180deg, var(--color-bg-page) 0%, var(--color-bg-page) 50%, var(--color-primary-light) 100%);
}

/* ================= 空状态 ================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3xl) var(--space-lg);
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.doctor-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-2xl);
}

.doctor-avatar-large {
  position: relative;
  margin-bottom: var(--space-lg);
  max-width: 120px;
  max-height: 120px;
  overflow: hidden;
  border-radius: 50%;
}

.doctor-badge {
  position: absolute;
  bottom: -4px;
  right: -8px;
  padding: var(--space-xs) var(--space-md);
  background: var(--color-primary);
  color: var(--color-text-white);
  font-size: 12px;
  font-weight: 700;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 12px rgba(255, 138, 76, 0.3);
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.empty-description {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-xs) 0;
}

.empty-hint {
  font-size: 14px;
  color: var(--color-text-regular);
  margin: 0 0 var(--space-md) 0;
}

/* 快速问题 */
.quick-questions {
  width: 100%;
  margin-bottom: var(--space-2xl);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
  width: 100%;
  justify-content: flex-start;
}

.section-title svg {
  color: var(--color-primary);
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-sm);
  width: 100%;
}

.question-card {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: linear-gradient(135deg, #FFFFFF 0%, var(--color-bg-page) 100%);
  border: 2px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.question-card:hover {
  border-color: var(--color-primary-medium);
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 138, 76, 0.2);
}

.question-icon {
  font-size: 20px;
}

.question-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.question-arrow {
  color: var(--color-text-placeholder);
  transition: all 0.3s ease;
}

.question-card:hover .question-arrow {
  color: var(--color-primary);
  transform: translateX(4px);
}

/* 功能引导 */
.feature-guides {
  display: flex;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: linear-gradient(135deg, #FFFFFF 0%, var(--color-bg-page) 100%);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.guide-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.guide-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-bg-cream) 0%, var(--color-primary-medium) 100%);
  border-radius: 10px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.guide-icon svg {
  width: 18px;
  height: 18px;
}

.guide-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.guide-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.guide-desc {
  font-size: 12px;
  color: var(--color-text-regular);
}

/* ================= 思考指示器 ================= */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
}

.thinking-mascot {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.thinking-dots {
  display: flex;
  gap: var(--space-xs);
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
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
    transform: translateY(-10px);
  }
}

.thinking-text {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ================= 输入区域 ================= */
.input-area {
  background-color: var(--color-bg-card);
  border-top: 2px solid var(--color-border);
  padding: var(--space-md) var(--space-lg) var(--space-lg);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.02);
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  flex-shrink: 0;
}

/* 智能建议芯片 - 卡片按钮风格 */
.smart-suggestions {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding: 0 0 var(--space-md) 0;
  scrollbar-width: none;
}

.smart-suggestions::-webkit-scrollbar {
  display: none;
}

.suggestion-chip {
  white-space: nowrap;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  background: #FFFFFF;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.suggestion-chip:hover {
  border-color: var(--color-primary-medium);
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
  box-shadow: 0 2px 8px rgba(255, 138, 76, 0.15);
  transform: translateY(-1px);
}

.disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
  margin: var(--space-sm) 0 0 0;
}

.disclaimer-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--color-warning);
}

@media (max-width: 767px) {
  /* 快速问题网格移动端优化 */
  .question-grid {
    grid-template-columns: 1fr;
  }

  .question-card {
    padding: var(--space-sm) var(--space-md);
  }

  /* 功能引导移动端优化 */
  .feature-guides {
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .guide-item {
    gap: var(--space-sm);
  }

  .guide-icon {
    width: 28px;
    height: 28px;
  }

  .guide-icon svg {
    width: 16px;
    height: 16px;
  }

  .messages-container {
    padding: var(--space-md) 0;
  }

  .input-area {
    padding: var(--space-sm) var(--space-md);
    padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  }

  .smart-suggestions {
    padding: 0 0 var(--space-sm) 0;
  }

  .suggestion-chip {
    padding: 6px 12px;
    font-size: 12px;
  }

  .empty-state {
    padding: var(--space-xl) var(--space-md);
  }

  .empty-title {
    font-size: 18px;
  }

  .empty-description {
    font-size: 13px;
  }

  .empty-hint {
    font-size: 12px;
  }
}
</style>
