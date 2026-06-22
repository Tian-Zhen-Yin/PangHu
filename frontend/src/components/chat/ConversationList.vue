<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Conversation } from '../../types/chat.js'

interface Props {
  conversations: Conversation[]
  currentId: string | null
  loading?: boolean
  showClose?: boolean
}

interface Emits {
  (e: 'select', id: string): void
  (e: 'new'): void
  (e: 'delete', id: string): void
  (e: 'rename', id: string, newTitle: string): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showClose: false,
})

const emit = defineEmits<Emits>()

// ============ 编辑相关 ============
const editingId = ref<string | null>(null)
const editingTitle = ref('')

// v-for 内的 ref 会成为数组，用函数式回调拿到单个元素
let editingInputEl: HTMLInputElement | null = null
function setEditingInputRef(el: any) {
  editingInputEl = el as HTMLInputElement | null
}

// ============ 搜索 ============
const searchKeyword = ref('')

// ============ 焦点管理 ============
const newButtonRef = ref<HTMLButtonElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const rootRef = ref<HTMLElement | null>(null)

// ============ 触摸/长按状态 ============
const swipedId = ref<string | null>(null)
const swipeOffset = ref(0)
const SWIPE_THRESHOLD = 60 // 触发删除按钮显示的滑动距离
const SWIPE_MAX = 80 // 最大滑动距离
let touchStartX = 0
let touchStartY = 0
let touchActiveId: string | null = null
let isHorizontalSwipe = false
let longPressTimer: ReturnType<typeof setTimeout> | null = null
const LONG_PRESS_DURATION = 500

// 长按弹出菜单状态
const contextMenuVisible = ref(false)
const contextMenuTarget = ref<Conversation | null>(null)
const contextMenuPos = ref({ x: 0, y: 0 })

// ============ 过滤 & 分组 ============
const filteredConversations = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return props.conversations
  return props.conversations.filter(c =>
    c.title.toLowerCase().includes(kw) ||
    c.messages?.[0]?.content?.toLowerCase().includes(kw)
  )
})

type GroupKey = 'today' | 'yesterday' | 'week' | 'earlier'
interface Group {
  key: GroupKey
  label: string
  items: Conversation[]
}

const GROUP_LABEL: Record<GroupKey, string> = {
  today: '今天',
  yesterday: '昨天',
  week: '本周',
  earlier: '更早',
}

function classify(conv: Conversation): GroupKey {
  const date = new Date(conv.updatedAt)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const ts = date.getTime()
  if (ts >= startOfToday) return 'today'
  if (ts >= startOfToday - 86400000) return 'yesterday'
  if (ts >= startOfToday - 6 * 86400000) return 'week'
  return 'earlier'
}

const groupedConversations = computed<Group[]>(() => {
  const buckets: Record<GroupKey, Conversation[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  }
  for (const c of filteredConversations.value) {
    buckets[classify(c)].push(c)
  }
  const order: GroupKey[] = ['today', 'yesterday', 'week', 'earlier']
  return order
    .filter(k => buckets[k].length > 0)
    .map(k => ({ key: k, label: GROUP_LABEL[k], items: buckets[k] }))
})

// ============ 编辑操作 ============
function startEdit(conv: Conversation) {
  editingId.value = conv.id
  editingTitle.value = conv.title
  closeContextMenu()
  nextTick(() => {
    editingInputEl?.focus()
    editingInputEl?.select()
  })
}

function saveTitle(id: string) {
  const trimmed = editingTitle.value.trim()
  if (trimmed && trimmed !== props.conversations.find(c => c.id === id)?.title) {
    emit('rename', id, trimmed)
  }
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
  editingTitle.value = ''
}

// ============ 选择 / 删除 ============
function handleSelect(id: string) {
  if (editingId.value === id) return
  if (swipedId.value === id) {
    // 已经滑出删除按钮时，点击主体先收起
    swipedId.value = null
    return
  }
  resetSwipe()
  emit('select', id)
}

function handleDelete(id: string, event?: Event) {
  event?.stopPropagation()
  resetSwipe()
  closeContextMenu()
  emit('delete', id)
}

