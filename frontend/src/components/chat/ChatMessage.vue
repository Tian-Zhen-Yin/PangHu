<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
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
      <span v-if="isAssistant">🐱</span>
      <span v-else>👤</span>
    </div>
    <div class="message-content-wrapper">
      <div class="message-header">
        <span class="message-role">{{ isAssistant ? '喵喵医生' : '您' }}</span>
        <span class="message-time">{{ timeDisplay }}</span>
      </div>
      <div class="message-content">
        <div v-if="isAssistant" class="markdown-content" v-html="renderedContent"></div>
        <div v-else class="plain-content">{{ message.content }}</div>
      </div>

      <!-- 引用来源 -->
      <div v-if="showCitations && !props.isStreaming" class="message-citations">
        <div class="citations-header">📚 参考来源</div>
        <div class="citations-list">
          <button
            v-for="citation in citations"
            :key="citation.guideId"
            @click="emit('clickGuide', citation.guideId)"
            class="citation-item"
          >
            <span class="citation-icon">📖</span>
            <span class="citation-title">{{ citation.title }}</span>
            <span class="citation-score">{{ Math.round(citation.similarity * 100) }}%</span>
          </button>
        </div>
      </div>

      <div v-if="isAssistant" class="message-actions">
        <button class="action-button" @click="copyMessage">
          <span class="icon">{{ isCopied ? '✓' : '📋' }}</span>
          <span>{{ isCopied ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-message {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
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

.chat-message.user .message-header {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.chat-message.assistant .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.chat-message.user .message-avatar {
  background-color: #e4e7ed;
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 80%;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-role {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.message-time {
  font-size: 12px;
  color: #909399;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
}

.chat-message.assistant .message-content {
  background-color: #fff;
  border: 1px solid #e4e7ed;
  border-top-left-radius: 4px;
}

.chat-message.user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-top-right-radius: 4px;
}

.markdown-content {
  color: #303133;
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
}

.markdown-content :deep(h1) {
  font-size: 18px;
}

.markdown-content :deep(h2) {
  font-size: 16px;
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
  background-color: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
}

.markdown-content :deep(pre) {
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid #667eea;
  padding-left: 12px;
  margin: 8px 0;
  color: #606266;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: #667eea;
}

.plain-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: none;
  background: none;
  color: #909399;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #f5f7fa;
  color: #606266;
}

.action-button .icon {
  font-size: 14px;
}

/* 引用来源样式 */
.message-citations {
  margin-top: 8px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.citations-header {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.citations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.citation-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
}

.citation-item:hover {
  background: #fff7ed;
  border-color: #fdba74;
  color: #ea580c;
}

.citation-icon {
  font-size: 11px;
}

.citation-title {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.citation-score {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 500;
}

@media (max-width: 767px) {
  .chat-message {
    padding: 12px 16px;
  }

  .message-content-wrapper {
    max-width: 85%;
  }
}
</style>
