<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import MascotCharacter from '../mascot/MascotCharacter.vue'
import AgentCardRenderer from './AgentCardRenderer.vue'
import ExecutionTracePanel from './ExecutionTracePanel.vue'
import AllergyConfirmCard from './AllergyConfirmCard.vue'
import RecordConfirmCard from './RecordConfirmCard.vue'
import { getImageUrl } from '../../utils/format.js'
import type { Message, ToolCallInfo } from '../../types/chat.js'
import api from '../../api/index.js'

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

const isAssistant = computed(() => props.message.role === 'assistant')

// 判断是否为 Agent 驱动的消息（带有 tool call 元数据）
const isAgentMessage = computed(
  () =>
    isAssistant.value &&
    props.message.agentMeta &&
    props.message.agentMeta.toolCalls &&
    props.message.agentMeta.toolCalls.length > 0,
)

// P4: 待办切换处理
async function handleTodoToggle(payload: { todoId: string; completed: boolean }) {
  try {
    await api.post('/chat/todo/toggle', payload)
  } catch (err: any) {
    console.error('[TodoToggle] failed:', err.message)
  }
}

const renderedContent = computed(() => {
  const content = props.message.markdownContent || props.message.content
  return marked(content)
})

const referenceSources = computed(() => {
  const content = props.message.content || ''
  const sources: string[] = []
  const refMatch = content.match(/参考来源：《(.+?)》/g)
  if (refMatch) {
    refMatch.forEach((match) => {
      const titleMatch = match.match(/《(.+?)》/)
      const title = titleMatch ? titleMatch[1] : null
      if (title) sources.push(title)
    })
  }
  // 从 Agent citations 合并
  if (props.message.agentMeta?.citations) {
    for (const title of props.message.agentMeta.citations) {
      if (title && !sources.includes(title)) sources.push(title)
    }
  }
  return sources
})

const showReferences = computed(() => referenceSources.value.length > 0 && !props.isStreaming)

const toolCount = computed(() => props.message.agentMeta?.toolCalls?.length || 0)
const toolDoneCount = computed(() => props.message.agentMeta?.toolCalls?.filter((t) => t.status === 'done').length || 0)

function toolIcon(name: string): string {
  switch (name) {
    case 'get_cat_info':
      return '🐱'
    case 'get_weight_trend':
      return '📈'
    case 'check_health':
      return '✅'
    case 'check_vaccine':
      return '💉'
    case 'rag_search':
      return '📚'
    case 'GET_allergy_records':
      return '🤧'
    case 'GENERATE_health_report':
      return '📊'
    case 'ADD_allergy_record':
      return '📝'
    case 'RECOMMEND_play':
      return '🎾'
    default:
      return '🧠'
  }
}

function toolStatusText(tool: ToolCallInfo): string {
  if (tool.status === 'running') return '正在调用...'
  if (tool.status === 'error') return '调用失败'
  if (tool.costMs != null) return `完成 · ${tool.costMs} ms`
  return '完成'
}

