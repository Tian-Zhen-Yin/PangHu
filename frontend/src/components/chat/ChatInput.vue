<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  disabled?: boolean
  placeholder?: string
}

interface Emits {
  (e: 'send', content: string): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  placeholder: '请输入您的问题...'
})

const emit = defineEmits<Emits>()

const input = ref<HTMLTextAreaElement | null>(null)
const content = ref('')
const isFocused = ref(false)

// 自动调整高度
function adjustHeight() {
  if (input.value) {
    input.value.style.height = 'auto'
    const newHeight = Math.min(input.value.scrollHeight, 200)
    input.value.style.height = newHeight + 'px'
  }
}

// 监听内容变化，调整高度
watch(content, () => {
  adjustHeight()
})

// 处理发送
function handleSend() {
  const trimmed = content.value.trim()
  if (trimmed && !props.disabled) {
    emit('send', trimmed)
    content.value = ''
    // 重置高度
    if (input.value) {
      input.value.style.height = 'auto'
    }
  }
}

// 处理键盘事件
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

// 聚焦输入框
function focus() {
  input.value?.focus()
}

// 暴露方法
defineExpose({
  focus
})
</script>

<template>
  <div :class="['chat-input', { focused: isFocused, disabled }]">
    <div class="input-wrapper">
      <textarea
        ref="input"
        v-model="content"
        class="input-textarea"
        :placeholder="placeholder"
        :disabled="disabled"
        rows="1"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="handleKeydown"
      ></textarea>
      <button
        :class="['send-button', { disabled: !content.trim() || disabled }]"
        :disabled="!content.trim() || disabled"
        @click="handleSend"
      >
        <span class="icon">➤</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  background-color: #fff;
  border-radius: 12px;
  border: 2px solid #e4e7ed;
  transition: all 0.2s;
}

.chat-input.focused {
  border-color: #667eea;
}

.chat-input.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
}

.input-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: #303133;
  background: transparent;
  font-family: inherit;
  min-height: 24px;
  max-height: 200px;
}

.input-textarea::placeholder {
  color: #c0c4cc;
}

.input-textarea:disabled {
  cursor: not-allowed;
}

.send-button {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.send-button:hover:not(.disabled) {
  transform: scale(1.05);
}

.send-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-button .icon {
  font-size: 16px;
  transform: translateX(1px);
}
</style>