// ============ 触摸事件：右滑删除 ============
function onTouchStart(e: TouchEvent, conv: Conversation) {
  if (editingId.value === conv.id) return
  const t = e.touches[0]
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchActiveId = conv.id
  isHorizontalSwipe = false

  // 启动长按计时
  clearLongPress()
  longPressTimer = setTimeout(() => {
    openContextMenu(conv, t.clientX, t.clientY)
    touchActiveId = null
  }, LONG_PRESS_DURATION)
}

function onTouchMove(e: TouchEvent, conv: Conversation) {
  if (touchActiveId !== conv.id) return
  const t = e.touches[0]
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY

  // 移动超过阈值，取消长按
  if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
    clearLongPress()
  }

  // 判定主方向
  if (!isHorizontalSwipe && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
    isHorizontalSwipe = true
  }

  if (isHorizontalSwipe && dx < 0) {
    // 仅响应左滑（向左滑动暴露右侧删除按钮）
    swipedId.value = conv.id
    swipeOffset.value = Math.max(dx, -SWIPE_MAX)
    e.preventDefault?.()
  } else if (isHorizontalSwipe && dx > 0 && swipedId.value === conv.id) {
    // 已展开时允许右滑收回
    swipeOffset.value = Math.min(0, swipeOffset.value + dx)
  }
}

function onTouchEnd(_e: TouchEvent, conv: Conversation) {
  clearLongPress()
  if (touchActiveId !== conv.id) return
  if (isHorizontalSwipe) {
    if (Math.abs(swipeOffset.value) >= SWIPE_THRESHOLD) {
      swipedId.value = conv.id
      swipeOffset.value = -SWIPE_MAX
    } else {
      resetSwipe()
    }
  }
  touchActiveId = null
  isHorizontalSwipe = false
}

function onTouchCancel() {
  clearLongPress()
  touchActiveId = null
  isHorizontalSwipe = false
}

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function resetSwipe() {
  swipedId.value = null
  swipeOffset.value = 0
}

function getSwipeStyle(conv: Conversation) {
  if (swipedId.value === conv.id) {
    return { transform: `translateX(${swipeOffset.value}px)` }
  }
  return { transform: 'translateX(0)' }
}

// ============ 长按菜单 ============
function onContextMenu(e: MouseEvent, conv: Conversation) {
  e.preventDefault()
  openContextMenu(conv, e.clientX, e.clientY)
}

function openContextMenu(conv: Conversation, x: number, y: number) {
  contextMenuTarget.value = conv
  contextMenuVisible.value = true
  // 防止菜单超出视口
  const menuWidth = 160
  const menuHeight = 120
  const vw = window.innerWidth
  const vh = window.innerHeight
  contextMenuPos.value = {
    x: Math.min(x, vw - menuWidth - 8),
    y: Math.min(y, vh - menuHeight - 8),
  }
}

function closeContextMenu() {
  contextMenuVisible.value = false
  contextMenuTarget.value = null
}

function onGlobalClick(e: MouseEvent) {
  if (!contextMenuVisible.value) return
  const target = e.target as HTMLElement
  if (!target.closest?.('.context-menu')) {
    closeContextMenu()
  }
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (contextMenuVisible.value) closeContextMenu()
    if (editingId.value) cancelEdit()
    if (swipedId.value) resetSwipe()
  }
}

// ============ 焦点管理 ============
onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  document.addEventListener('keydown', onEscape)
  // 面板打开时把焦点放到关闭按钮（移动端）或新建按钮（桌面端）
  nextTick(() => {
    if (props.showClose) {
      closeButtonRef.value?.focus()
    } else {
      newButtonRef.value?.focus()
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGlobalClick)
  document.removeEventListener('keydown', onEscape)
  clearLongPress()
})

// 当对话项被滑出时，点击外部应该收起
watch(() => props.currentId, () => {
  resetSwipe()
})

// ============ 预览 ============
interface PreviewParts {
  role: 'user' | 'assistant' | null
  content: string
}

function getPreviewParts(conversation: Conversation): PreviewParts {
  const lastMessage = conversation.messages?.[0]
  if (!lastMessage) return { role: null, content: '暂无消息' }
  return {
    role: lastMessage.role as 'user' | 'assistant',
    content: lastMessage.content,
  }
}
</script>

