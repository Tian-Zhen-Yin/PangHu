<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useChatStore } from '../../stores/chat.js'
import { useMyCatStore } from '../../stores/myCat.js'
import { getSuggestedQuestions } from '../../api/chat.js'
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
// 默认隐藏对话列表：从导航入口（如首页喵喵医生 FAB）进入时直接进入聊天界面，
// 移动端可通过返回按钮、桌面端可通过侧栏切换按钮重新展开列表
const showConversationList = ref(false)
const isConversationListHidden = ref(true) // 桌面端对话列表隐藏状态
const messagesContainer = ref<HTMLElement | null>(null)
const suggestedQuestions = ref<string[]>([])
const isUserScrolling = ref(false) // 跟踪用户是否在手动滚动
const showScrollToBottom = ref(false) // 是否显示滚动到底部按钮

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

// 监听消息变化，智能滚动
watch(() => chatStore.messages, () => {
  nextTick(() => {
    // 只有在用户没有手动滚动时才自动滚动
    if (!isUserScrolling.value) {
      scrollToBottom()
    }
  })
}, { deep: true })

// 监听滚动事件，判断用户是否在手动滚动
function handleScroll() {
  if (messagesContainer.value) {
    const container = messagesContainer.value
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100

    // 如果用户滚动到底部附近，重置手动滚动状态
    if (isAtBottom) {
      isUserScrolling.value = false
      showScrollToBottom.value = false
    } else if (container.scrollTop > 0 && chatStore.messages.length > 0) {
      // 用户滚动到其他位置，且有消息存在
      isUserScrolling.value = true
      showScrollToBottom.value = true
    } else {
      showScrollToBottom.value = false
    }
  }
}

// 滚动到底部
function scrollToBottom(smooth = true) {
  if (messagesContainer.value) {
    const container = messagesContainer.value
    if (smooth) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    } else {
      container.scrollTop = container.scrollHeight
    }
  }
}

// 点击滚动到底部按钮
function handleScrollToBottomClick() {
  isUserScrolling.value = false
  showScrollToBottom.value = false
  scrollToBottom(true)
}

// 发送消息
async function handleSend(content: string) {
  // 发送消息时重置滚动状态，确保滚动到底部
  isUserScrolling.value = false
  try {
    await chatStore.sendMessage({ content, catId: currentCat.value?.id })
    // 确保发送后滚动到底部
    nextTick(() => {
      scrollToBottom(true)
    })
  } catch (error: any) {
    console.error('Failed to send message:', error)
    ElMessage.error(error?.message || '发送失败，请稍后重试')
  }
}

// 点击预设问题
function handleSuggestedQuestion(question: string) {
  // 点击预设问题时重置滚动状态
  isUserScrolling.value = false
  handleSend(question)
}

// 新建对话
async function handleNewConversation() {
  // 重置滚动状态
  isUserScrolling.value = false
  await chatStore.createConversation()
  if (isMobile.value) {
    showConversationList.value = false
  }
}

// 选择对话
async function handleSelectConversation(id: string) {
  // 重置滚动状态
  isUserScrolling.value = false
  await chatStore.switchConversation(id)
  if (isMobile.value) {
    showConversationList.value = false
  }
}