function resolveAttachmentUrl(url: string): string {
  if (!url || url.startsWith('blob:')) return url
  return getImageUrl(url)
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    isCopied.value = true
    setTimeout(() => { isCopied.value = false }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    </div>

    <div class="message-content-wrapper">
      <div class="message-content">
        <!-- ================= Agent 驱动消息（带工具调用 + 卡片） ================= -->
        <div v-if="isAgentMessage" class="agent-bubble">
          <!-- V2.0 执行轨迹折叠面板（默认折叠，位于工具进度条上方） -->
          <ExecutionTracePanel
            v-if="message.agentMeta?.executionTrace && message.agentMeta.executionTrace.length > 0"
            :trace-steps="message.agentMeta.executionTrace"
          />

          <!-- 工具调用进度条 -->
          <div class="agent-tool-stack">
            <div
              v-for="(tool, idx) in message.agentMeta!.toolCalls!"
              :key="tool.name"
              :class="['agent-tool-item', tool.status]"
              :style="{ animationDelay: `${idx * 80}ms` }"
            >
              <div class="agent-tool-icon">
                <span v-if="tool.status === 'running'" class="tool-spinner"></span>
                <span v-else-if="tool.status === 'error'" class="tool-error-icon">✕</span>
                <span v-else class="tool-done-icon">✓</span>
              </div>
              <div class="agent-tool-body">
                <div class="agent-tool-head">
                  <span class="agent-tool-emoji">{{ toolIcon(tool.name) }}</span>
                  <span class="agent-tool-name">{{ tool.label || tool.name }}</span>
                  <span class="agent-tool-status">{{ toolStatusText(tool) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 结构化数据卡片（由 AgentCardRenderer 按 toolName 分发到独立卡片组件） -->
          <AgentCardRenderer
            v-if="toolDoneCount === toolCount"
            :tool-calls="message.agentMeta!.toolCalls!"
            @todo="handleTodoToggle"
          />

          <!-- V2.0 过敏录入确认卡片（写入工具需要用户确认时渲染） -->
          <AllergyConfirmCard
            v-if="message.agentMeta?.pendingConfirmation && message.agentMeta.pendingConfirmation.toolName === 'ADD_allergy_record'"
            :confirmation="message.agentMeta.pendingConfirmation"
            @resolved="message.agentMeta!.pendingConfirmation = undefined"
          />

          <!-- 通用录入确认卡片（成长记录/疫苗/体重） -->
          <RecordConfirmCard
            v-else-if="message.agentMeta?.pendingConfirmation"
            :confirmation="message.agentMeta.pendingConfirmation"
            @resolved="message.agentMeta!.pendingConfirmation = undefined"
          />

          <!-- 流式文本内容 -->
          <div v-if="message.content && message.content.trim()" class="markdown-content" v-html="renderedContent"></div>

          <!-- 流式中：打字指示器 -->
          <div v-if="isStreaming" class="streaming-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <!-- ================= 普通 AI 消息 ================= -->
        <div v-else-if="isAssistant" class="ai-bubble">
          <div class="bubble-decoration">
            <span class="paw-print">🐾</span>
          </div>
          <div class="markdown-content" v-html="renderedContent"></div>
        </div>

        <!-- ================= 用户消息 ================= -->
        <div v-else class="user-bubble">
          <div v-if="message.attachments && message.attachments.length > 0" class="user-images">
            <img
              v-for="(img, idx) in message.attachments"
              :key="idx"
              :src="resolveAttachmentUrl(img)"
              class="user-image"
              alt="上传的图片"
            />
          </div>
          <div class="plain-content">{{ message.content }}</div>
        </div>
      </div>

      <!-- 参考来源 -->
      <div v-if="showReferences" class="references-section">
        <div class="references-header">
          <div class="book-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332-.477 4.5-1.747" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 9h-4.5L15 6l-1.5 3h-4.5" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16.5 15h4.5" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6.5 15h4.5" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13" />
            </svg>
          </div>
          <span class="references-title">知识参考</span>
        </div>

        <div class="sources-grid">
          <div v-for="(source, idx) in referenceSources" :key="idx" class="source-card" :style="{ animationDelay: `${idx * 100}ms` }">
            <div class="source-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 012 2v14a2 2 0 01-2 2h-2.5" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v12m0-6l-3 3m3-3l3 3" />
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
        <span v-if="isAgentMessage && !isStreaming && message.agentMeta?.totalTimeMs" class="message-time">耗时 {{ message.agentMeta.totalTimeMs }} ms</span>
        <button v-if="isAssistant" class="action-button" @click="copyMessage">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path v-if="!isCopied" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4a2 2 0 012 2v0" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="action-text">{{ isCopied ? '已复制' : '复制' }}</span>
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
  animation: messageSlide 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes messageSlide {
  from { opacity: 0; transform: translateY(20px) scale(0.95) }
  to { opacity: 1; transform: translateY(0) scale(1) }
}

.chat-message.user { flex-direction: row-reverse }
.chat-message.user .message-content-wrapper { align-items: flex-end }
.user-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  justify-content: flex-end;
}
.user-image {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 12px;
}
.message-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #FFECC8 0%, #FFE5B4 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8B7355;
  box-shadow: 0 2px 8px rgba(255, 236, 179, 0.25);
}

.user-avatar svg { width: 18px; height: 18px }

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 75%;
}

.message-content { line-height: 1.7 }

/* 普通 AI 气泡 */
.ai-bubble {
  padding: 18px 22px;
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  border: 1px solid rgba(255, 228, 181, 0.3);
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0 4px 20px rgba(255, 236, 179, 0.08);
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

/* ======= Agent 气泡 ======= */
.agent-bubble {
  background: linear-gradient(135deg, #FFFEF8 0%, #FFF8E7 100%);
  border: 1px solid rgba(255, 228, 181, 0.35);
  border-radius: 16px 16px 4px 16px;
  box-shadow: 0 4px 20px rgba(255, 236, 179, 0.1);
  overflow: hidden;
}

/* 工具调用进度条 */
.agent-tool-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(255, 236, 179, 0.12) 0%, rgba(255, 248, 231, 0.35) 100%);
  border-bottom: 1px solid rgba(255, 228, 181, 0.3);
}

.agent-tool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 251, 240, 0.7);
  border: 1px solid rgba(255, 228, 181, 0.3);
  border-radius: 10px;
  opacity: 0;
  transform: translateX(-8px);
  animation: toolItemIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.agent-tool-item.done {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(255, 248, 231, 0.65) 100%);
  border-color: rgba(16, 185, 129, 0.25);
}