<template>
  <div ref="rootRef" class="conversation-list">
    <!-- 顶部栏 -->
    <div class="list-header">
      <div class="header-left">
        <span class="title-emoji" aria-hidden="true">🐾</span>
        <h2 class="list-title">历史对话</h2>
      </div>
      <div class="header-actions">
        <button
          ref="newButtonRef"
          class="new-button"
          @click="$emit('new')"
          aria-label="新建对话"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          <span>新对话</span>
        </button>
        <button
          v-if="showClose"
          ref="closeButtonRef"
          class="close-button"
          @click="$emit('close')"
          aria-label="关闭对话列表"
          title="返回聊天"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div v-if="conversations.length > 3" class="search-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/>
      </svg>
      <input
        v-model="searchKeyword"
        class="search-input"
        type="text"
        placeholder="搜索对话…"
        aria-label="搜索对话"
      />
      <button
        v-if="searchKeyword"
        class="search-clear"
        @click="searchKeyword = ''"
        aria-label="清空搜索"
      >✕</button>
    </div>

    <!-- 加载 -->
    <div v-if="loading && conversations.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>喵喵正在翻找记忆…</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="conversations.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true">💭</div>
      <p class="empty-title">还没有对话记录</p>
      <p class="empty-hint">点击右上角「新对话」开始和喵喵聊聊吧</p>
      <button class="empty-cta" @click="$emit('new')">
        <span>✨</span>
        <span>开始第一次对话</span>
      </button>
    </div>

    <!-- 搜索无结果 -->
    <div v-else-if="filteredConversations.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true">🔍</div>
      <p class="empty-title">没有找到相关对话</p>
      <p class="empty-hint">换个关键词试试</p>
    </div>

    <!-- 分组列表 -->
    <div v-else class="conversation-scroll">
      <section
        v-for="group in groupedConversations"
        :key="group.key"
        class="conversation-group"
      >
        <h4 class="group-label">
          <span class="group-bar" aria-hidden="true"></span>
          {{ group.label }}
          <span class="group-count">{{ group.items.length }}</span>
        </h4>
        <ul class="conversation-items" role="list">
          <li
            v-for="conversation in group.items"
            :key="conversation.id"
            class="conversation-row"
            :class="{ 'swiped': swipedId === conversation.id }"
          >
            <!-- 滑动暴露层：删除操作 -->
            <button
              class="swipe-delete-action"
              tabindex="-1"
              aria-hidden="true"
              @click.stop="handleDelete(conversation.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
              </svg>
              <span>删除</span>
            </button>

            <!-- 前景：对话内容 -->
            <div
              :class="['conversation-item', { active: conversation.id === currentId, editing: editingId === conversation.id }]"
              :style="getSwipeStyle(conversation)"
              role="listitem"
              tabindex="0"
              @click="handleSelect(conversation.id)"
              @keyup.enter="handleSelect(conversation.id)"
              @contextmenu="onContextMenu($event, conversation)"
              @touchstart.passive="onTouchStart($event, conversation)"
              @touchmove="onTouchMove($event, conversation)"
              @touchend="onTouchEnd($event, conversation)"
              @touchcancel="onTouchCancel"
            >
              <!-- 编辑模式 -->
              <div v-if="editingId === conversation.id" class="edit-mode" @click.stop>
                <input
                  :ref="setEditingInputRef"
                  v-model="editingTitle"
                  class="title-input"
                  @keyup.enter="saveTitle(conversation.id)"
                  @keyup.esc="cancelEdit"
                  @blur="saveTitle(conversation.id)"
                  @click.stop
                />
                <div class="edit-actions">
                  <button class="edit-action-button save" @click.stop="saveTitle(conversation.id)" aria-label="保存">✓</button>
                  <button class="edit-action-button cancel" @click.stop="cancelEdit" aria-label="取消">✕</button>
                </div>
              </div>

              <!-- 显示模式 -->
              <template v-else>
                <div class="conversation-icon" aria-hidden="true">
                  <span>💬</span>
                </div>
                <div class="conversation-info">
                  <div class="conversation-header">
                    <h3 class="conversation-title">{{ conversation.title }}</h3>
                  </div>
                  <p class="conversation-preview">
                    <template v-if="getPreviewParts(conversation).role">
                      <span
                        :class="['preview-tag', getPreviewParts(conversation).role === 'user' ? 'tag-user' : 'tag-mao']"
                        :aria-label="getPreviewParts(conversation).role === 'user' ? '我' : '喵喵'"
                      >{{ getPreviewParts(conversation).role === 'user' ? '我' : '喵' }}</span>
                    </template>
                    <span class="preview-text">{{ getPreviewParts(conversation).content }}</span>
                  </p>
                </div>
                <button
                  class="delete-button"
                  @click.stop="handleDelete(conversation.id, $event)"
                  aria-label="删除此对话"
                  title="删除"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
                  </svg>
                </button>
              </template>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <!-- 长按 / 右键 上下文菜单 -->
    <Teleport to="body">
      <transition name="menu-fade">
        <div
          v-if="contextMenuVisible && contextMenuTarget"
          class="context-menu"
          role="menu"
          :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
        >
          <button class="menu-item" role="menuitem" @click="emit('select', contextMenuTarget!.id); closeContextMenu()">
            <span class="menu-icon">📂</span>
            <span>打开</span>
          </button>
          <button class="menu-item" role="menuitem" @click="startEdit(contextMenuTarget!)">
            <span class="menu-icon">✏️</span>
            <span>重命名</span>
          </button>
          <div class="menu-divider" role="separator"></div>
          <button class="menu-item danger" role="menuitem" @click="handleDelete(contextMenuTarget!.id)">
            <span class="menu-icon">🗑</span>
            <span>删除对话</span>
          </button>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #FFFBF0 0%, #FFF8E7 100%);
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ================ 顶部栏 ================ */
.list-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(255, 251, 240, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 228, 181, 0.4);
  position: sticky;
  top: 0;
  z-index: 2;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.title-emoji {
  font-size: 18px;
  line-height: 1;
}