// 删除对话
async function handleDeleteConversation(id: string) {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个对话吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      }
    )
    await chatStore.deleteConversation(id)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Failed to delete conversation:', error)
    }
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
      <!-- 关闭按钮：返回聊天页 -->
      <button class="mobile-list-close" @click="showConversationList = false" title="返回对话">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
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
        <!-- 历史会话按钮（打开对话列表） -->
        <button class="back-button" @click="handleBackToList" title="历史会话">
          <svg class="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h10"/>
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

        <!-- 右侧：首页和猫咪切换按钮 -->
        <div class="header-right-mobile">
          <button class="home-button-mobile" @click="router.push('/')" title="返回首页">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </button>
          <button v-if="currentCat" class="cat-switch-btn" @click="router.push('/my-cats')">
            <MascotCharacter expression="default" size="tiny" :animated="false" />
          </button>
        </div>
      </header>

      <!-- 桌面端诊室头部 -->
      <header v-if="!isMobile" class="chat-header desktop">
        <div class="doctor-header">
          <MascotCharacter expression="focused" size="small" :animated="false" />
          <div class="doctor-info">
            <span class="doctor-name">喵喵医生</span>
            <div class="doctor-status">
              <span class="status-dot"></span>
              <span class="status-text">{{ chatStore.useAgentMode ? '智能顾问模式' : '普通模式' }}</span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <button class="home-button" @click="router.push('/')" title="返回首页">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
            </svg>
          </button>
          <!-- Agent 模式切换 -->
          <button
            :class="['agent-mode-toggle', chatStore.useAgentMode ? 'active' : '']"
            @click="chatStore.toggleAgentMode(!chatStore.useAgentMode)"
            :title="chatStore.useAgentMode ? '智能顾问（工具调用）已开启·点击切换为普通模式' : '普通模式·点击切换为智能顾问（工具调用）模式'"
          >
            <span class="agent-mode-icon">{{ chatStore.useAgentMode ? '🧠' : '💬' }}</span>
            <span class="agent-mode-label">{{ chatStore.useAgentMode ? '智能模式' : '普通模式' }}</span>
          </button>
          <CatSelector />
        </div>
      </header>

      <!-- 消息列表 -->
      <div
        ref="messagesContainer"
        class="messages-container"
        @scroll="handleScroll"
      >
        <!-- 空状态：消息为空时显示（不论是否有 currentConversation，新建对话也能看到首屏） -->
        <div v-if="chatStore.messages.length === 0" class="empty-state">
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

        <!-- 滚动到底部按钮 -->
        <button
          v-if="showScrollToBottom && chatStore.messages.length > 0"
          @click="handleScrollToBottomClick"
          class="scroll-to-bottom-btn"
          title="滚动到底部"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
          </svg>
        </button>
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
          :placeholder="chatStore.messages.length > 0 ? '继续提问…' : '输入您的问题…'"
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
  position: fixed;
  inset: 0;
  /* 移除 z-index 让其自然堆叠 */
  /* 奶油色系背景 - 柔和奶白渐变 */
  background:
    linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 50%, #FFF5DC 100%);
  overflow: hidden;
  box-sizing: border-box;
  /* 使用Grid布局确保各区域固定 - 使用两列避免重叠 */
  display: grid;
  grid-template-rows: 1fr;
  grid-template-columns: auto 1fr;
}

/* 添加奶油色微纹理背景 */
.ai-chat-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(255, 228, 181, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 236, 179, 0.02) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(255, 248, 220, 0.02) 0%, transparent 50%);
  pointer-events: none;
}

/* ================= 诊室头部 ================= */
.doctor-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  backdrop-filter: blur(10px);
  /* 奶油色背景 */
  background: rgba(255, 251, 240, 0.85);
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
  /* Grid布局下占据第一列，全高 */
  grid-row: 1;
  grid-column: 1;
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

/* 对话列表切换按钮 - 奶油色风格 */
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
  /* 奶油色背景 */
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  color: #8B7355;
  border: 1px solid #FFF5DC;
  border-left: none;
  border-radius: 0 50% 50% 50%;
  cursor: pointer;
  box-shadow: 2px 0 8px rgba(255, 236, 179, 0.12);
  transition: all 0.3s ease;
}

/* 列表隐藏时，按钮定位 */
.conversation-toggle-btn.collapsed {
  right: auto;
  left: -16px;
  border-left: 1px solid #FFF5DC;
  border-right: none;
  border-radius: 50% 50% 50% 0;
}

