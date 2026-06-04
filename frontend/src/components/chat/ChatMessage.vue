<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import MascotCharacter from '../mascot/MascotCharacter.vue'
import type { Message, Citation } from '../../types/chat.js'

interface Props {
  message: Message
  isStreaming?: boolean
}

interface Emits {
  (e: 'clickGuide', guideId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isCopied = ref(false)
const isHovering = ref(false)

// 判断是否为AI消息
const isAssistant = computed(() => props.message.role === 'assistant')

// 解析Markdown内容
const renderedContent = computed(() => {
  const content = props.message.markdownContent || props.message.content
  return marked(content)
})

// 提取参考来源 - 从内容中解析
const referenceSources = computed(() => {
  const content = props.message.content || ''
  const sources: string[] = []

  // 匹配 "参考来源：《xxx》" 格式
  const refMatch = content.match(/参考来源：《(.+?)》/g)
  if (refMatch) {
    refMatch.forEach(match => {
      const titleMatch = match.match(/《(.+?)》/)
      if (titleMatch) {
        sources.push(titleMatch[1])
      }
    })
  }

  return sources
})

// 是否显示参考来源
const showReferences = computed(() => referenceSources.value.length > 0 && !props.isStreaming)

// 复制消息内容
async function copyMessage() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// 获取时间显示
const timeDisplay = computed(() => {
  const date = new Date(props.message.createdAt)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
})
</script>

<template>
  <div
    :class="['chat-message', isAssistant ? 'assistant' : 'user']"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <div class="message-avatar">
      <MascotCharacter v-if="isAssistant" expression="focused" size="tiny" :animated="false" />
      <div v-else class="user-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </div>
    </div>

    <div class="message-content-wrapper">
      <div class="message-content">
        <!-- AI 消息 - 温暖的奶油卡片 -->
        <div v-if="isAssistant" class="ai-bubble">
          <div class="bubble-decoration">
            <span class="paw-print">🐾</span>
          </div>
          <div class="markdown-content" v-html="renderedContent"></div>
        </div>

        <!-- 用户消息 - 温暖的桃色卡片 -->
        <div v-else class="user-bubble">
          <div class="plain-content">{{ message.content }}</div>
        </div>
      </div>

      <!-- 优雅的参考来源显示 -->
      <div v-if="showReferences" class="references-section">
        <div class="references-header">
          <div class="book-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332-.477 4.5-1.747"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 9h-4.5L15 6l-1.5 3h-4.5"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 15h4.5"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.5 15h4.5"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13"/>
          </svg>
          </div>
          <span class="references-title">知识参考</span>
        </div>

        <div class="sources-grid">
          <div
            v-for="(source, index) in referenceSources"
            :key="index"
            class="source-card"
            :style="{ animationDelay: `${index * 100}ms` }"
          >
            <div class="source-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 012 2v14a2 2 0 01-2 2h-2.5"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v12m0-6l-3 3m3-3l3 3"/>
              </svg>
            </div>
            <div class="source-content">
              <div class="source-title">{{ source }}</div>
              <div class="source-indicator">
                <span class="dot"></span>
                <span class="label">已引用</span>
              </div>
            </div>
            <div class="source-decoration">
              <span class="deco-line"></span>
              <span class="deco-paw">🐾</span>
            </div>
          </div>
        </div>
      </div>

      <div class="message-footer">
        <span class="message-time">{{ timeDisplay }}</span>
        <button v-if="isAssistant" class="action-button" @click="copyMessage">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path v-if="!isCopied" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4a2 2 0 012 2v0"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span class="action-text">{{ isCopied ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ================= 基础消息样式 ================= */
.chat-message {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  animation: messageSlide 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes messageSlide {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.chat-message.user {
  flex-direction: row-reverse;
}

.chat-message.user .message-content-wrapper {
  align-items: flex-end;
}

/* ================= 消息头像 ================= */
.message-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar {
  width: 36px;
  height: 36px;
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFECC8 0%, #FFE5B4 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B7355;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.25);
}

.user-avatar svg {
  width: 18px;
  height: 18px;
}

/* ================= 消息内容 ================= */
.message-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

.message-content {
  line-height: 1.7;
}

/* ================= AI 气泡 - 奶油色系 ================= */
.ai-bubble {
  padding: 18px 22px;
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  border: none;
  border-radius: 16px 16px 4px 16px;
  box-shadow:
    0 4px 20px rgba(255, 236, 179, 0.06),
    0 0 0 1px rgba(255, 236, 179, 0.04);
  position: relative;
  overflow: hidden;
}

.bubble-decoration {
  position: absolute;
  top: 8px;
  right: 12px;
  opacity: 0.15;
}

.paw-print {
  font-size: 32px;
  filter: blur(0.5px);
  transform: rotate(-15deg);
}

/* ================= 用户气泡 ================= */
.user-bubble {
  padding: 14px 20px;
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border: none;
  border-radius: 20px 4px 20px 20px;
  box-shadow: 0 4px 16px rgba(255, 236, 179, 0.12);
  position: relative;
}

.user-bubble::before {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
}

/* ================= Markdown 内容样式 ================= */
.markdown-content {
  font-size: 15px;
  color: #5D4E37;
}

.markdown-content :deep(p) {
  margin: 0 0 10px 0;
  line-height: 1.7;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin: 16px 0 10px 0;
  font-weight: 700;
  color: #8B4513;
}

.markdown-content :deep(h1) {
  font-size: 17px;
}

.markdown-content :deep(h2) {
  font-size: 16px;
}

.markdown-content :deep(h3) {
  font-size: 15px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 10px 0;
  padding-left: 24px;
}

.markdown-content :deep(li) {
  margin: 5px 0;
}

.markdown-content :deep(code) {
  /* 奶油色背景 */
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  color: #8B7355;
  font-weight: 500;
}

.markdown-content :deep(pre) {
  /* 奶油色背景 */
  background: #FFFBF0;
  padding: 14px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 10px 0;
  border: 1px solid #FFF5DC;
}

.markdown-content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #8B7355;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid #D4A574;
  padding-left: 14px;
  margin: 10px 0;
  color: #BC8F6F;
  font-style: italic;
}

.markdown-content :deep(strong) {
  font-weight: 700;
  color: #A67B5B;
}

.plain-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 15px;
  color: #5D4E37;
  line-height: 1.7;
}

/* ================= 参考来源 - 优雅书签卡片 ================= */
.references-section {
  margin-top: 12px;
  animation: referencesFade 0.5s ease 0.2s;
}

@keyframes referencesFade {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.references-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.book-icon {
  width: 16px;
  height: 16px;
  /* 奶油色调 */
  color: #D4A574;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-icon svg {
  width: 100%;
  height: 100%;
}

.references-title {
  font-size: 12px;
  font-weight: 700;
  color: #BC8F6F;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.sources-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  border: 1px solid #FFF5DC;
  border-left: 3px solid #D4A574;
  border-radius: 8px 12px 8px 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  animation: sourceCardSlide 0.4s ease both;
}

@keyframes sourceCardSlide {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.source-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  /* 奶油色渐变 */
  background: linear-gradient(90deg, #D4A574 0%, #E0C9A8 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.source-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 236, 179, 0.12);
  border-color: #FFECC8;
}

.source-card:hover::before {
  transform: scaleX(1);
}

.source-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border-radius: 8px;
  color: #8B7355;
}

.source-icon svg {
  width: 16px;
  height: 16px;
}

.source-content {
  flex: 1;
  min-width: 0;
}

.source-title {
  font-size: 14px;
  font-weight: 600;
  color: #8B7355;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.dot {
  width: 6px;
  height: 6px;
  background: #10B981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.label {
  font-size: 10px;
  color: #10B981;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.source-decoration {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.source-card:hover .source-decoration {
  opacity: 1;
  transform: translateX(3px);
}

.deco-line {
  width: 20px;
  height: 1px;
  /* 奶油色渐变 */
  background: linear-gradient(90deg, transparent 0%, #D4A574 50%, transparent 100%);
}

.deco-paw {
  font-size: 12px;
}

/* ================= 消息底部 ================= */
.message-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chat-message:hover .message-footer {
  opacity: 1;
}

.message-time {
  font-size: 11px;
  color: #AAA195;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: #AAA195;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-button:hover {
  /* 奶油色渐变背景 */
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  color: #8B7355;
  transform: translateY(-1px);
}

.action-button .icon {
  width: 14px;
  height: 14px;
}

.action-text {
  font-size: 11px;
  font-weight: 600;
}

/* ================= 移动端优化 ================= */
@media (max-width: 767px) {
  .chat-message {
    padding: 12px 16px;
  }

  .message-content-wrapper {
    max-width: 80%;
  }

  .ai-bubble,
  .user-bubble {
    padding: 14px 16px;
    font-size: 14px;
  }

  .source-card {
    padding: 10px 12px;
    gap: 8px;
  }

  .source-icon {
    width: 24px;
    height: 24px;
  }

  .source-icon svg {
    width: 14px;
    height: 14px;
  }

  .source-title {
    font-size: 13px;
  }

  .source-decoration {
    display: none;
  }
}
</style>