.list-title {
  font-size: 16px;
  font-weight: 700;
  color: #5D4E37;
  margin: 0;
  letter-spacing: 0.3px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.new-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1.5px solid #FFE5B4;
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  color: #8B5A2B;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  white-space: nowrap;
  outline: none;
}

.new-button:focus-visible {
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.25);
}

.new-button:hover {
  background: linear-gradient(135deg, #FFECC8 0%, #FFE5B4 100%);
  box-shadow: 0 3px 10px rgba(244, 162, 97, 0.2);
  transform: translateY(-1px);
}

.new-button:active {
  transform: scale(0.96);
}

.close-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 245, 220, 0.6);
  color: #8B7355;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  outline: none;
}

.close-button:focus-visible {
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.25);
}

.close-button:hover {
  background: #FFE5B4;
  color: #5D4E37;
}

.close-button:active {
  transform: scale(0.92);
}

/* ================ 搜索框 ================ */
.search-wrapper {
  position: relative;
  margin: 10px 12px 4px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #BC8F6F;
  pointer-events: none;
}

.search-input {
  flex: 1;
  padding: 8px 32px 8px 32px;
  border: 1.5px solid #FFF0DB;
  border-radius: 999px;
  background: #FFFEF8;
  font-size: 13px;
  color: #5D4E37;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input::placeholder {
  color: #C7A47C;
}

.search-input:focus {
  border-color: #F4A261;
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.12);
}

.search-clear {
  position: absolute;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #FFE5B4;
  color: #8B5A2B;
  font-size: 10px;
  cursor: pointer;
}

/* ================ 状态 ================ */
.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  gap: 6px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #FFF0DB;
  border-top-color: #F4A261;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin: 0;
  font-size: 13px;
  color: #BC8F6F;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
  filter: drop-shadow(0 4px 10px rgba(255, 228, 181, 0.4));
}

.empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #8B5A2B;
}

.empty-hint {
  margin: 0;
  font-size: 12px;
  color: #BC8F6F;
  line-height: 1.5;
}

.empty-cta {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(231, 111, 81, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.empty-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(231, 111, 81, 0.35);
}

.empty-cta:active {
  transform: scale(0.96);
}

/* ================ 分组 ================ */
.conversation-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 16px;
}

.conversation-scroll::-webkit-scrollbar {
  width: 6px;
}

.conversation-scroll::-webkit-scrollbar-thumb {
  background: #FFE5B4;
  border-radius: 3px;
}