.conversation-toggle-btn:hover {
  background: linear-gradient(135deg, #FFF8E7 0%, #FFF5DC 100%);
  color: #BC8F6F;
  box-shadow: 2px 0 12px rgba(255, 236, 179, 0.18);
  transform: scale(1.05);
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

/* 移动端对话列表的关闭按钮（默认隐藏列表后，从聊天页打开列表时需要一个返回入口） */
.mobile-list-close {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  right: 16px;
  z-index: 110;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #FFF5DC;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  color: #8B7355;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.18);
  transition: all 0.2s ease;
}

.mobile-list-close:hover {
  background: linear-gradient(135deg, #FFF8E7 0%, #FFF5DC 100%);
  color: #BC8F6F;
  transform: scale(1.05);
}

.mobile-list-close svg {
  width: 18px;
  height: 18px;
}

.chat-area {
  min-width: 0;
  /* Grid布局下占据第二列，全高 */
  grid-row: 1;
  grid-column: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  /* 确保聊天区域填充剩余空间 */
  height: 100%;
  min-height: 0;
  /* 确保父级overflow: hidden生效 */
  contain: layout;
}

.chat-header {
  padding: var(--space-md) var(--space-xl);
  /* 奶油色半透明背景 */
  background: rgba(255, 251, 240, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(255, 228, 181, 0.15);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  box-shadow: 0 4px 16px rgba(255, 236, 179, 0.06);
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

.chat-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 228, 181, 0.15) 50%, transparent 100%);
}

.chat-header.mobile {
  height: 56px;
  padding: 0 var(--space-md);
}

.chat-header.mobile::before {
  width: 3px;
}

/* 移动端隐藏"宠物健康助手"副标题：窄屏不需要次要信息，避免 4 元素挤一行 */
.chat-header.mobile .doctor-role {
  display: none;
}

.chat-header.desktop {
  height: 64px;
  padding: 0 var(--space-xl);
  justify-content: space-between;
}

.new-chat-btn {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-full);
  /* 奶油色边框和背景 */
  border: 2px solid #FFF5DC;
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  color: #8B7355;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.08);
}

.new-chat-btn:hover {
  border-color: #FFECC8;
  color: #BC8F6F;
  background: linear-gradient(135deg, #FFF8E7 0%, #FFF5DC 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.15);
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
  color: #8B7355;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: var(--radius-md);
}

.back-button:hover {
  color: #BC8F6F;
  background: rgba(255, 245, 220, 0.5);
}

.back-icon {
  width: 20px;
  height: 20px;
}

/* 移动端右侧按钮组 */
.header-right-mobile {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

/* 首页按钮 - 桌面端 */
.home-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #FFF5DC;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  color: #8B7355;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.08);
}

.home-button:hover {
  border-color: #FFECC8;
  background: linear-gradient(135deg, #FFF8E7 0%, #FFF5DC 100%);
  color: #BC8F6F;
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.12);
  transform: translateY(-1px);
}

.home-button svg {
  width: 18px;
  height: 18px;
}

/* 首页按钮 - 移动端 */
.home-button-mobile {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #FFF5DC;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  color: #8B7355;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.08);
}

.home-button-mobile:hover {
  border-color: #FFECC8;
  background: linear-gradient(135deg, #FFF8E7 0%, #FFF5DC 100%);
  color: #BC8F6F;
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.12);
}

.home-button-mobile svg {
  width: 16px;
  height: 16px;
}

/* Agent 模式切换按钮 - 奶油色系 */
.agent-mode-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px solid #FFF5DC;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  color: #8B7355;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.08);
}

.agent-mode-toggle:hover {
  border-color: #FFE5B4;
  background: linear-gradient(135deg, #FFF8E7 0%, #FFF5DC 100%);
  color: #BC8F6F;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.15);
}

.agent-mode-toggle.active {
  background: linear-gradient(135deg, #FFE5B4 0%, #FFDAB9 100%);
  border-color: #F4A261;
  color: #5D4E37;
  box-shadow: 0 4px 14px rgba(244, 162, 97, 0.25);
}

.agent-mode-toggle.active:hover {
  background: linear-gradient(135deg, #FFDAB9 0%, #FFCF9D 100%);
  box-shadow: 0 6px 16px rgba(244, 162, 97, 0.3);
}

.agent-mode-icon {
  font-size: 15px;
  line-height: 1;
}

.agent-mode-label {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
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
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border-radius: var(--radius-full);
  border: 2px solid #FFE5B4;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.12);
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
  /* 奶油色边框和背景 */
  border: 1px solid #FFF5DC;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.08);
}

.cat-switch-btn:hover {
  border-color: #FFECC8;
  background: linear-gradient(135deg, #FFF8E7 0%, #FFF5DC 100%);
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.12);
  transform: translateY(-1px);
}

.messages-container {
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
  padding: var(--space-lg) 0;
  /* 奶油色渐变背景 */
  background:
    linear-gradient(180deg,
      rgba(255, 251, 240, 0) 0%,
      rgba(255, 251, 240, 0.3) 50%,
      rgba(255, 248, 220, 0.5) 100%
    );
  /* 平滑滚动 */
  scroll-behavior: smooth;
  /* 确保容器独立滚动，不影响其他元素 */
  position: relative;
  /* 防止内容溢出 */
  overflow-anchor: none;
  /* 使用关键字auto让浏览器自动计算高度 */
  align-self: stretch;
}

/* 美化滚动条 - 奶油色系 */
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: rgba(255, 251, 240, 0.5);
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb {
  /* 奶油色渐变 */
  background: linear-gradient(180deg, #FFE5B4 0%, #FFF0DB 100%);
  border-radius: 4px;
  border: 2px solid rgba(255, 251, 240, 0.5);
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #FFDAB9 0%, #FFE5B4 100%);
}

/* ================= 滚动到底部按钮 ================= */
.scroll-to-bottom-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  /* 奶油色背景 */
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border: 2px solid #FFE5B4;
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B7355;
  transition: all 0.3s ease;
  z-index: 5;
  animation: scrollButtonFade 0.3s ease;
}

@keyframes scrollButtonFade {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.scroll-to-bottom-btn:hover {
  background: linear-gradient(135deg, #FFECC8 0%, #FFE5B4 100%);
  box-shadow: 0 6px 16px rgba(255, 236, 179, 0.3);
  transform: scale(1.1);
}

.scroll-to-bottom-btn svg {
  width: 20px;
  height: 20px;
  transform: rotate(90deg);
}

/* ================= 空状态 - 温暖治愈系 ================= */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3xl) var(--space-lg);
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
  animation: emptyFadeIn 0.6s ease-out;
}

@keyframes emptyFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.doctor-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-2xl);
  position: relative;
}

.doctor-card::before {
  content: '🐾';
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  opacity: 0.3;
  animation: pawFloat 3s ease-in-out infinite;
}

@keyframes pawFloat {
  0%, 100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(-10px);
  }
}

.doctor-avatar-large {
  position: relative;
  margin-bottom: var(--space-lg);
  max-width: 120px;
  max-height: 120px;
  overflow: hidden;
  border-radius: 50%;
  /* 奶油色光环效果 */
  box-shadow:
    0 0 0 4px rgba(255, 228, 181, 0.15),
    0 0 0 8px rgba(255, 236, 179, 0.08),
    0 8px 24px rgba(255, 248, 220, 0.2);
  animation: avatarPulse 4s ease-in-out infinite;
}

@keyframes avatarPulse {
  0%, 100% {
    box-shadow:
      0 0 0 4px rgba(255, 228, 181, 0.15),
      0 0 0 8px rgba(255, 236, 179, 0.08),
      0 8px 24px rgba(255, 248, 220, 0.2);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(255, 228, 181, 0.2),
      0 0 0 12px rgba(255, 236, 179, 0.12),
      0 12px 32px rgba(255, 248, 220, 0.25);
  }
}

.doctor-badge {
  position: absolute;
  bottom: -4px;
  right: -8px;
  padding: var(--space-xs) var(--space-md);
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFE5B4 0%, #FFDAB9 100%);
  color: #8B7355;
  font-size: 12px;
  font-weight: 700;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.25);
  border: 2px solid #FFFBF0;
}

