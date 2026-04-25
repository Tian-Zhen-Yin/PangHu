<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import MascotCharacter from '../mascot/MascotCharacter.vue'
import type { Message, Citation } from '../../types/chat'

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

// 判断是否为AI消息
const isAssistant = computed(() => props.message.role === 'assistant')

// 解析Markdown内容
const renderedContent = computed(() => {
  const content = props.message.markdownContent || props.message.content
  return marked(content)
})

// 解析引用来源（从 metadata JSON）
const citations = computed<Citation[]>(() => {
  if (props.message.citations) {
    return props.message.citations
  }
  if (props.message.metadata) {
    try {
      const parsed = JSON.parse(props.message.metadata)
      return parsed.citations || []
    } catch {
      return []
    }
  }
  return []
})

// 是否显示引用来源
const showCitations = computed(() => citations.value.length > 0)

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
  <div :class="['chat-message', isAssistant ? 'assistant' : 'user']">
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
        <div v-if="isAssistant" class="markdown-content cream-bubble" v-html="renderedContent"></div>
        <div v-else class="plain-content user-bubble">{{ message.content }}</div>
      </div>

      <!-- 引用来源 -->
      <div v-if="showCitations && !props.isStreaming" class="message-citations">
        <div class="citations-header">
          <svg class="citations-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332-.477 4.5-1.747"/>
          </svg>
          参考来源
        </div>
        <div class="citations-list">
          <button
            v-for="citation in citations"
            :key="citation.guideId"
            @click="emit('clickGuide', citation.guideId)"
            class="citation-item"
          >
            <span class="citation-title">{{ citation.title }}</span>
            <span class="citation-score">{{ Math.round(citation.similarity * 100) }}%相关</span>
          </button>
        </div>
      </div>

      <div class="message-footer">
        <span class="message-time">{{ timeDisplay }}</span>
        <button v-if="isAssistant" class="action-button" @click="copyMessage">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path v-if="!isCopied" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4a2 2 0 012 2v0"/>
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <span>{{ isCopied ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  display: flex;
  gap: 10px;
  padding: 12px 24px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-message.user {
  flex-direction: row-reverse;
}

.chat-message.user .message-content-wrapper {
  align-items: flex-end;
}

/* 消息头像 */
.message-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: var(--radius-full);
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, var(--color-primary-medium) 0%, var(--color-primary-gradient) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #78350F;
  border: var(--color-primary-medium);
}

.user-avatar svg {
  width: 16px;
  height: 16px;
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

/* 消息内容气泡 */
.message-content {
  line-height: 1.6;
}

/* AI 气泡 - 医疗建议卡风格 */
.cream-bubble {
  padding: 16px 20px;
  background: #FFFFFF;
  border: none;
  border-left: 3px solid var(--color-primary);
  border-radius: 2px 16px 16px 16px;
  box-shadow: 0 2px 12px rgba(90, 74, 66, 0.08);
  color: var(--color-text-regular);
  position: relative;
}

/* 用户气泡 - 品牌色调 */
.user-bubble {
  padding: 12px 18px;
  background: var(--color-primary-light);
  border: none;
  border-radius: 20px 4px 20px 20px;
  box-shadow: 0 2px 8px rgba(255, 138, 76, 0.1);
  color: var(--color-text-primary);
}

/* Markdown 内容样式 */
.markdown-content {
  font-size: 14px;
}

.markdown-content :deep(p) {
  margin: 0 0 8px 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin: 12px 0 8px 0;
  font-weight: 600;
  color: var(--color-text-primary);
}

.markdown-content :deep(h1) {
  font-size: 16px;
}

.markdown-content :deep(h2) {
  font-size: 15px;
}

.markdown-content :deep(h3) {
  font-size: 14px;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-content :deep(li) {
  margin: 4px 0;
}

.markdown-content :deep(code) {
  background-color: var(--color-bg-cream);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  color: var(--color-primary);
}

.markdown-content :deep(pre) {
  background-color: var(--color-bg-warm);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
  border: 1px solid #F5F0E8;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: var(--color-text-primary);
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid var(--color-primary-medium);
  padding-left: 12px;
  margin: 8px 0;
  color: var(--color-text-regular);
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: var(--color-primary);
}

.plain-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
}

/* 引用来源样式 - 标签化 */
.message-citations {
  margin-top: 8px;
  padding: 10px 14px;
  background: #FFFFFF;
  border-radius: 10px;
  border: none;
  box-shadow: 0 1px 6px rgba(90, 74, 66, 0.06);
}

.citations-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}

.citations-icon {
  width: 12px;
  height: 12px;
  color: var(--color-primary);
}

.citations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.citation-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: var(--color-primary-light);
  border: none;
  border-radius: 100px;
  font-size: 12px;
  color: var(--color-primary-dark);
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.citation-item:hover {
  background: var(--color-primary);
  color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(255, 138, 76, 0.25);
}

.citation-title {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.citation-score {
  font-size: 10px;
  opacity: 0.7;
  font-weight: 600;
}

/* 消息底部 */
.message-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  padding: 0 4px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.chat-message:hover .message-footer {
  opacity: 1;
}

.message-time {
  font-size: 11px;
  color: var(--color-text-placeholder);
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-text-placeholder);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
  opacity: 0;
}

.chat-message:hover .action-button {
  opacity: 1;
}

.action-button:hover {
  background-color: var(--color-bg-cream);
  color: var(--color-primary);
}

.action-button .icon {
  width: 14px;
  height: 14px;
}

.action-button span {
  display: none;
}

@media (max-width: 767px) {
  .chat-message {
    padding: 12px 16px;
  }

  .message-content-wrapper {
    max-width: 80%;
  }

  .cream-bubble,
  .user-bubble {
    padding: 12px 14px;
    font-size: 13px;
  }
}
</style>
