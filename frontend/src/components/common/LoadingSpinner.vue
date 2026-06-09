<script setup lang="ts">
interface Props {
  size?: 'small' | 'medium' | 'large'
  text?: string
  fullscreen?: boolean
  overlay?: boolean
  showMascot?: boolean
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  text: '',
  fullscreen: false,
  overlay: false,
  showMascot: false,
  message: '哈吉咪正在努力加载中...'
})
</script>

<template>
  <div :class="['loading-spinner', `size-${size}`, { fullscreen, overlay }]">
    <div class="spinner-container">
      <div class="spinner-ring"></div>
      <div class="spinner-ring-inner"></div>
      <p v-if="text" class="spinner-text">{{ text }}</p>
    </div>
    <div v-if="fullscreen && showMascot" class="mascot-container">
      <div class="mascot-animation">
        <div class="mascot-face">
          <div class="eye left"></div>
          <div class="eye right"></div>
          <div class="nose"></div>
          <div class="mouth"></div>
        </div>
      </div>
      <p class="loading-message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px; /* 新增：为 Flexbox 提供垂直空间 */
  flex-direction: column;
}

.loading-spinner.fullscreen {
  position: fixed;
  inset: 0;
  background: var(--color-bg-page);
  z-index: 9999;
  flex-direction: column;
  gap: var(--space-xl);
  min-height: 100vh; /* 新增：覆盖基础值，占满视口高度 */
}

.loading-spinner.overlay {
  position: absolute;
  inset: 0;
  background: rgba(249, 248, 246, 0.8);
  z-index: 100;
  min-height: 100%; /* 新增：继承父容器高度 */
}

.spinner-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

/* Spinner rings */
.spinner-ring {
  border: 3px solid var(--color-primary-soft);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-ring-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid transparent;
  border-bottom-color: var(--color-secondary);
  border-radius: 50%;
  animation: spin-reverse 0.6s linear infinite;
}

/* 尺寸变体 */
.size-small .spinner-ring {
  width: 24px;
  height: 24px;
}

.size-small .spinner-ring-inner {
  width: 12px;
  height: 12px;
}

.size-medium .spinner-ring {
  width: 40px;
  height: 40px;
}

.size-medium .spinner-ring-inner {
  width: 20px;
  height: 20px;
}

.size-large .spinner-ring {
  width: 56px;
  height: 56px;
  border-width: 4px;
}

.size-large .spinner-ring-inner {
  width: 28px;
  height: 28px;
  border-width: 3px;
}

/* 动画 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin-reverse {
  to {
    transform: translate(-50%, -50%) rotate(-360deg);
  }
}

/* 文本样式 */
.spinner-text {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-align: center;
  margin: var(--space-sm) 0 0 0;
}

.size-small .spinner-text {
  font-size: var(--text-xs);
}

.size-large .spinner-text {
  font-size: var(--text-base);
}

/* 吉祥物动画 */
.mascot-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  animation: float 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.mascot-animation {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #FFB366, #FF8A4C);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(255, 138, 76, 0.3);
}

.mascot-face {
  position: relative;
  width: 80px;
  height: 60px;
}

.mascot-face .eye {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--color-text-main);
  border-radius: 50%;
  top: 15px;
  animation: blink 3s ease-in-out infinite;
}

.mascot-face .eye.left {
  left: 15px;
}

.mascot-face .eye.right {
  right: 15px;
  animation-delay: 0.1s;
}

.mascot-face .nose {
  position: absolute;
  width: 8px;
  height: 6px;
  background: #FFB366;
  border-radius: 50%;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
}

.mascot-face .mouth {
  position: absolute;
  width: 20px;
  height: 10px;
  border: 2px solid var(--color-text-main);
  border-top: none;
  border-radius: 0 0 20px 20px;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  animation: smile 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 90%, 100% {
    transform: scaleY(1);
  }
  95% {
    transform: scaleY(0.1);
  }
}

@keyframes smile {
  0%, 100% {
    width: 20px;
  }
  50% {
    width: 24px;
  }
}

.loading-message {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  text-align: center;
  max-width: 300px;
  margin: 0;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .loading-spinner {
    min-height: 150px; /* 移动端减小高度 */
  }

  .mascot-animation {
    width: 100px;
    height: 100px;
  }

  .mascot-face {
    width: 70px;
    height: 50px;
  }

  .mascot-face .eye {
    width: 10px;
    height: 10px;
    top: 12px;
  }

  .mascot-face .eye.left {
    left: 12px;
  }

  .mascot-face .eye.right {
    right: 12px;
  }

  .loading-message {
    font-size: var(--text-sm);
    max-width: 250px;
  }
}
</style>
