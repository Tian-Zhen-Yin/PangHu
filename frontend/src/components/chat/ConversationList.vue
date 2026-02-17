<script setup lang="ts">
import { ref } from 'vue'
import type { Conversation } from '../../types/chat'

interface Props {
  conversations: Conversation[]
  currentId: string | null
  loading?: boolean
}

interface Emits {
  (e: 'select', id: string): void
  (e: 'new'): void
  (e: 'delete', id: string): void
  (e: 'rename', id: string, newTitle: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const editingId = ref<string | null>(null)
const editingTitle = ref('')

// 保存标题
function saveTitle(id: string) {
  const trimmed = editingTitle.value.trim()
  if (trimmed && trimmed !== props.conversations.find(c => c.id === id)?.title) {
    emit('rename', id, trimmed)
  }
  editingId.value = null
}

// 取消编辑
function cancelEdit() {
  editingId.value = null
  editingTitle.value = ''
}

// 删除对话
function handleDelete(id: string, event: Event) {
  event.stopPropagation()
  emit('delete', id)
}

// 选择对话
function handleSelect(id: string) {
  if (editingId.value !== id) {
    emit('select', id)
  }
}

// 获取对话预览
function getPreview(conversation: Conversation): string {
  const lastMessage = conversation.messages?.[0]
  if (!lastMessage) return '暂无消息'

  const content = lastMessage.content
  if (lastMessage.role === 'user') {
    return `您: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`
  } else {
    return `喵喵医生: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`
  }
}

// 获取时间显示
function getTimeDisplay(conversation: Conversation): string {
  const date = new Date(conversation.updatedAt)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)

  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="conversation-list">
    <div class="list-header">
      <h2 class="list-title">对话列表</h2>
      <button class="new-button" @click="$emit('new')">
        <span class="icon">+</span>
        <span>新对话</span>
      </button>
    </div>

    <div v-if="loading && conversations.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="conversations.length === 0" class="empty-state">
      <div class="empty-icon">💬</div>
      <p>还没有对话</p>
      <p class="empty-hint">点击"新对话"开始聊天</p>
    </div>

    <div v-else class="conversation-items">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        :class="['conversation-item', { active: conversation.id === currentId, editing: editingId === conversation.id }]"
        @click="handleSelect(conversation.id)"
      >
        <!-- 编辑模式 -->
        <div v-if="editingId === conversation.id" class="edit-mode" @click.stop>
          <input
            v-model="editingTitle"
            class="title-input"
            @keyup.enter="saveTitle(conversation.id)"
            @keyup.esc="cancelEdit"
            @click.stop
            v-focus
          />
          <div class="edit-actions">
            <button class="edit-action-button save" @click="saveTitle(conversation.id)">✓</button>
            <button class="edit-action-button cancel" @click="cancelEdit">✕</button>
          </div>
        </div>

        <!-- 显示模式 -->
        <template v-else>
          <div class="conversation-main">
            <div class="conversation-icon">💬</div>
            <div class="conversation-info">
              <div class="conversation-header">
                <h3 class="conversation-title">{{ conversation.title }}</h3>
                <span class="conversation-time">{{ getTimeDisplay(conversation) }}</span>
              </div>
              <p class="conversation-preview">{{ getPreview(conversation) }}</p>
            </div>
          </div>
          <button class="delete-button" @click="handleDelete(conversation.id, $event)">
            <span>🗑</span>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.new-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.new-button:hover {
  border-color: #667eea;
  color: #667eea;
}

.new-button .icon {
  font-size: 16px;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  text-align: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e4e7ed;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  margin-top: 12px;
  font-size: 14px;
  color: #909399;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.empty-state > p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.empty-hint {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px !important;
}

.conversation-items {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f5f7fa;
  transition: all 0.2s;
  position: relative;
}

.conversation-item:hover {
  background-color: #f5f7fa;
}

.conversation-item.active {
  background-color: #f0f4ff;
}

.conversation-main {
  display: flex;
  gap: 10px;
}

.conversation-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.conversation-item.active .conversation-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.conversation-time {
  font-size: 11px;
  color: #c0c4cc;
  flex-shrink: 0;
  margin-left: 8px;
}

.conversation-preview {
  font-size: 12px;
  color: #909399;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-button {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: #c0c4cc;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.conversation-item:hover .delete-button {
  opacity: 1;
}

.delete-button:hover {
  color: #f56c6c;
}

.edit-mode {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.title-input:focus {
  border-color: #667eea;
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.edit-action-button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-action-button.save {
  background-color: #67c23a;
  color: #fff;
}

.edit-action-button.cancel {
  background-color: #f56c6c;
  color: #fff;
}
</style>
