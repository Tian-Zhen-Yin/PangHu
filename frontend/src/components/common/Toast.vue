<script setup lang="ts">
import { watch } from 'vue'

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const props = defineProps<{
  toasts: ToastItem[]
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

// 自动移除 toast
watch(() => props.toasts, (toasts) => {
  toasts.forEach(toast => {
    if (toast.duration !== 0) {
      setTimeout(() => {
        emit('remove', toast.id)
      }, toast.duration || 3000)
    }
  })
}, { deep: true })

function getIcon(type: string): string {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    case 'info': return 'ℹ'
    default: return ''
  }
}
</script>

<template>
  <teleport to="body">
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast-item', toast.type]"
        >
          <span class="toast-icon">{{ getIcon(toast.type) }}</span>
          <span class="toast-message">{{ toast.message }}</span>
          <button @click="emit('remove', toast.id)" class="toast-close">×</button>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 300px;
  max-width: 400px;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
}

.toast-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.toast-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-text-placeholder);
  font-size: 1.25rem;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
  line-height: 1;
}

.toast-close:hover {
  background: var(--color-bg-block-hover);
  color: var(--color-text-regular);
}

/* 类型样式 */
.toast-item.success .toast-icon {
  background: #dcfce7;
  color: var(--color-success);
}

.toast-item.error .toast-icon {
  background: #fee2e2;
  color: var(--color-danger);
}

.toast-item.warning .toast-icon {
  background: #fef3c7;
  color: var(--color-warning);
}

.toast-item.info .toast-icon {
  background: #dbeafe;
  color: var(--color-info);
}

/* 动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}

@media (max-width: 640px) {
  .toast-container {
    left: 1rem;
    right: 1rem;
  }

  .toast-item {
    min-width: 0;
    max-width: none;
  }
}
</style>
