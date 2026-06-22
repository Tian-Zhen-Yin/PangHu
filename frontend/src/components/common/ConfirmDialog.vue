<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  visible: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'confirm' | 'warning' | 'danger'
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认操作',
  message: '确定要执行此操作吗？',
  confirmText: '确认',
  cancelText: '取消',
  type: 'confirm'
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const isAnimating = ref(false)

function handleConfirm() {
  isAnimating.value = true
  setTimeout(() => {
    emit('confirm')
    isAnimating.value = false
  }, 200)
}

function handleCancel() {
  isAnimating.value = true
  setTimeout(() => {
    emit('cancel')
    isAnimating.value = false
  }, 200)
}

function handleOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('confirm-overlay')) {
    handleCancel()
  }
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <transition name="confirm">
      <div 
        v-if="visible" 
        class="confirm-overlay"
        @click="handleOverlayClick"
      >
        <div class="confirm-dialog" :class="{ animating: isAnimating }">
          <!-- 图标区域 -->
          <div class="confirm-icon" :class="type">
            <svg v-if="type === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <!-- 内容区域 -->
          <h3 class="confirm-title">{{ title }}</h3>
          <p class="confirm-message">{{ message }}</p>

          <!-- 操作按钮 -->
          <div class="confirm-actions">
            <button class="btn btn-cancel" @click="handleCancel">
              {{ cancelText }}
            </button>
            <button 
              class="btn btn-confirm" 
              :class="type"
              @click="handleConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: 320px;
  max-width: 90vw;
  background: #fff;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  text-align: center;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.confirm-dialog.animating {
  transform: scale(0.95);
  opacity: 0.7;
}

.confirm-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.confirm-icon.confirm {
  background: linear-gradient(135deg, #E5F4FF 0%, #D5EAFF 100%);
  color: #3B82F6;
}

.confirm-icon.warning {
  background: linear-gradient(135deg, #FFF4E5 0%, #FFEED5 100%);
  color: #F59E0B;
}

.confirm-icon.danger {
  background: linear-gradient(135deg, #FFE5E5 0%, #FFDBDB 100%);
  color: #EF4444;
}

.confirm-icon svg {
  width: 28px;
  height: 28px;
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 8px;
}

.confirm-message {
  font-size: 14px;
  color: #6B7280;
  margin: 0 0 20px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #F3F4F6;
  color: #6B7280;
}

.btn-cancel:hover {
  background: #E5E7EB;
}

.btn-confirm {
  background: linear-gradient(135deg, #F4A261 0%, #E76F51 100%);
  color: #fff;
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 162, 97, 0.3);
}

.btn-confirm.warning {
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
}

.btn-confirm.danger {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
}

/* 动画 */
.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.25s ease;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-active .confirm-dialog,
.confirm-leave-active .confirm-dialog {
  transition: transform 0.25s ease;
}

.confirm-enter-from .confirm-dialog {
  transform: scale(0.9);
}

.confirm-leave-to .confirm-dialog {
  transform: scale(0.9);
}
</style>