.badge-icon {
  width: 14px;
  height: 14px;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  /* 奶油棕 */
  color: #8B7355;
  margin: 0 0 var(--space-sm) 0;
  text-align: center;
}

.empty-description {
  font-size: 16px;
  /* 奶油色调 */
  color: #BC8F6F;
  margin: 0 0 var(--space-xs) 0;
  text-align: center;
  font-weight: 500;
}

/* 快速问题 - 温暖卡片风格 */
.quick-questions {
  width: 100%;
  margin-bottom: var(--space-2xl);
  animation: quickQuestionsSlide 0.5s ease-out 0.2s both;
}

@keyframes quickQuestionsSlide {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: 14px;
  font-weight: 600;
  /* 奶油棕色 */
  color: #BC8F6F;
  margin-bottom: var(--space-md);
  width: 100%;
  justify-content: flex-start;
}

.section-title svg {
  color: #D4A574;
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
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  border: 2px solid #FFF5DC;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  text-align: left;
  position: relative;
  overflow: hidden;
}

.question-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  /* 奶油色渐变 */
  background: linear-gradient(90deg, #FFE5B4 0%, #FFF0DB 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.question-card:hover {
  border-color: #FFECC8;
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 236, 179, 0.12);
}

.question-card:hover::before {
  transform: scaleX(1);
}

