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
        aria-label="发送"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="send-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-7 7m7-7l7 7"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  background: linear-gradient(135deg, #FFFEF8 0%, #FFFBF0 100%);
  border-radius: 20px;
  border: 2px solid #FFF5DC;
  transition: all 0.2s;
  box-shadow: 0 2px 12px rgba(188, 143, 111, 0.08);
}

.chat-input.focused {
  border-color: #FFE5B4;
  box-shadow: 0 4px 20px rgba(255, 228, 181, 0.18);
}

.chat-input.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 14px 12px 20px;
}

.input-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-primary, #303133);
  background: transparent;
  font-family: inherit;
  min-height: 28px;
  max-height: 200px;
}

.input-textarea::placeholder {
  color: var(--color-text-placeholder);
}

.input-textarea:disabled {
  cursor: not-allowed;
}

.send-button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--color-primary-gradient);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(244, 162, 97, 0.3);
}

.send-button:hover:not(.disabled) {
  background: var(--color-primary-gradient-hover);
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.4);
}

.send-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.send-button .send-icon {
  width: 18px;
  height: 18px;
}
</style>