.agent-tool-item.error {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(255, 248, 231, 0.65) 100%);
  border-color: rgba(239, 68, 68, 0.3);
}

@keyframes toolItemIn {
  to { opacity: 1; transform: translateX(0) }
}

.agent-tool-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 228, 181, 0.5);
  border-top-color: #E0A958;
  border-radius: 50%;
  animation: toolSpin 0.9s linear infinite;
}

@keyframes toolSpin {
  to { transform: rotate(360deg) }
}

.tool-done-icon { color: #10B981; font-weight: 700; font-size: 12px }
.tool-error-icon { color: #EF4444; font-weight: 700; font-size: 12px }

.agent-tool-body { flex: 1; min-width: 0 }
.agent-tool-head { display: flex; align-items: center; gap: 8px }
.agent-tool-emoji { font-size: 15px }
.agent-tool-name {
  font-size: 13px;
  color: #5D4E37;
  font-weight: 600;
}
.agent-tool-status {
  font-size: 11px;
  color: #B59E82;
  margin-left: auto;
}

.agent-tool-item.done .agent-tool-status { color: #10B981 }
.agent-tool-item.error .agent-tool-status { color: #EF4444 }

/* Agent 文本内容区 */
.agent-bubble .markdown-content {
  padding: 16px 20px;
  font-size: 14.5px;
  color: #5D4E37;
  line-height: 1.8;
}

.streaming-indicator {
  display: inline-flex;
  gap: 4px;
  padding: 16px 20px;
}

.streaming-indicator span {
  width: 5px;
  height: 5px;
  background: #D4A574;
  border-radius: 50%;
  animation: blinkDot 1.2s infinite;
}

.streaming-indicator span:nth-child(2) { animation-delay: 0.2s }
.streaming-indicator span:nth-child(3) { animation-delay: 0.4s }

@keyframes blinkDot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85) }
  40% { opacity: 1; transform: scale(1) }
}

/* 用户气泡 */
.user-bubble {
  padding: 14px 20px;
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border-radius: 20px 4px 20px 20px;
  box-shadow: 0 4px 16px rgba(255, 236, 179, 0.15);
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

/* Markdown 内容 */
.markdown-content { font-size: 14.5px; color: #5D4E37; word-break: break-word; overflow-wrap: break-word; }
.markdown-content :deep(p) { margin: 0 0 10px 0; line-height: 1.8; word-break: break-word; }
.markdown-content :deep(p:last-child) { margin-bottom: 0 }
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  margin: 14px 0 8px 0;
  font-weight: 700;
  color: #8B4513;
  line-height: 1.5;
}
.markdown-content :deep(h1) { font-size: 17px }
.markdown-content :deep(h2) { font-size: 16px }
.markdown-content :deep(h3) { font-size: 15px }
.markdown-content :deep(ul),
.markdown-content :deep(ol) { margin: 10px 0; padding-left: 22px; line-height: 1.8 }
.markdown-content :deep(li) { margin: 4px 0 }
.markdown-content :deep(code) {
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12.5px;
  font-family: 'Courier New', 'Menlo', monospace;
  color: #8B7355;
  font-weight: 500;
  display: inline-block;
  word-break: break-all;
}
.markdown-content :deep(pre) {
  background: #FFFBF0;
  padding: 14px 16px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 10px 0;
  border: 1px solid #FFF5DC;
}
.markdown-content :deep(pre code) { background: transparent; padding: 0; color: #5D4E37; display: block; font-size: 12.5px; line-height: 1.6; }
.markdown-content :deep(blockquote) {
  border-left: 3px solid #D4A574;
  padding-left: 14px;
  margin: 10px 0;
  color: #BC8F6F;
  font-style: italic;
}
.markdown-content :deep(strong) { font-weight: 700; color: #A67B5B }
.markdown-content :deep(em) { font-style: italic; color: #8B7355 }
.markdown-content :deep(a) { color: #D2691E; text-decoration: underline; word-break: break-all }
.markdown-content :deep(a:hover) { color: #8B4513 }
.markdown-content :deep(hr) { border: none; border-top: 1px solid rgba(212, 165, 116, 0.3); margin: 16px 0 }
.markdown-content :deep(br) { display: block; content: ''; margin: 4px 0 }
.markdown-content :deep(table) {
  border-collapse: collapse;
  margin: 10px 0;
  width: 100%;
  font-size: 13px;
}
.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #FFE5B4;
  padding: 6px 10px;
  text-align: left;
}
.markdown-content :deep(th) {
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  color: #8B4513;
  font-weight: 600;
}

.plain-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14.5px;
  color: #5D4E37;
  line-height: 1.7;
}

/* 参考来源 */
.references-section { margin-top: 12px; animation: referencesFade 0.5s ease 0.2s }
@keyframes referencesFade { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: translateY(0) } }
.references-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px }
.book-icon {
  width: 16px;
  height: 16px;
  color: #D4A574;
  display: flex;
  align-items: center;
  justify-content: center;
}
.book-icon svg { width: 100%; height: 100% }

.references-title {
  font-size: 12px;
  font-weight: 700;
  color: #BC8F6F;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.sources-grid { display: flex; flex-direction: column; gap: 8px }

.source-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
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

@keyframes sourceCardSlide { from { opacity: 0; transform: translateX(-20px) } to { opacity: 1; transform: translateX(0) } }

.source-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #D4A574 0%, #E0C9A8 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.source-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 236, 179, 0.12);
  border-color: #FFECC8;
}

.source-card:hover::before { transform: scaleX(1) }

.source-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border-radius: 8px;
  color: #8B7355;
}

.source-icon svg { width: 16px; height: 16px }

.source-content { flex: 1; min-width: 0 }
.source-title {
  font-size: 14px;
  font-weight: 600;
  color: #8B7355;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.source-indicator { display: flex; align-items: center; gap: 4px; margin-top: 2px }

.dot {
  width: 6px;
  height: 6px;
  background: #10B981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.5 }
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

.source-card:hover .source-decoration { opacity: 1; transform: translateX(3px) }

.deco-line {
  width: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #D4A574 50%, transparent 100%);
}

.deco-paw { font-size: 12px }

/* 消息底部 */
.message-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  margin-top: 6px;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chat-message:hover .message-footer { opacity: 1 }

.message-time { font-size: 11px; color: #AAA195 }

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
  margin-left: auto;
}

.action-button:hover {
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  color: #8B7355;
  transform: translateY(-1px);
}

.action-button .icon { width: 14px; height: 14px }
.action-text { font-size: 11px; font-weight: 600 }

/* 移动端优化 */
@media (max-width: 767px) {
  .chat-message { padding: 12px 16px }
  .message-content-wrapper { max-width: 80% }

  .ai-bubble,
  .user-bubble,
  .agent-bubble {
    padding: 14px 16px;
    font-size: 14px;
  }

  .agent-bubble .markdown-content { padding: 14px 16px }
  .agent-tool-stack { padding: 12px }

  .source-card { padding: 10px 12px; gap: 8px }
  .source-icon { width: 24px; height: 24px }
  .source-icon svg { width: 14px; height: 14px }
  .source-title { font-size: 13px }
  .source-decoration { display: none }
}
</style>