.question-icon {
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(255, 236, 179, 0.1));
}

.question-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #8B7355;
}

.question-arrow {
  color: #D4C4A8;
  transition: all 0.3s ease;
}

.question-card:hover .question-arrow {
  color: #D4A574;
  transform: translateX(4px);
}

/* ================= 思考指示器 - 温暖动画 ================= */
.thinking-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl);
  animation: thinkingSlide 0.4s ease-out;
}

@keyframes thinkingSlide {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinking-mascot {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border-radius: var(--radius-full);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.15);
  animation: mascotBounce 2s ease-in-out infinite;
}

@keyframes mascotBounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.thinking-dots {
  display: flex;
  gap: var(--space-xs);
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  /* 奶油色 */
  background: linear-gradient(135deg, #FFE5B4 0%, #FFDAB9 100%);
  animation: bounce 1.4s infinite;
  box-shadow: 0 2px 4px rgba(255, 236, 179, 0.2);
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
  color: #BC8F6F;
  font-weight: 500;
}

/* ================= 输入区域 - 奶油色系 ================= */
.input-area {
  /* 奶油色半透明背景 */
  background: rgba(255, 251, 240, 0.95);
  border-top: 2px solid #FFF5DC;
  padding: var(--space-md) var(--space-lg) var(--space-lg);
  box-shadow: 0 -4px 20px rgba(255, 236, 179, 0.06);
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  /* 关键：使用 flex 布局自然保持在底部 */
  flex-shrink: 0;
  flex-grow: 0;
  position: relative;
}

.input-area::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  /* 奶油色渐变 */
  background: linear-gradient(90deg, transparent 0%, #FFE5B4 50%, transparent 100%);
  border-radius: 0 0 3px 3px;
}

/* 智能建议芯片 - 奶油色卡片风格 */
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
  /* 奶油色边框和背景 */
  border: 1px solid #FFF5DC;
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  color: #8B7355;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.06);
  position: relative;
  overflow: hidden;
}

.suggestion-chip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  /* 奶油色渐变 */
  background: linear-gradient(90deg, #FFE5B4 0%, #FFF0DB 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.suggestion-chip:hover {
  border-color: #FFECC8;
  background: linear-gradient(135deg, #FFFBF0 0%, #FFF8E7 100%);
  color: #8B7355;
  box-shadow: 0 4px 12px rgba(255, 236, 179, 0.12);
  transform: translateY(-2px);
}

.suggestion-chip:hover::before {
  transform: scaleX(1);
}

.disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  font-size: 12px;
  color: #D4C4A8;
  text-align: center;
  margin: var(--space-sm) 0 0 0;
}

.disclaimer-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: #D4A574;
}

@media (max-width: 767px) {
  /* 快速问题网格移动端优化 */
  .question-grid {
    grid-template-columns: 1fr;
  }

  .question-card {
    padding: var(--space-sm) var(--space-md);
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

  /* 移动端头像优化 */
  .doctor-avatar-large {
    max-width: 100px;
    max-height: 100px;
  }
}
</style>
