<template>
  <div class="error-handler" :class="[`error-${type}`, { fullscreen }]">
    <div class="error-content">
      <!-- 错误图标 -->
      <div class="error-icon">
        <span v-if="type === 'network'">🌐</span>
        <span v-else-if="type === 'server'">🖥️</span>
        <span v-else-if="type === 'auth'">🔐</span>
        <span v-else-if="type === 'notFound'">🔍</span>
        <span v-else>⚠️</span>
      </div>

      <!-- 错误信息 -->
      <div class="error-info">
        <h3 class="error-title">{{ title }}</h3>
        <p class="error-message">{{ message }}</p>
        <p v-if="detail" class="error-detail">{{ detail }}</p>
      </div>

      <!-- 操作按钮 -->
      <div class="error-actions">
        <button
          v-if="showRetry"
          @click="handleRetry"
          class="btn-retry"
          :disabled="isRetrying"
        >
          <span v-if="isRetrying">重试中...</span>
          <span v-else>🔄 重试</span>
        </button>
        <button
          v-if="showReload"
          @click="handleReload"
          class="btn-reload"
        >
          🔄 刷新页面
        </button>
        <button
          v-if="showBack"
          @click="handleBack"
          class="btn-back"
        >
          ← 返回
        </button>
        <button
          v-if="showHome"
          @click="handleHome"
          class="btn-home"
        >
          🏠 回到首页
        </button>
      </div>

      <!-- 错误ID -->
      <div v-if="errorId" class="error-meta">
        错误代码: {{ errorId }}
      </div>
    </div>

    <!-- 吉祥物安慰图 -->
    <div v-if="showMascot" class="error-mascot">
      <div class="mascot-sad">
        <div class="mascot-face">
          <div class="eye left closed"></div>
          <div class="eye right closed"></div>
          <div class="nose"></div>
          <div class="mouth sad"></div>
          <div class="tear left"></div>
          <div class="tear right"></div>
        </div>
      </div>
      <p class="mascot-message">{{ mascotMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

interface Props {
  type?: 'network' | 'server' | 'auth' | 'notFound' | 'unknown'
  title?: string
  message?: string
  detail?: string
  errorId?: string
  showRetry?: boolean
  showReload?: boolean
  showBack?: boolean
  showHome?: boolean
  fullscreen?: boolean
  showMascot?: boolean
  onRetry?: () => Promise<void> | void
}

const props = withDefaults(defineProps<Props>(), {
  type: 'unknown',
  title: '出错了',
  message: '遇到一些问题，请稍后再试',
  detail: '',
  showRetry: true,
  showReload: false,
  showBack: false,
  showHome: true,
  fullscreen: true,
  showMascot: true
})

const emit = defineEmits<{
  retry: []
  back: []
  reload: []
}>()

const router = useRouter()
const isRetrying = ref(false)

// 吉祥物安慰语
const mascotMessage = computed(() => {
  switch (props.type) {
    case 'network':
      return '网络连接好像断了，检查一下网络吧~'
    case 'server':
      return '服务器正在休息，请稍后再来~'
    case 'auth':
      return '登录状态好像过期了，重新登录试试~'
    case 'notFound':
      return '找不到你要的页面，去别的地方看看吧~'
    default:
      return '出错了，别灰心，再试一次吧~'
  }
})

// 处理重试
async function handleRetry() {
  isRetrying.value = true
  try {
    if (props.onRetry) {
      await props.onRetry()
    }
    emit('retry')
  } catch (error) {
    console.error('[ErrorHandler] Retry failed:', error)
  } finally {
    isRetrying.value = false
  }
}

// 处理刷新
function handleReload() {
  emit('reload')
  window.location.reload()
}

// 处理返回
function handleBack() {
  emit('back')
  router.back()
}

// 处理回到首页
function handleHome() {
  router.push('/')
}

// 暴露方法
defineExpose({
  retry: handleRetry,
  isRetrying: () => isRetrying.value
})
</script>

<style scoped>
.error-handler {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: var(--space-xl);
  gap: var(--space-2xl);
}

.error-handler.fullscreen {
  position: fixed;
  inset: 0;
  background: var(--color-bg-page);
  z-index: 9998;
  min-height: 100vh;
}

.error-content {
  max-width: 500px;
  width: 100%;
  text-align: center;
}

.error-icon {
  font-size: 64px;
  margin-bottom: var(--space-xl);
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.error-info {
  margin-bottom: var(--space-xl);
}

.error-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-main);
  margin: 0 0 var(--space-md) 0;
}

.error-message {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-sm) 0;
}

.error-detail {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-sm) 0 0 0;
  font-family: monospace;
  background: var(--color-bg-soft);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  word-break: break-all;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  align-items: center;
}

.error-actions button {
  min-width: 160px;
  padding: var(--space-md) var(--space-xl);
  border: none;
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-retry {
  background: var(--color-primary);
  color: var(--color-text-white);
  box-shadow: var(--shadow-warm-sm);
}

.btn-retry:hover:not(:disabled) {
  background: var(--color-primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-warm-md);
}

.btn-retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-reload,
.btn-back,
.btn-home {
  background: var(--color-bg-soft);
  color: var(--color-text-main);
}

.btn-reload:hover,
.btn-back:hover,
.btn-home:hover {
  background: var(--color-bg-subtle);
  transform: translateY(-1px);
}

.error-meta {
  margin-top: var(--space-lg);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-family: monospace;
}

/* 吉祥物样式 */
.error-mascot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mascot-sad {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #E8A87C, #C38D6B);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(199, 141, 107, 0.3);
  position: relative;
}

.mascot-face {
  position: relative;
  width: 60px;
  height: 50px;
}

.mascot-face .eye {
  position: absolute;
  width: 10px;
  height: 2px;
  background: var(--color-text-main);
  border-radius: 2px;
  top: 15px;
}

.mascot-face .eye.closed {
  width: 12px;
  height: 2px;
}

.mascot-face .eye.left {
  left: 10px;
  transform: rotate(-5deg);
}

.mascot-face .eye.right {
  right: 10px;
  transform: rotate(5deg);
}

.mascot-face .nose {
  position: absolute;
  width: 6px;
  height: 5px;
  background: #E8A87C;
  border-radius: 50%;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
}

.mascot-face .mouth.sad {
  width: 16px;
  height: 8px;
  border: 2px solid var(--color-text-main);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
}

.mascot-face .tear {
  position: absolute;
  width: 4px;
  height: 8px;
  background: #87CEEB;
  border-radius: 50%;
  top: 20px;
  animation: tear-fall 2s ease-in infinite;
}

.mascot-face .tear.left {
  left: 8px;
  animation-delay: 0s;
}

.mascot-face .tear.right {
  right: 8px;
  animation-delay: 1s;
}

@keyframes tear-fall {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(20px);
    opacity: 0;
  }
}

.mascot-message {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 280px;
  margin: 0;
  line-height: var(--leading-relaxed);
}

/* 错误类型样式 */
.error-network .error-icon {
  animation: shake 0.5s ease-in-out;
}

.error-server .error-icon {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .error-handler {
    padding: var(--space-lg);
    min-height: 300px;
  }

  .error-icon {
    font-size: 48px;
  }

  .error-title {
    font-size: var(--text-xl);
  }

  .error-message {
    font-size: var(--text-base);
  }

  .error-actions {
    gap: var(--space-sm);
  }

  .error-actions button {
    min-width: 140px;
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--text-sm);
  }

  .mascot-sad {
    width: 80px;
    height: 80px;
  }

  .mascot-face {
    width: 50px;
    height: 40px;
  }
}
</style>