.conversation-group {
  margin-top: 10px;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 6px;
  padding: 0;
  font-size: 11.5px;
  font-weight: 700;
  color: #BC8F6F;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.group-bar {
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: linear-gradient(180deg, #F4A261 0%, #FFDAB9 100%);
}

.group-count {
  margin-left: auto;
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0;
  color: #8B5A2B;
  background: rgba(255, 228, 181, 0.5);
  border-radius: 999px;
}

.conversation-items {
  list-style: none;
  margin: 0;
  padding: 0 8px;
}

/* ================ 单行容器（含滑动） ================ */
.conversation-row {
  position: relative;
  margin-bottom: 6px;
  border-radius: 12px;
  overflow: hidden;
}

.swipe-delete-action {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.conversation-row.swiped .swipe-delete-action {
  opacity: 1;
  pointer-events: auto;
}

/* ================ 单条对话 ================ */
.conversation-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  border-radius: 12px;
  border: 1.5px solid transparent;
  background: #FFFEF8;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease;
  position: relative;
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  z-index: 1;
}

.conversation-item:hover,
.conversation-item:focus-visible {
  background: rgba(255, 245, 220, 0.85);
  border-color: #FFF0DB;
}

.conversation-item:focus-visible {
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.18);
}

.conversation-item.active {
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  border-color: #FFE5B4;
  box-shadow: 0 2px 8px rgba(255, 218, 158, 0.18);
}

.conversation-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, #F4A261 0%, #E76F51 100%);
}

.conversation-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 228, 181, 0.5);
}

.conversation-item.active .conversation-icon {
  background: linear-gradient(135deg, #FFE5B4 0%, #FFDAB9 100%);
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}

.conversation-title {
  font-size: 14px;
  font-weight: 600;
  color: #5D4E37;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.conversation-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8B7355;
  margin: 0;
  line-height: 1.5;
  min-width: 0;
}

.preview-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.preview-tag.tag-user {
  background: rgba(244, 162, 97, 0.15);
  color: #B86E3E;
}

.preview-tag.tag-mao {
  background: rgba(106, 144, 92, 0.15);
  color: #6A905C;
}

.preview-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ================ 删除按钮 ================ */
.delete-button {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #C7A47C;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
}

.delete-button:hover {
  background: rgba(231, 111, 81, 0.1);
  color: #E76F51;
}

.delete-button:active {
  transform: scale(0.9);
}

/* 桌面端：默认隐藏，悬停时显示 */
@media (hover: hover) and (pointer: fine) {
  .delete-button {
    opacity: 0;
    transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease;
  }

  .conversation-item:hover .delete-button,
  .conversation-item:focus-within .delete-button {
    opacity: 1;
  }
}

/* 移动端隐藏右上角小垃圾桶，靠左滑触发 */
@media (hover: none) and (pointer: coarse) {
  .delete-button {
    display: none;
  }
}

/* ================ 编辑模式 ================ */
.edit-mode {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.title-input {
  flex: 1;
  padding: 7px 10px;
  border: 1.5px solid #F4A261;
  border-radius: 8px;
  font-size: 13.5px;
  background: #fff;
  color: #5D4E37;
  outline: none;
  box-shadow: 0 0 0 3px rgba(244, 162, 97, 0.12);
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.edit-action-button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.edit-action-button:active {
  transform: scale(0.92);
}

.edit-action-button.save {
  background: linear-gradient(135deg, #67C23A 0%, #4DA82A 100%);
  color: #fff;
}

.edit-action-button.cancel {
  background: #FFE5DC;
  color: #E76F51;
}

/* ================ 上下文菜单 ================ */
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 160px;
  padding: 6px;
  background: #FFFEF8;
  border: 1px solid #FFE5B4;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(139, 90, 43, 0.18),
              0 2px 6px rgba(139, 90, 43, 0.08);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #5D4E37;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.menu-item:hover,
.menu-item:focus-visible {
  background: linear-gradient(135deg, #FFF5DC 0%, #FFECC8 100%);
  outline: none;
}

.menu-item.danger {
  color: #C03A20;
}

.menu-item.danger:hover {
  background: rgba(231, 111, 81, 0.12);
  color: #E76F51;
}

.menu-icon {
  font-size: 14px;
  width: 18px;
  text-align: center;
}

.menu-divider {
  height: 1px;
  margin: 4px 4px;
  background: rgba(255, 228, 181, 0.5);
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.96);
}

/* ================ 移动端适配 ================ */
@media (max-width: 767px) {
  .list-header {
    padding: 12px 14px;
  }

  .list-title {
    font-size: 15px;
  }

  .new-button {
    padding: 6px 10px;
    font-size: 12px;
  }

  .conversation-item {
    padding: 11px 10px;
  }

  .conversation-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .group-label {
    margin: 0 12px 6px;
  }
}
</style>
